CREATE DATABASE IF NOT EXISTS data_siswa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE data_siswa;

CREATE TABLE IF NOT EXISTS siswa (
  kode_siswa VARCHAR(30) NOT NULL,
  nama_siswa VARCHAR(120) NOT NULL,
  alamat_siswa TEXT NOT NULL,
  tgl_siswa DATE NOT NULL,
  jurusan_siswa VARCHAR(120) NOT NULL,
  PRIMARY KEY (kode_siswa)
);
