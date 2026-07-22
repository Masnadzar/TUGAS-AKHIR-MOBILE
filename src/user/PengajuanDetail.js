// src/user/PengajuanDetail.js
// Halaman detail TUNGGAL untuk ketiga jenis permohonan: Makam Baru,
// Perpanjangan, dan Ijin Tumpang. BurialDetail.js sudah tidak dipakai lagi
// -- semua navigasi dari Home.js sekarang mengarah ke layar ini dengan
// params: { id, collection } di mana collection salah satu dari
// 'burials' | 'perpanjangan' | 'tumpangan'.
//
// Mendukung mode lihat (read-only) dan mode edit + hapus (CRUD lengkap),
// konsisten untuk ketiga jenis. Field yang ditampilkan/di-edit disesuaikan
// per jenis lewat KONFIG_JENIS karena struktur data masing-masing berbeda.
//
// Field HANYA bisa diedit/dihapus jika status === 'pending'. Jika sudah
// 'verified' atau 'rejected', form dikunci (read-only) agar tidak menimpa
// data yang sudah diverifikasi admin.
//
// BARU: setiap jenis permohonan sekarang juga menampilkan foto dokumen
// pendukung yang sudah diinput user (preview gambar + tombol buka), dan
// bisa diganti saat mode edit (upload otomatis ke Cloudinary, sama seperti
// alur di form pengajuan awal). Daftar dokumen per jenis diatur lewat
// KONFIG_JENIS[...].dokumen.
//
// UPDATE: mode edit untuk perpanjangan & tumpangan sekarang membolehkan
// semua field diedit (sama seperti burials/Makam Baru), termasuk field
// yang sebelumnya read-only (mis. blok makam, no. makam, tanggal-tanggal
// referensi).

import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary} from 'react-native-image-picker';
import DatePickerField from '../components/DatePickerField';
import {
  batasKalenderTglLahir,
  batasKalenderTglWafat,
  batasKalenderBurialDate,
} from '../utils/dateValidation';

// ── Palet warna, sama dengan Home.js ────────────────────────────────
const C = {
  bg: '#0b1120',
  hijau: '#00c853',
  biru: '#448aff',
  ungu: '#7c4dff',
  oranye: '#ff9100',
  merah: '#ff5252',
  putih: '#f5f5f5',
  abu: '#90a4ae',
  abuGelap: '#546e7a',
  garis: '#eceff1',
  teksUtama: '#1a2535',
};

// ── Cloudinary config (sama dengan UserBurialForm / BurialDetailScreen) ──
const CLOUD_NAME = 'dq59p6llb';
const UPLOAD_PRESET = 'burial_upload';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const uploadToCloudinary = async (fileObj, folder) => {
  if (!fileObj) return null;
  const formData = new FormData();
  formData.append('file', {
    uri: fileObj.uri,
    type: fileObj.type || 'image/jpeg',
    name: fileObj.name || 'upload.jpg',
  });
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `burial_documents/${folder}`);
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
    headers: {Accept: 'application/json'},
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).secure_url;
};

