import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ── Palet warna, sama dengan Home.js / PengajuanDetail.js ────────────
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

// ── Cloudinary config (sama dengan UserBurialForm) ──────────────────
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

// ── Daftar dokumen yang didukung ─────────────────────────────────────
const DOKUMEN_LIST = [
  {key: 'dokKTP', label: 'KTP Ahli Waris', folder: 'ktp'},
  {key: 'dokKK', label: 'KK Ahli Waris / Ahli Kubur', folder: 'kk'},
  {key: 'dokKTPJenazah', label: 'KTP Jenazah', folder: 'ktp_jenazah'},
  {key: 'dokKKJenazah', label: 'KK Jenazah', folder: 'kk_jenazah'},
  {key: 'dokSuratKematian', label: 'Surat Kematian', folder: 'surat_kematian'},
  {key: 'dokSuratMedis', label: 'Surat Medis', folder: 'surat_medis'},
];

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
const InputBaris = ({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  maxLength,
}) => (
  <View style={styles.inputWrap}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || 'default'}
      multiline={!!multiline}
      maxLength={maxLength}
      placeholder={`Masukkan ${label.toLowerCase()}`}
      placeholderTextColor={C.abu}
    />
  </View>
);

// ================================================================
// MAIN SCREEN
// ================================================================
export default function BurialDetailScreen({route, navigation}) {
  const {id} = route.params || {};
  const warna = C.hijau;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState(null);

  // ── Form state (semua field yang bisa diedit) ───────────────────
  const [form, setForm] = useState({
    deceasedName: '',
    nikJenazah: '',
    binBinti: '',
    jenisKelamin: 'Laki-laki',
    agama: '',
    tglLahirJenazah: '',
    tglWafat: '',
    penyebabKematian: '',
    heirName: '',
    nikAhliWaris: '',
    noTelepon: '',
    hubungan: '',
    tglLahirWaris: '',
    alamat: '',
    burialDate: '',
    notes: '',
  });

  // ── Dokumen baru (opsional saat edit) ────────────────────────────
  const [newDocs, setNewDocs] = useState({}); // { dokKTP: {uri,name,type}, ... }

  // ── Validasi params ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Data permohonan tidak valid.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    }
  }, [id]);

  // ── Load data dari Firestore (realtime) ─────────────────────────
  useEffect(() => {
    if (!id) return;
    const unsub = firestore()
      .collection('burials')
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
          // Isi form hanya kalau bukan sedang edit, supaya realtime update
          // tidak menimpa input yang sedang diketik user.
          setForm(prev =>
            editMode
              ? prev
              : {
                  deceasedName: d.deceasedName || '',
                  nikJenazah: d.nikJenazah || '',
                  binBinti: d.binBinti || '',
                  jenisKelamin: d.jenisKelamin || 'Laki-laki',
                  agama: d.agama || '',
                  tglLahirJenazah: d.tglLahirJenazah || '',
                  tglWafat: d.tglWafat || '',
                  penyebabKematian: d.penyebabKematian || '',
                  heirName: d.heirName || '',
                  nikAhliWaris: d.nikAhliWaris || '',
                  noTelepon: d.noTelepon || '',
                  hubungan: d.hubungan || '',
                  tglLahirWaris: d.tglLahirWaris || '',
                  alamat: d.alamat || '',
                  burialDate: d.burialDate || '',
                  notes: d.notes || '',
                },
          );
          setLoading(false);
        },
        err => {
          console.log('[BurialDetail] snapshot err', err);
          setLoading(false);
          Alert.alert('Error', 'Gagal memuat data.');
        },
      );
    return () => unsub();
  }, [id]);

  // ── Auto-format tanggal ─────────────────────────────────────────
  const formatTanggal = (text, key) => {
    let val = text.replace(/[^0-9]/g, '');
    if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    handleChangeField(key, val.slice(0, 10));
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

  // ── Mulai edit ────────────────────────────────────────────────────
  const handleMulaiEdit = () => {
    if (data?.status !== 'pending') {
      Alert.alert(
        'Tidak Bisa Diedit',
        'Data yang sudah diverifikasi atau ditolak tidak dapat diubah lagi.',
      );
      return;
    }
    setEditMode(true);
  };

  const handleBatalEdit = () => {
    setForm({
      deceasedName: data.deceasedName || '',
      nikJenazah: data.nikJenazah || '',
      binBinti: data.binBinti || '',
      jenisKelamin: data.jenisKelamin || 'Laki-laki',
      agama: data.agama || '',
      tglLahirJenazah: data.tglLahirJenazah || '',
      tglWafat: data.tglWafat || '',
      penyebabKematian: data.penyebabKematian || '',
      heirName: data.heirName || '',
      nikAhliWaris: data.nikAhliWaris || '',
      noTelepon: data.noTelepon || '',
      hubungan: data.hubungan || '',
      tglLahirWaris: data.tglLahirWaris || '',
      alamat: data.alamat || '',
      burialDate: data.burialDate || '',
      notes: data.notes || '',
    });
    setNewDocs({});
    setEditMode(false);
  };

  // ── Simpan perubahan ────────────────────────────────────────────
  const handleSimpan = async () => {
    if (
      !form.deceasedName.trim() ||
      !form.heirName.trim() ||
      !form.burialDate.trim()
    ) {
      Alert.alert(
        'Lengkapi Data',
        'Nama jenazah, ahli waris, dan tanggal pemakaman wajib diisi.',
      );
      return;
    }
    if (data.status !== 'pending') {
      Alert.alert(
        'Tidak Diizinkan',
        'Hanya data berstatus pending yang bisa diubah.',
      );
      return;
    }

    setSaving(true);
    try {
      // Upload dokumen baru kalau ada yang diganti, sisanya pakai URL lama
      const uploadedEntries = await Promise.all(
        DOKUMEN_LIST.map(async ({key, folder}) => {
          if (newDocs[key]) {
            const url = await uploadToCloudinary(newDocs[key], folder);
            return [key, url];
          }
          return [key, data[key] || null];
        }),
      );
      const dokUrls = Object.fromEntries(uploadedEntries);

      const payload = {
        deceasedName: form.deceasedName.trim(),
        nikJenazah: form.nikJenazah.trim(),
        binBinti: form.binBinti.trim(),
        jenisKelamin: form.jenisKelamin,
        agama: form.agama.trim(),
        tglLahirJenazah: form.tglLahirJenazah.trim(),
        tglWafat: form.tglWafat.trim(),
        penyebabKematian: form.penyebabKematian.trim(),
        heirName: form.heirName.trim(),
        nikAhliWaris: form.nikAhliWaris.trim(),
        noTelepon: form.noTelepon.trim(),
        hubungan: form.hubungan.trim(),
        tglLahirWaris: form.tglLahirWaris.trim(),
        alamat: form.alamat.trim(),
        burialDate: form.burialDate.trim(),
        notes: form.notes.trim(),
        ...dokUrls,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      console.log('[BurialDetail] update path: burials', id);
      console.log('[BurialDetail] update payload:', payload);

      await firestore()
        .collection('burials')
        .doc(id)
        .set(payload, {merge: true});

      setSaving(false);
      setEditMode(false);
      setNewDocs({});
      Alert.alert('Berhasil', 'Perubahan data berhasil disimpan.');
    } catch (err) {
      console.log('[BurialDetail] save err', err.code, err.message, err);
      setSaving(false);
      Alert.alert(
        'Gagal Menyimpan',
        `${err.code || 'unknown'}: ${
          err.message || 'Terjadi kesalahan tidak diketahui.'
        }`,
      );
    }
  };

  // ── Hapus data ────────────────────────────────────────────────────
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
      'Yakin ingin menghapus permohonan makam baru ini? Tindakan ini tidak dapat dibatalkan.',
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await firestore().collection('burials').doc(id).delete();
              setDeleting(false);
              navigation.goBack();
            } catch (err) {
              console.log(
                '[BurialDetail] delete err',
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

  // ── Loading & null guard ────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        <View style={styles.pusatLayar}>
          <ActivityIndicator size="large" color={warna} />
          <Text style={styles.loadingTeks}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!data) return null;

  const isOwner = auth().currentUser?.uid === data.createdBy;
  const bisaEdit = isOwner && data.status === 'pending';
  const badge = warnaBadge(data.status);

  const JKButton = ({label}) => (
    <TouchableOpacity
      onPress={() => handleChangeField('jenisKelamin', label)}
      style={[styles.jkBtn, form.jenisKelamin === label && styles.jkBtnActive]}>
      <Text
        style={[
          styles.jkTxt,
          form.jenisKelamin === label && styles.jkTxtActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // ════════════════════════════════════════════════════════════════
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
          <Text style={styles.headerJudul}>Detail Makam Baru</Text>
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
              <View style={[styles.iconWrap, {backgroundColor: warna + '18'}]}>
                <Ionicons name="add-circle-outline" size={24} color={warna} />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.statusJenis}>Makam Baru</Text>
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
                    ? 'Data ini sudah diterima dan tidak dapat diubah.'
                    : data.status === 'rejected'
                    ? 'Data ini sudah ditolak dan tidak dapat diubah.'
                    : 'Anda tidak memiliki akses untuk mengubah data ini.'}
                </Text>
              </View>
            )}
          </View>

          {/* ── SECTION 1: DATA JENAZAH ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionJudul}>Data Jenazah</Text>
            {!editMode ? (
              <>
                <InfoBaris label="Nama" value={data.deceasedName} />
                <InfoBaris label="NIK" value={data.nikJenazah} />
                <InfoBaris label="Bin/Binti" value={data.binBinti} />
                <InfoBaris label="Jenis Kelamin" value={data.jenisKelamin} />
                <InfoBaris label="Agama" value={data.agama} />
                <InfoBaris label="Tanggal Lahir" value={data.tglLahirJenazah} />
                <InfoBaris label="Tanggal Wafat" value={data.tglWafat} />
                <InfoBaris label="Penyebab" value={data.penyebabKematian} />
              </>
            ) : (
              <>
                <InputBaris
                  label="Nama Jenazah *"
                  value={form.deceasedName}
                  onChangeText={t => handleChangeField('deceasedName', t)}
                />
                <InputBaris
                  label="NIK Jenazah * (16 digit)"
                  value={form.nikJenazah}
                  onChangeText={t => handleChangeField('nikJenazah', t)}
                  keyboardType="number-pad"
                  maxLength={16}
                />
                <InputBaris
                  label="Bin / Binti *"
                  value={form.binBinti}
                  onChangeText={t => handleChangeField('binBinti', t)}
                />
                <Text style={styles.inputLabel}>Jenis Kelamin *</Text>
                <View style={styles.jkRow}>
                  <JKButton label="Laki-laki" />
                  <JKButton label="Perempuan" />
                </View>
                <View style={{height: 10}} />
                <InputBaris
                  label="Agama *"
                  value={form.agama}
                  onChangeText={t => handleChangeField('agama', t)}
                />
                <InputBaris
                  label="Tanggal Lahir (DD-MM-YYYY)"
                  value={form.tglLahirJenazah}
                  onChangeText={t => formatTanggal(t, 'tglLahirJenazah')}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <InputBaris
                  label="Tanggal Wafat (DD-MM-YYYY)"
                  value={form.tglWafat}
                  onChangeText={t => formatTanggal(t, 'tglWafat')}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <InputBaris
                  label="Penyebab Kematian *"
                  value={form.penyebabKematian}
                  onChangeText={t => handleChangeField('penyebabKematian', t)}
                />
              </>
            )}
          </View>

          {/* ── SECTION 2: DATA AHLI WARIS ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionJudul}>Data Ahli Waris</Text>
            {!editMode ? (
              <>
                <InfoBaris label="Nama" value={data.heirName} />
                <InfoBaris label="NIK" value={data.nikAhliWaris} />
                <InfoBaris label="No. Telepon" value={data.noTelepon} />
                <InfoBaris label="Hubungan" value={data.hubungan} />
                <InfoBaris label="Tanggal Lahir" value={data.tglLahirWaris} />
                <InfoBaris label="Alamat" value={data.alamat} />
              </>
            ) : (
              <>
                <InputBaris
                  label="Nama Ahli Waris *"
                  value={form.heirName}
                  onChangeText={t => handleChangeField('heirName', t)}
                />
                <InputBaris
                  label="NIK Ahli Waris * (16 digit)"
                  value={form.nikAhliWaris}
                  onChangeText={t => handleChangeField('nikAhliWaris', t)}
                  keyboardType="number-pad"
                  maxLength={16}
                />
                <InputBaris
                  label="No. Telepon *"
                  value={form.noTelepon}
                  onChangeText={t => handleChangeField('noTelepon', t)}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
                <InputBaris
                  label="Hubungan dengan Jenazah *"
                  value={form.hubungan}
                  onChangeText={t => handleChangeField('hubungan', t)}
                />
                <InputBaris
                  label="Tanggal Lahir (DD-MM-YYYY)"
                  value={form.tglLahirWaris}
                  onChangeText={t => formatTanggal(t, 'tglLahirWaris')}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <InputBaris
                  label="Alamat"
                  value={form.alamat}
                  onChangeText={t => handleChangeField('alamat', t)}
                  multiline
                />
              </>
            )}
          </View>

          {/* ── SECTION 3: DATA PEMAKAMAN ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionJudul}>Data Pemakaman</Text>
            {!editMode ? (
              <>
                <InfoBaris label="Tgl Pemakaman" value={data.burialDate} />
                <InfoBaris label="Catatan" value={data.notes} />
              </>
            ) : (
              <>
                <InputBaris
                  label="Tanggal Pemakaman (DD-MM-YYYY) *"
                  value={form.burialDate}
                  onChangeText={t => formatTanggal(t, 'burialDate')}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <InputBaris
                  label="Catatan (opsional)"
                  value={form.notes}
                  onChangeText={t => handleChangeField('notes', t)}
                  multiline
                />
              </>
            )}

            {data.status === 'verified' && data.assignedBlock ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.lokasiHeader}>
                  Lokasi Makam (dari Admin)
                </Text>
                <InfoBaris label="Block" value={data.assignedBlock} />
                <InfoBaris
                  label="Nomor Makam"
                  value={data.assignedGraveNumber}
                />
                <InfoBaris label="Keterangan" value={data.adminNote || '-'} />
              </>
            ) : null}

            {data.status === 'rejected' ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.lokasiHeader}>Alasan Penolakan</Text>
                <InfoBaris label="Keterangan" value={data.adminNote || '-'} />
              </>
            ) : null}
          </View>

          {/* ── SECTION 4: DOKUMEN (dengan preview foto) ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionJudul}>Dokumen Pendukung</Text>

            {DOKUMEN_LIST.map(({key, label}) => {
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
                        {newFile ? 'Diperbarui' : hasDoc ? 'Ada' : 'Belum ada'}
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

                  {editMode && (
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

          {/* ── TOMBOL AKSI ── */}
          {editMode ? (
            <View style={styles.tombolBaris}>
              <TouchableOpacity
                style={styles.tombolSekunder}
                onPress={handleBatalEdit}
                disabled={saving}>
                <Text style={styles.tombolSekunderTeks}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tombolUtama, {backgroundColor: warna}]}
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
                  style={styles.tombolHapus}
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
                  style={[styles.tombolUtama, {backgroundColor: warna}]}
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
  editIconBtn: {padding: 8, borderRadius: 10, backgroundColor: '#ffffff10'},

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

  divider: {height: 1, backgroundColor: '#eef0f4', marginVertical: 12},
  lokasiHeader: {
    fontWeight: '700',
    color: C.hijau,
    marginBottom: 10,
    fontSize: 13,
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

  jkRow: {flexDirection: 'row', gap: 8, marginTop: 4},
  jkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.garis,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  jkBtnActive: {backgroundColor: C.hijau, borderColor: C.hijau},
  jkTxt: {color: C.abuGelap, fontWeight: '500', fontSize: 13.5},
  jkTxtActive: {color: '#fff', fontWeight: '700'},

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

  // ── Dokumen item ─────────────────────────────────────────────────
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
  docGantiBtnUpdate: {backgroundColor: '#fff8e6', borderColor: C.oranye},
  docGantiBtnTxt: {fontSize: 13, fontWeight: '600', color: C.biru},
});
