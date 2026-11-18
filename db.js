const mysql = require("mysql2/promise");

let pool;

function getPool() {
  if (pool) {
    return pool;
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const missingConfig = ["DB_HOST", "DB_USER", "DB_NAME"].filter(
    (key) => !process.env[key]
  );

  if (missingConfig.length > 0) {
    throw new Error(
      `Konfigurasi database belum lengkap: ${missingConfig.join(", ")}. Isi file .env.`
    );
  }

  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD || "",
    database: DB_NAME,
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

module.exports = { getPool };