// ── Konfigurasi per jenis collection ─────────────────────────────────
// dokumen: daftar dokumen pendukung yang bisa diupload/dilihat fotonya.
// key = nama field URL di Firestore, folder = subfolder Cloudinary.
const KONFIG_JENIS = {
  burials: {
    label: 'Makam Baru',
    warna: C.hijau,
    icon: 'add-circle-outline',
    fields: [
      {key: 'deceasedName', label: 'Nama Jenazah', editable: true},
      {
        key: 'nikJenazah',
        label: 'NIK Jenazah',
        editable: true,
        keyboardType: 'numeric',
      },
      {key: 'binBinti', label: 'Bin/Binti', editable: true},
      {
        key: 'tglLahirJenazah',
        label: 'Tanggal Lahir Jenazah',
        editable: true,
        isDate: true,
      },
      {
        key: 'tglWafat',
        label: 'Tanggal Wafat',
        editable: true,
        isDate: true,
      },
      {
        key: 'burialDate',
        label: 'Tanggal Pemakaman',
        editable: true,
        isDate: true,
      },
      {key: 'heirName', label: 'Nama Ahli Waris', editable: true},
      {key: 'hubungan', label: 'Hubungan dengan Jenazah', editable: true},
      {
        key: 'noTelepon',
        label: 'No. Telepon Ahli Waris',
        editable: true,
        keyboardType: 'phone-pad',
      },
    ],
    dokumen: [
      {key: 'dokKTP', label: 'KTP Ahli Waris', folder: 'ktp'},
      {key: 'dokKK', label: 'KK Ahli Waris / Ahli Kubur', folder: 'kk'},
      {key: 'dokKTPJenazah', label: 'KTP Jenazah', folder: 'ktp_jenazah'},
      {key: 'dokKKJenazah', label: 'KK Jenazah', folder: 'kk_jenazah'},
      {
        key: 'dokSuratKematian',
        label: 'Surat Kematian',
        folder: 'surat_kematian',
      },
      {key: 'dokSuratMedis', label: 'Surat Medis', folder: 'surat_medis'},
    ],
  },
  perpanjangan: {
    label: 'Perpanjangan',
    warna: C.biru,
    icon: 'refresh-circle-outline',
    // field: { key, label, editable, keyboardType, multiline }
    // Catatan: field & dokumen di bawah disamakan persis dengan yang
    // disimpan oleh PerpanjanganForm.js (collection 'perpanjangan').
    // Semua field kini editable = true, konsisten dengan burials.
    fields: [
      {key: 'deceasedName', label: 'Nama Jenazah', editable: true},
      {
        key: 'tglLahirJenazah',
        label: 'Tanggal Lahir Jenazah',
        editable: true,
        isDate: true,
      },
      {
        key: 'tglWafat',
        label: 'Tanggal Wafat',
        editable: true,
        isDate: true,
      },
      {key: 'heirName', label: 'Nama Ahli Waris', editable: true},
      {key: 'hubungan', label: 'Hubungan dengan Jenazah', editable: true},
      {
        key: 'noTelepon',
        label: 'No. Telepon',
        editable: true,
        keyboardType: 'phone-pad',
      },
      // Blok & No. Makam TIDAK boleh diubah user -- selalu read-only,
      // baik di mode lihat maupun edit.
      {key: 'assignedBlock', label: 'Blok Makam', editable: false},
      {key: 'assignedGraveNumber', label: 'No. Makam', editable: false},
      {
        key: 'burialDateAsal',
        label: 'Tanggal Pemakaman Asal',
        editable: true,
        isDate: true,
      },
      {
        key: 'jatuhTempoLama',
        label: 'Jatuh Tempo Saat Ini',
        editable: true,
        isDate: true,
      },
      {
        key: 'jatuhTempoBaru',
        label: 'Jatuh Tempo Setelah Diperpanjang',
        editable: true,
        isDate: true,
      },
      {
        key: 'masaSewaTahun',
        label: 'Masa Sewa (tahun)',
        editable: true,
        keyboardType: 'numeric',
      },
      {
        key: 'notes',
        label: 'Catatan Tambahan',
        editable: true,
        multiline: true,
      },
    ],
    dokumen: [
      {key: 'dokIPTM', label: 'IPTM', folder: 'iptm_perpanjangan'},
      {key: 'dokKTPWaris', label: 'KTP Ahli Waris', folder: 'ktp_perpanjangan'},
      {
        key: 'dokKKWaris',
        label: 'Kartu Keluarga (KK)',
        folder: 'kk_perpanjangan',
      },
    ],
  },
  tumpangan: {
    label: 'Ijin Tumpang',
    warna: C.ungu,
    icon: 'people-circle-outline',
    // Catatan: field & dokumen di bawah disamakan persis dengan yang
    // disimpan oleh TumpanganForm.js (collection 'tumpangan').
    // Semua field kini editable = true, konsisten dengan burials.
    fields: [
      // ── Referensi makam lama ─────────────────────
      // Blok & No. Makam Lama TIDAK boleh diubah user -- selalu read-only,
      // baik di mode lihat maupun edit.
      {key: 'assignedBlockLama', label: 'Blok Makam Lama', editable: false},
      {
        key: 'assignedGraveNumberLama',
        label: 'No. Makam Lama',
        editable: false,
      },
      // ── Data jenazah baru yang akan tumpang ──────────────────
      {key: 'deceasedName', label: 'Nama Jenazah', editable: true},
      {
        key: 'nikJenazah',
        label: 'NIK Jenazah',
        editable: true,
        keyboardType: 'numeric',
      },
      {key: 'binBinti', label: 'Bin/Binti', editable: true},
      {key: 'agama', label: 'Agama', editable: true},
      {
        key: 'tglLahirJenazah',
        label: 'Tanggal Lahir Jenazah',
        editable: true,
        isDate: true,
      },
      {
        key: 'tglWafat',
        label: 'Tanggal Wafat',
        editable: true,
        isDate: true,
      },
      {
        key: 'burialDate',
        label: 'Tanggal Pemakaman',
        editable: true,
        isDate: true,
      },
      // ── Data ahli waris ───────────────────────────────────────
      {key: 'heirName', label: 'Nama Ahli Waris', editable: true},
      {
        key: 'nikAhliWaris',
        label: 'NIK Ahli Waris',
        editable: true,
        keyboardType: 'numeric',
      },
      {
        key: 'noTelepon',
        label: 'No. Telepon',
        editable: true,
        keyboardType: 'phone-pad',
      },
      {key: 'alamat', label: 'Alamat', editable: true, multiline: true},
      {
        key: 'notes',
        label: 'Catatan Tambahan',
        editable: true,
        multiline: true,
      },
    ],
    dokumen: [
      {key: 'dokKTP', label: 'KTP Ahli Waris', folder: 'ktp_tumpangan'},
      {
        key: 'dokKK',
        label: 'Kartu Keluarga (KK) Ahli Waris',
        folder: 'kk_tumpangan',
      },
      {
        key: 'dokKTPJenazah',
        label: 'KTP Jenazah',
        folder: 'ktp_jenazah_tumpangan',
      },
      {
        key: 'dokKKJenazah',
        label: 'KK Jenazah',
        folder: 'kk_jenazah_tumpangan',
      },
      {
        key: 'dokSuratKematian',
        label: 'Surat Kematian',
        folder: 'surat_kematian_tumpangan',
      },
      {
        key: 'dokSuratMedis',
        label: 'Surat Medis',
        folder: 'surat_medis_tumpangan',
      },
      {
        key: 'dokIPTMLama',
        label: 'IPTM Terdahulu',
        folder: 'iptm_tumpangan',
      },
    ],
  },
};

