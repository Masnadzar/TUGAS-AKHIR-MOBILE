// src/components/DatePickerField.js
// Komponen input tanggal berbasis KALENDER — VERSI JS MURNI, TANPA LIBRARY
// NATIVE. Tidak butuh @react-native-community/datetimepicker (yang sempat
// bermasalah karena native module gagal ter-link). Ini cukup dengan
// View/Text/Modal/TouchableOpacity bawaan React Native, jadi tidak perlu
// rebuild native apa pun -- cukup reload seperti biasa.
//
// Props (SAMA seperti versi sebelumnya, tidak perlu ubah UserBurialForm.js
// atau TumpanganForm.js):
// - label: string
// - value: string "DD-MM-YYYY" atau ''
// - onChange: (dateString: string) => void
// - minimumDate?: Date
// - maximumDate?: Date
// - placeholder?: string
// - disabled?: boolean
import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {parseDDMMYYYY, formatDDMMYYYY} from '../utils/dateValidation';

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const NAMA_HARI = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Generate grid 7 kolom untuk satu bulan (termasuk sel kosong di awal/akhir)
function buildGridBulan(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Minggu
  const totalHari = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalHari; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = 'Ketuk untuk pilih tanggal',
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('hari'); // 'hari' | 'tahun'

  const tanggalAwal = parseDDMMYYYY(value) || maximumDate || new Date();
  const [viewYear, setViewYear] = useState(tanggalAwal.getFullYear());
  const [viewMonth, setViewMonth] = useState(tanggalAwal.getMonth());

  const buka = () => {
    if (disabled) return;
    const d = parseDDMMYYYY(value) || maximumDate || new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setMode('hari');
    setVisible(true);
  };

  const isDisabledDay = day => {
    if (day === null) return true;
    const d = startOfDay(new Date(viewYear, viewMonth, day));
    if (minimumDate && d < startOfDay(minimumDate)) return true;
    if (maximumDate && d > startOfDay(maximumDate)) return true;
    return false;
  };

  const pilihHari = day => {
    if (isDisabledDay(day)) return;
    const dipilih = new Date(viewYear, viewMonth, day);
    onChange(formatDDMMYYYY(dipilih));
    setVisible(false);
  };

  const gantiBulan = delta => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  // Batas navigasi bulan supaya tidak bisa geser ke bulan yang seluruhnya
  // di luar rentang minimumDate/maximumDate
  const bulanSebelumDiblokir = (() => {
    if (!minimumDate) return false;
    const akhirBulanSebelumnya = new Date(viewYear, viewMonth, 0);
    return akhirBulanSebelumnya < startOfDay(minimumDate);
  })();
  const bulanSesudahDiblokir = (() => {
    if (!maximumDate) return false;
    const awalBulanSesudahnya = new Date(viewYear, viewMonth + 1, 1);
    return awalBulanSesudahnya > startOfDay(maximumDate);
  })();

  // Daftar tahun yang bisa dipilih di mode 'tahun'
  const tahunMin = minimumDate ? minimumDate.getFullYear() : 1920;
  const tahunMax = maximumDate
    ? maximumDate.getFullYear()
    : new Date().getFullYear();
  const daftarTahun = [];
  for (let y = tahunMax; y >= tahunMin; y--) daftarTahun.push(y);

  const grid = buildGridBulan(viewYear, viewMonth);
  const hariIniStr = formatDDMMYYYY(new Date());

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={buka}
        activeOpacity={0.7}
        disabled={disabled}>
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color="#888" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            {mode === 'hari' ? (
              <>
                {/* Header navigasi bulan + tap judul untuk pilih tahun cepat */}
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    onPress={() => gantiBulan(-1)}
                    disabled={bulanSebelumDiblokir}
                    style={styles.navBtn}>
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={bulanSebelumDiblokir ? '#ccc' : '#1e90ff'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMode('tahun')}
                    style={{flex: 1}}>
                    <Text style={styles.headerJudul}>
                      {NAMA_BULAN[viewMonth]} {viewYear}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => gantiBulan(1)}
                    disabled={bulanSesudahDiblokir}
                    style={styles.navBtn}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={bulanSesudahDiblokir ? '#ccc' : '#1e90ff'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Baris nama hari */}
                <View style={styles.hariRow}>
                  {NAMA_HARI.map((h, i) => (
                    <Text key={i} style={styles.hariLabel}>
                      {h}
                    </Text>
                  ))}
                </View>

                {/* Grid tanggal */}
                <View style={styles.grid}>
                  {grid.map((day, idx) => {
                    const disabledDay = isDisabledDay(day);
                    const tglIni =
                      day !== null
                        ? formatDDMMYYYY(new Date(viewYear, viewMonth, day))
                        : null;
                    const terpilih = tglIni && tglIni === value;
                    const isHariIni = tglIni && tglIni === hariIniStr;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.dayCell,
                          terpilih && styles.dayCellTerpilih,
                        ]}
                        disabled={disabledDay}
                        onPress={() => pilihHari(day)}>
                        {day !== null && (
                          <Text
                            style={[
                              styles.dayText,
                              disabledDay && styles.dayTextDisabled,
                              terpilih && styles.dayTextTerpilih,
                              isHariIni && !terpilih && styles.dayTextHariIni,
                            ]}>
                            {day}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              // ── Mode pilih tahun cepat ──
              <>
                <Text style={styles.headerJudul}>Pilih Tahun</Text>
                <FlatList
                  data={daftarTahun}
                  keyExtractor={y => String(y)}
                  numColumns={4}
                  style={{maxHeight: 320, marginTop: 10}}
                  renderItem={({item: y}) => (
                    <TouchableOpacity
                      style={[
                        styles.tahunCell,
                        y === viewYear && styles.tahunCellTerpilih,
                      ]}
                      onPress={() => {
                        setViewYear(y);
                        setMode('hari');
                      }}>
                      <Text
                        style={[
                          styles.tahunText,
                          y === viewYear && styles.tahunTextTerpilih,
                        ]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            <TouchableOpacity
              style={styles.tutupBtn}
              onPress={() => setVisible(false)}>
              <Text style={styles.tutupBtnTxt}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {marginTop: 10, marginBottom: 4, color: '#555', fontSize: 13},
  input: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputDisabled: {backgroundColor: '#eee'},
  inputText: {fontSize: 14, color: '#303030'},
  placeholderText: {color: '#a3a9b7'},

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '88%',
    maxWidth: 360,
  },
  headerRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  navBtn: {padding: 6},
  headerJudul: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#303030',
  },
  hariRow: {flexDirection: 'row', marginBottom: 4},
  hariLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellTerpilih: {backgroundColor: '#1e90ff'},
  dayText: {fontSize: 13, color: '#303030'},
  dayTextDisabled: {color: '#ddd'},
  dayTextTerpilih: {color: '#fff', fontWeight: 'bold'},
  dayTextHariIni: {color: '#1e90ff', fontWeight: 'bold'},

  tahunCell: {
    flex: 1,
    margin: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  tahunCellTerpilih: {backgroundColor: '#1e90ff'},
  tahunText: {fontSize: 13, color: '#303030'},
  tahunTextTerpilih: {color: '#fff', fontWeight: 'bold'},

  tutupBtn: {marginTop: 14, alignItems: 'center', paddingVertical: 10},
  tutupBtnTxt: {color: '#888', fontWeight: '600', fontSize: 13},
});
