require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { getPool } = require("./db");

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function validateStudent(body, includeCode) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Data siswa tidak valid." };
  }

  const fields = includeCode
    ? ["kode_siswa", "nama_siswa", "alamat_siswa", "tgl_siswa", "jurusan_siswa"]
    : ["nama_siswa", "alamat_siswa", "tgl_siswa", "jurusan_siswa"];
  const student = {};

  for (const field of fields) {
    const value = body[field];
    if (typeof value !== "string" || value.trim() === "") {
      return { error: `${field} wajib diisi.` };
    }
    student[field] = value.trim();
  }

  if (student.kode_siswa && student.kode_siswa.length > 30) {
    return { error: "Kode siswa maksimal 30 karakter." };
  }
  if (student.nama_siswa && student.nama_siswa.length > 120) {
    return { error: "Nama siswa maksimal 120 karakter." };
  }
  if (student.jurusan_siswa && student.jurusan_siswa.length > 120) {
    return { error: "Jurusan siswa maksimal 120 karakter." };
  }

  if (student.tgl_siswa) {
    const date = new Date(`${student.tgl_siswa}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(student.tgl_siswa) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== student.tgl_siswa
    ) {
      return { error: "Tanggal siswa harus menggunakan format YYYY-MM-DD." };
    }
  }

  return { student };
}

app.get("/", (_req, res) => {
  res.json({ message: "Backend data siswa berjalan" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get(
  "/api/db/health",
  asyncHandler(async (_req, res) => {
    try {
      const pool = getPool();
      const connection = await pool.getConnection();
      try {
        await connection.ping();
      } finally {
        connection.release();
      }
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      console.error("Database health check failed:", error.message);
      res.status(503).json({
        status: "error",
        database: "disconnected",
        message: error.message,
      });
    }
  })
);

app.get(
  "/api/siswa",
  asyncHandler(async (_req, res) => {
    const [students] = await getPool().execute(
      "SELECT kode_siswa, nama_siswa, alamat_siswa, tgl_siswa, jurusan_siswa FROM siswa ORDER BY kode_siswa"
    );
    res.json(students);
  })
);

app.get(
  "/api/siswa/:kode",
  asyncHandler(async (req, res) => {
    const [students] = await getPool().execute(
      "SELECT kode_siswa, nama_siswa, alamat_siswa, tgl_siswa, jurusan_siswa FROM siswa WHERE kode_siswa = ?",
      [req.params.kode]
    );
    if (students.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }
    res.json(students[0]);
  })
);

app.post(
  "/api/siswa",
  asyncHandler(async (req, res) => {
    const { student, error } = validateStudent(req.body, true);
    if (error) {
      return res.status(400).json({ message: error });
    }

    await getPool().execute(
      "INSERT INTO siswa (kode_siswa, nama_siswa, alamat_siswa, tgl_siswa, jurusan_siswa) VALUES (?, ?, ?, ?, ?)",
      [
        student.kode_siswa,
        student.nama_siswa,
        student.alamat_siswa,
        student.tgl_siswa,
        student.jurusan_siswa,
      ]
    );
    res
      .status(201)
      .json({ message: "Data siswa berhasil ditambahkan.", ...student });
  })
);

app.put(
  "/api/siswa/:kode",
  asyncHandler(async (req, res) => {
    const { student, error } = validateStudent(req.body, false);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const [result] = await getPool().execute(
      "UPDATE siswa SET nama_siswa = ?, alamat_siswa = ?, tgl_siswa = ?, jurusan_siswa = ? WHERE kode_siswa = ?",
      [
        student.nama_siswa,
        student.alamat_siswa,
        student.tgl_siswa,
        student.jurusan_siswa,
        req.params.kode,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await getPool().execute(
        "SELECT kode_siswa FROM siswa WHERE kode_siswa = ?",
        [req.params.kode]
      );
      if (existing.length === 0) {
        return res.status(404).json({ message: "Data siswa tidak ditemukan." });
      }
    }

    res.json({
      message: "Data siswa berhasil diperbarui.",
      kode_siswa: req.params.kode,
      ...student,
    });
  })
);

app.delete(
  "/api/siswa/:kode",
  asyncHandler(async (req, res) => {
    const [result] = await getPool().execute(
      "DELETE FROM siswa WHERE kode_siswa = ?",
      [req.params.kode]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }
    res.json({ message: "Data siswa berhasil dihapus." });
  })
);

app.use((error, _req, res, _next) => {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "Kode siswa sudah digunakan." });
  }
  console.error("API request failed:", error.message);
  res.status(500).json({ message: "Terjadi kesalahan pada server." });
});

app.listen(port, () => {
  console.log(`Backend berjalan di http://localhost:${port}`);
});
