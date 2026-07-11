// src/utils/dateValidation.js
// Helper validasi tanggal DD-MM-YYYY yang dipakai di semua form pemakaman.
// Poin 5: tanggal wafat & tanggal pemakaman tidak boleh "tidak jelas"
// (misalnya 31-02-2025, tanggal di masa depan yang belum terjadi, dsb).

export const DATE_REGEX = /^\d{2}-\d{2}-\d{4}$/;

// DD-MM-YYYY -> Date object (null jika tidak valid / tanggal tidak ada, cth 31-02)
export function parseDDMMYYYY(str) {
  if (!DATE_REGEX.test(str)) return null;
  const [dd, mm, yyyy] = str.split('-').map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  const valid =
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd;
  return valid ? date : null;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Tanggal lahir: harus tanggal valid & tidak boleh di masa depan
export function validateTglLahir(str) {
  const date = parseDDMMYYYY(str);
  if (!date)
    return 'Format tanggal tidak valid (DD-MM-YYYY), contoh: 10-05-1990';
  if (date > startOfToday()) return 'Tanggal lahir tidak boleh di masa depan';
  return null;
}

// Tanggal wafat: harus tanggal valid & tidak boleh di masa depan
export function validateTglWafat(str) {
  const date = parseDDMMYYYY(str);
  if (!date)
    return 'Format tanggal wafat tidak valid (DD-MM-YYYY), contoh: 05-12-2025';
  if (date > startOfToday())
    return 'Tanggal wafat tidak boleh di masa depan (belum terjadi)';
  return null;
}

// Tanggal pemakaman: harus tanggal valid, >= tanggal wafat,
// dan tidak lebih dari 14 hari setelah wafat (menghindari tanggal ngasal/tidak jelas)
export function validateBurialDate(str, tglWafatStr) {
  const date = parseDDMMYYYY(str);
  if (!date)
    return 'Format tanggal pemakaman tidak valid (DD-MM-YYYY), contoh: 06-12-2025';

  const wafat = parseDDMMYYYY(tglWafatStr);
  if (wafat) {
    if (date < wafat)
      return 'Tanggal pemakaman tidak boleh sebelum tanggal wafat';
    const maxGap = 14 * 24 * 60 * 60 * 1000;
    if (date - wafat > maxGap) {
      return 'Tanggal pemakaman terlalu jauh dari tanggal wafat (maks. 14 hari)';
    }
  }
  return null;
}
