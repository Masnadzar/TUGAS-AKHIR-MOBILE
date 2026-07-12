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

// Date object -> "DD-MM-YYYY"
export function formatDDMMYYYY(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function awalTahunIni() {
  const d = new Date();
  d.setMonth(0, 1); // 1 Januari
  d.setHours(0, 0, 0, 0);
  return d;
}

// Masa maksimal antara tanggal wafat dan tanggal pemakaman.
export const MAKS_HARI_PEMAKAMAN_SETELAH_WAFAT = 2;

// ── Batas kalender (dipakai oleh komponen DatePickerField) ──────────

// Tanggal lahir: bebas, hanya dibatasi tidak boleh di masa depan.
export function batasKalenderTglLahir() {
  return {minimumDate: undefined, maximumDate: startOfToday()};
}

// Tanggal wafat: hanya boleh di tahun berjalan (1 Jan tahun ini s/d hari ini).
export function batasKalenderTglWafat() {
  return {minimumDate: awalTahunIni(), maximumDate: startOfToday()};
}

export function batasKalenderBurialDate(tglWafatStr) {
  const wafat = parseDDMMYYYY(tglWafatStr);
  if (!wafat) {
    return {minimumDate: awalTahunIni(), maximumDate: startOfToday()};
  }
  const maksimal = new Date(wafat);
  maksimal.setDate(maksimal.getDate() + MAKS_HARI_PEMAKAMAN_SETELAH_WAFAT);
  return {minimumDate: wafat, maximumDate: maksimal};
}

// ── Validasi (dipakai saat submit, jaga-jaga kalau input tidak lewat kalender) ──

// Tanggal lahir: harus tanggal valid & tidak boleh di masa depan
export function validateTglLahir(str) {
  const date = parseDDMMYYYY(str);
  if (!date)
    return 'Format tanggal tidak valid (DD-MM-YYYY), contoh: 10-05-1990';
  if (date > startOfToday()) return 'Tanggal lahir tidak boleh di masa depan';
  return null;
}

// Tanggal wafat: harus tanggal valid, tidak boleh di masa depan,
// dan harus berada di tahun berjalan (tahun ini saja).
export function validateTglWafat(str) {
  const date = parseDDMMYYYY(str);
  if (!date)
    return 'Format tanggal wafat tidak valid (DD-MM-YYYY), contoh: 05-12-2025';
  if (date > startOfToday())
    return 'Tanggal wafat tidak boleh di masa depan (belum terjadi)';
  if (date < awalTahunIni())
    return `Tanggal wafat hanya boleh di tahun ${new Date().getFullYear()}`;
  return null;
}

// maksimal 2 hari setelah tanggal wafat.
export function validateBurialDate(str, tglWafatStr) {
  const date = parseDDMMYYYY(str);
  if (!date)
    return 'Format tanggal pemakaman tidak valid (DD-MM-YYYY), contoh: 06-12-2025';

  const wafat = parseDDMMYYYY(tglWafatStr);
  if (wafat) {
    if (date < wafat)
      return 'Tanggal pemakaman tidak boleh sebelum tanggal wafat';
    const maxGap = MAKS_HARI_PEMAKAMAN_SETELAH_WAFAT * 24 * 60 * 60 * 1000;
    if (date - wafat > maxGap) {
      return `Tanggal pemakaman maksimal ${MAKS_HARI_PEMAKAMAN_SETELAH_WAFAT} hari setelah tanggal wafat`;
    }
  }
  return null;
}
