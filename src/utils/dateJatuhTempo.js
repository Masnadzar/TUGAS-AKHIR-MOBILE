// src/utils/dateJatuhTempo.js
// Helper menghitung tanggal jatuh tempo sewa makam, dihitung dari tanggal
// pemakaman (burialDate) ditambah masa sewa standar TPU.
import {parseDDMMYYYY} from './dateValidation';

// Masa sewa standar: 3 tahun. Ubah angka ini kalau kebijakan TPU berbeda.
export const MASA_SEWA_TAHUN = 3;

// Format Date -> "DD-MM-YYYY"
const formatDDMMYYYY = date => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Hitung jatuh tempo dari tanggal pemakaman (string "DD-MM-YYYY").
// Setiap kali diperpanjang, jatuh tempo baru dihitung dari HARI INI
// (tanggal pengajuan perpanjangan), bukan dari tanggal pemakaman asal,
// supaya masa sewa baru benar-benar dimulai dari saat diperpanjang.
export function hitungJatuhTempoDariHariIni() {
  const now = new Date();
  now.setFullYear(now.getFullYear() + MASA_SEWA_TAHUN);
  return formatDDMMYYYY(now);
}

// Hitung jatuh tempo awal dari tanggal pemakaman pertama kali (dipakai untuk
// menampilkan kapan makam baru akan jatuh tempo pertama kalinya).
export function hitungJatuhTempoDariPemakaman(burialDateStr) {
  const date = parseDDMMYYYY(burialDateStr);
  if (!date) return null;
  date.setFullYear(date.getFullYear() + MASA_SEWA_TAHUN);
  return formatDDMMYYYY(date);
}