const formatTglLengkap = val => {
  if (!val) return '-';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(val);
  }
};

const warnaBadge = status => {
  switch (status) {
    case 'verified':
      return {bg: C.hijau, label: 'Diterima'};
    case 'rejected':
      return {bg: C.merah, label: 'Ditolak'};
    default:
      return {bg: C.oranye, label: 'Pending'};
  }
};

// ── Batas kalender per field tanggal, disamakan dengan aturan di form
// pengajuan awal (UserBurialForm / TumpanganForm). Field tanggal yang
// tidak punya aturan khusus (mis. milik Perpanjangan: tanggal pemakaman
// asal, jatuh tempo) dibiarkan tanpa batas min/max -- kalender tetap
// bisa dibuka bebas.
const getBatasKalender = (fieldKey, form) => {
  switch (fieldKey) {
    case 'tglLahirJenazah':
      return batasKalenderTglLahir();
    case 'tglWafat':
      return batasKalenderTglWafat();
    case 'burialDate':
      return batasKalenderBurialDate(form.tglWafat);
    default:
      return {};
  }
};

// ── Baris info read-only ──────────────────────────────────────────────
const InfoBaris = ({label, value}) => (
  <View style={styles.infoBaris}>
    <Text style={styles.infoBarisLabel}>{label}</Text>
    <Text style={styles.infoBarisValue}>
      {value === undefined || value === null || value === ''
        ? '-'
        : String(value)}
    </Text>
  </View>
);

// ── Baris input edit ───────────────────────────────────────────────────
const InputBaris = ({label, value, onChangeText, keyboardType, multiline}) => (
  <View style={styles.inputWrap}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || 'default'}
      multiline={!!multiline}
      placeholder={`Masukkan ${label.toLowerCase()}`}
      placeholderTextColor={C.abu}
    />
  </View>
);

// ================================================================
// MAIN SCREEN
// ================================================================
export default function PengajuanDetailScreen({route, navigation}) {
  const {id, collection} = route.params || {};
  const konfig = KONFIG_JENIS[collection];
  const daftarDokumen = konfig?.dokumen || [];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [data, setData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  // ── Dokumen baru (opsional saat edit): { dokKTP: {uri,name,type}, ... }
  const [newDocs, setNewDocs] = useState({});

  // ── Validasi params ──────────────────────────────────────────────
  useEffect(() => {
    if (!id || !collection || !konfig) {
      Alert.alert('Error', 'Data permohonan tidak valid.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    }
  }, [id, collection]);

  // ── Ambil data realtime ──────────────────────────────────────────
  useEffect(() => {
    if (!id || !collection || !konfig) return;

    const unsub = firestore()
      .collection(collection)
      .doc(id)
      .onSnapshot(
        snap => {
          if (!snap.exists) {
            setLoading(false);
            Alert.alert('Error', 'Data tidak ditemukan.', [
              {text: 'OK', onPress: () => navigation.goBack()},
            ]);
            return;
          }
          const d = {id: snap.id, ...snap.data()};
          setData(d);
          // Isi form hanya saat pertama kali load atau saat bukan sedang edit,
          // supaya perubahan realtime tidak menimpa input yang sedang diketik user.
          setForm(prev => (editMode ? prev : buildFormFromData(d, konfig)));
          setLoading(false);
        },
        err => {
          console.log('[PengajuanDetail] snapshot err', err);
          setLoading(false);
          Alert.alert('Error', 'Gagal memuat data.');
        },
      );

    return () => unsub();
  }, [id, collection]);

  const buildFormFromData = (d, k) => {
    const f = {};
    k.fields.forEach(fld => {
      f[fld.key] =
        d[fld.key] !== undefined && d[fld.key] !== null
          ? String(d[fld.key])
          : '';
    });
    return f;
  };

  const handleMulaiEdit = () => {
    if (data?.status !== 'pending') {
      Alert.alert(
        'Tidak Bisa Diedit',
        'Data yang sudah diverifikasi atau ditolak tidak dapat diubah lagi.',
      );
      return;
    }
    setForm(buildFormFromData(data, konfig));
    setNewDocs({});
    setEditMode(true);
  };

  const handleBatalEdit = () => {
    setForm(buildFormFromData(data, konfig));
    setNewDocs({});
    setEditMode(false);
  };

  const handleChangeField = (key, val) => {
    setForm(prev => ({...prev, [key]: val}));
  };

  // ── Pilih foto dokumen ──────────────────────────────────────────
  const pickDoc = docKey => {
    launchImageLibrary(
      {mediaType: 'photo', includeBase64: false, quality: 0.8},
      res => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage);
          return;
        }
        const asset = res.assets?.[0];
        if (asset)
          setNewDocs(prev => ({
            ...prev,
            [docKey]: {
              uri: asset.uri,
              name: asset.fileName || 'upload.jpg',
              type: asset.type || 'image/jpeg',
            },
          }));
      },
    );
  };

  // ── Buka dokumen di browser ─────────────────────────────────────
  const bukaDoc = async (url, nama) => {
    if (!url) {
      Alert.alert('Info', `Dokumen ${nama} tidak diunggah.`);
      return;
    }
    const bisa = await Linking.canOpenURL(url);
    if (bisa) Linking.openURL(url);
    else Alert.alert('Error', 'Tidak bisa membuka URL dokumen.');
  };

  const handleSimpan = async () => {
    // Validasi sederhana: field wajib (editable, bukan notes) tidak boleh kosong
    const kosong = konfig.fields.find(
      f => f.editable && f.key !== 'notes' && !form[f.key]?.trim(),
    );
    if (kosong) {
      Alert.alert('Lengkapi Data', `${kosong.label} tidak boleh kosong.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {};
      konfig.fields.forEach(f => {
        if (f.editable) payload[f.key] = form[f.key]?.trim() ?? '';
      });

      // Upload dokumen baru kalau ada yang diganti, sisanya pakai URL lama
      if (daftarDokumen.length > 0) {
        const uploadedEntries = await Promise.all(
          daftarDokumen.map(async ({key, folder}) => {
            if (newDocs[key]) {
              const url = await uploadToCloudinary(newDocs[key], folder);
              return [key, url];
            }
            return [key, data[key] || null];
          }),
        );
        Object.assign(payload, Object.fromEntries(uploadedEntries));
      }

      payload.updatedAt = firestore.FieldValue.serverTimestamp();

      console.log('[PengajuanDetail] update path:', collection, id);
      console.log('[PengajuanDetail] update payload:', payload);

      await firestore().collection(collection).doc(id).update(payload);

      setSaving(false);
      setEditMode(false);
      setNewDocs({});
      Alert.alert('Berhasil', 'Perubahan data berhasil disimpan.');
    } catch (err) {
      console.log('[PengajuanDetail] save err', err.code, err.message, err);
      setSaving(false);
      Alert.alert(
        'Gagal Menyimpan',
        `${err.code || 'unknown'}: ${
          err.message || 'Terjadi kesalahan tidak diketahui.'
        }`,
      );
    }
  };

  const handleHapus = () => {
    if (data?.status !== 'pending') {
      Alert.alert(
        'Tidak Bisa Dihapus',
        'Data yang sudah diverifikasi atau ditolak tidak dapat dihapus lagi.',
      );
      return;
    }

    Alert.alert(
      'Hapus Permohonan',
      `Yakin ingin menghapus permohonan ${konfig.label.toLowerCase()} ini? Tindakan ini tidak dapat dibatalkan.`,
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await firestore().collection(collection).doc(id).delete();
              setDeleting(false);
              navigation.goBack();
            } catch (err) {
              console.log(
                '[PengajuanDetail] delete err',
                err.code,
                err.message,
                err,
              );
              setDeleting(false);
              Alert.alert(
                'Gagal Menghapus',
                `${err.code || 'unknown'}: ${
                  err.message || 'Terjadi kesalahan tidak diketahui.'
                }`,
              );
            }
          },
        },
      ],
    );
  };

  if (!konfig) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        <View style={styles.pusatLayar}>
          <ActivityIndicator size="large" color={konfig.warna} />
          <Text style={styles.loadingTeks}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const badge = warnaBadge(data.status);
  const bisaEdit = data.status === 'pending';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />

      {/* ── HEADER ── */}
      <View style={[styles.header, {backgroundColor: C.bg}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.putih} />
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <Text style={styles.headerJudul}>Detail {konfig.label}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {data.deceasedName || data.heirName || '(tanpa nama)'}
          </Text>
        </View>
        {!editMode && bisaEdit && (
          <View style={{flexDirection: 'row', gap: 8}}>
            <TouchableOpacity
              onPress={handleMulaiEdit}
              style={styles.editIconBtn}>
              <Ionicons name="create-outline" size={20} color={C.putih} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleHapus}
              style={styles.editIconBtn}
              disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="trash-outline" size={20} color={C.merah} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{padding: 14, paddingBottom: 40}}
          showsVerticalScrollIndicator={false}>
          {/* ── STATUS ── */}
          <View style={styles.statusCard}>
            <View style={styles.statusBaris}>
              <View
                style={[
                  styles.iconWrap,
                  {backgroundColor: konfig.warna + '18'},
                ]}>
                <Ionicons name={konfig.icon} size={24} color={konfig.warna} />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.statusJenis}>{konfig.label}</Text>
                <Text style={styles.statusTgl}>
                  Diajukan {formatTglLengkap(data.createdAt)}
                </Text>
              </View>
              <View style={[styles.badge, {backgroundColor: badge.bg}]}>
                <Text style={styles.badgeTeks}>{badge.label}</Text>
              </View>
            </View>

            {!bisaEdit && (
              <View style={styles.peringatanBox}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={C.abuGelap}
                />
                <Text style={styles.peringatanTeks}>
                  {data.status === 'verified'
                    ? 'Data ini sudah diverifikasi dan tidak dapat diubah.'
                    : 'Data ini sudah ditolak dan tidak dapat diubah.'}
                </Text>
              </View>
            )}
          </View>

          {/* ── FORM DATA (lihat / edit) ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionJudul}>
              {editMode ? 'Edit Data Permohonan' : 'Data Permohonan'}
            </Text>

            {konfig.fields.map(fld => {
              if (!(editMode && fld.editable)) {
                return (
                  <InfoBaris
                    key={fld.key}
                    label={fld.label}
                    value={data[fld.key]}
                  />
                );
              }
              if (fld.isDate) {
                return (
                  <DatePickerField
                    key={fld.key}
                    label={fld.label}
                    value={form[fld.key]}
                    onChange={val => handleChangeField(fld.key, val)}
                    {...getBatasKalender(fld.key, form)}
                  />
                );
              }
              return (
                <InputBaris
                  key={fld.key}
                  label={fld.label}
                  value={form[fld.key]}
                  onChangeText={val => handleChangeField(fld.key, val)}
                  keyboardType={fld.keyboardType}
                  multiline={fld.multiline}
                />
              );
            })}
          </View>

          {/* ── DOKUMEN PENDUKUNG (foto/gambar yang sudah diinput) ── */}
          {daftarDokumen.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionJudul}>Dokumen Pendukung</Text>

              {daftarDokumen.map(({key, label}) => {
                const existingUrl = data[key];
                const newFile = editMode ? newDocs[key] : null;
                const previewUri = newFile ? newFile.uri : existingUrl || null;
                const hasDoc = !!previewUri;

                return (
                  <View key={key} style={styles.docItem}>
                    <View style={styles.docItemHeader}>
                      <Text style={styles.docItemLabel}>{label}</Text>
                      <View
                        style={[
                          styles.docStatusBadge,
                          hasDoc ? styles.docBadgeAda : styles.docBadgeTidak,
                        ]}>
                        <View
                          style={[
                            styles.docStatusDot,
                            {
                              backgroundColor: newFile
                                ? C.oranye
                                : hasDoc
                                ? C.hijau
                                : '#c1c7d0',
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.docStatusTxt,
                            hasDoc
                              ? styles.docBadgeTxtAda
                              : styles.docBadgeTxtTidak,
                          ]}>
                          {newFile
                            ? 'Diperbarui'
                            : hasDoc
                            ? 'Ada'
                            : 'Belum ada'}
                        </Text>
                      </View>
                    </View>

                    {/* Preview foto yang telah diinput user */}
                    {previewUri ? (
                      <TouchableOpacity
                        onPress={() => !editMode && bukaDoc(existingUrl, label)}
                        activeOpacity={editMode ? 1 : 0.7}>
                        <Image
                          source={{uri: previewUri}}
                          style={styles.docPreview}
                          resizeMode="cover"
                        />
                        {!editMode && (
                          <Text style={styles.docTapHint}>
                            Ketuk untuk membuka dokumen
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.docEmpty}>
                        <Text style={styles.docEmptyTxt}>Belum diunggah</Text>
                      </View>
                    )}

                    {editMode && bisaEdit && (
                      <TouchableOpacity
                        style={[
                          styles.docGantiBtn,
                          newFile && styles.docGantiBtnUpdate,
                        ]}
                        onPress={() => pickDoc(key)}>
                        <Text style={styles.docGantiBtnTxt}>
                          {newFile
                            ? 'Ganti lagi'
                            : hasDoc
                            ? 'Ganti Foto'
                            : 'Pilih Foto'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── HASIL VERIFIKASI (hanya jika sudah diverifikasi admin) ── */}
          {data.status === 'verified' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionJudul}>Hasil Verifikasi Admin</Text>
              <InfoBaris
                label="Blok Makam"
                value={data.assignedBlockBaru || data.assignedBlock}
              />
              <InfoBaris
                label="No. Makam"
                value={data.assignedGraveNumberBaru || data.assignedGraveNumber}
              />
              <InfoBaris label="Keterangan" value={data.adminNote || '-'} />
              <InfoBaris
                label="Tanggal Diterima"
                value={formatTglLengkap(data.verifiedAt)}
              />
            </View>
          )}

          {data.status === 'rejected' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionJudul}>Alasan Penolakan</Text>
              <InfoBaris label="Keterangan" value={data.adminNote || '-'} />
              <InfoBaris
                label="Tanggal Ditolak"
                value={formatTglLengkap(data.verifiedAt)}
              />
            </View>
          )}

          {/* ── TOMBOL AKSI ── */}
          {editMode ? (
            <View style={styles.tombolBaris}>
              <TouchableOpacity
                style={[styles.tombolSekunder]}
                onPress={handleBatalEdit}
                disabled={saving}>
                <Text style={styles.tombolSekunderTeks}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tombolUtama, {backgroundColor: konfig.warna}]}
                onPress={handleSimpan}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.tombolUtamaTeks}>Simpan Perubahan</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            bisaEdit && (
              <View style={[styles.tombolBaris, {marginTop: 4}]}>
                <TouchableOpacity
                  style={[styles.tombolHapus]}
                  onPress={handleHapus}
                  disabled={deleting}>
                  {deleting ? (
                    <ActivityIndicator size="small" color={C.merah} />
                  ) : (
                    <>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={C.merah}
                      />
                      <Text style={[styles.tombolHapusTeks, {marginLeft: 6}]}>
                        Hapus
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tombolUtama, {backgroundColor: konfig.warna}]}
                  onPress={handleMulaiEdit}
                  disabled={deleting}>
                  <Ionicons name="create-outline" size={16} color="#fff" />
                  <Text style={[styles.tombolUtamaTeks, {marginLeft: 6}]}>
                    Edit Data
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.bg},
  scroll: {flex: 1, backgroundColor: '#f4f5f7'},
  pusatLayar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  loadingTeks: {color: C.putih, marginTop: 12, fontSize: 14},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {padding: 6},
  headerJudul: {color: C.putih, fontSize: 16, fontWeight: 'bold'},
  headerSub: {color: C.abu, fontSize: 12, marginTop: 2},
  editIconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff10',
  },

  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  statusBaris: {flexDirection: 'row', alignItems: 'center'},
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusJenis: {fontSize: 14, fontWeight: 'bold', color: C.teksUtama},
  statusTgl: {fontSize: 11, color: C.abuGelap, marginTop: 2},

  peringatanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f7',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 6,
  },
  peringatanTeks: {fontSize: 11, color: C.abuGelap, flex: 1},

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  sectionJudul: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474f',
    marginBottom: 10,
  },

  infoBaris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  infoBarisLabel: {fontSize: 11, color: C.abu, flexShrink: 0},
  infoBarisValue: {
    fontSize: 13,
    color: '#263238',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },

  inputWrap: {marginBottom: 12},
  inputLabel: {
    fontSize: 11,
    color: C.abuGelap,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: C.garis,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: C.teksUtama,
    backgroundColor: '#fafafa',
  },
  inputMultiline: {minHeight: 70, textAlignVertical: 'top'},

  badge: {borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4},
  badgeTeks: {color: '#fff', fontSize: 10, fontWeight: 'bold'},

  tombolBaris: {flexDirection: 'row', gap: 10, marginTop: 4},
  tombolUtama: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tombolUtamaTeks: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  tombolSekunder: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eceff1',
  },
  tombolSekunderTeks: {color: C.teksUtama, fontWeight: 'bold', fontSize: 14},
  tombolHapus: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: C.merah + '55',
  },
  tombolHapusTeks: {color: C.merah, fontWeight: 'bold', fontSize: 14},

  // ── Dokumen item (preview foto) ──────────────────────────────────
  docItem: {
    borderWidth: 1,
    borderColor: '#eef0f4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafbfc',
  },
  docItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  docItemLabel: {fontSize: 13, fontWeight: '700', color: '#1b1f27'},
  docStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  docStatusDot: {width: 6, height: 6, borderRadius: 3, marginRight: 5},
  docStatusTxt: {fontSize: 11, fontWeight: '600'},
  docBadgeAda: {backgroundColor: '#eafaf3'},
  docBadgeTidak: {backgroundColor: '#eef0f4'},
  docBadgeTxtAda: {color: '#0c8f68'},
  docBadgeTxtTidak: {color: '#8a92a2'},
  docPreview: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    backgroundColor: '#e4e7ee',
  },
  docTapHint: {
    textAlign: 'center',
    fontSize: 11.5,
    color: C.biru,
    marginTop: 6,
  },
  docEmpty: {
    height: 90,
    borderRadius: 10,
    backgroundColor: '#f1f3f7',
    borderWidth: 1,
    borderColor: '#e4e7ee',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docEmptyTxt: {color: '#a3a9b7', fontSize: 12},
  docGantiBtn: {
    marginTop: 10,
    padding: 10,
    borderRadius: 9,
    backgroundColor: '#eef2fb',
    borderWidth: 1,
    borderColor: C.biru,
    alignItems: 'center',
  },
  docGantiBtnUpdate: {
    backgroundColor: '#fff8e6',
    borderColor: C.oranye,
  },
  docGantiBtnTxt: {fontSize: 13, fontWeight: '600', color: C.biru},
});
