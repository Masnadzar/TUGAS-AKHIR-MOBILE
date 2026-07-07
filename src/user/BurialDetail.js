// src/screens/BurialDetailScreen.js
import React, {useEffect, useState} from 'react';
import {
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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';

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

export default function BurialDetailScreen({route, navigation}) {
  const {id} = route.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState(null);

  // ── Edit state: Data Jenazah ────────────────────────────────────
  const [deceasedName, setDeceasedName] = useState('');
  const [nikJenazah, setNikJenazah] = useState('');
  const [binBinti, setBinBinti] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('Laki-laki');
  const [agama, setAgama] = useState('');
  const [tglLahirJenazah, setTglLahirJenazah] = useState('');
  const [tglWafat, setTglWafat] = useState('');
  const [penyebabKematian, setPenyebabKematian] = useState('');

  // ── Edit state: Data Ahli Waris ─────────────────────────────────
  const [heirName, setHeirName] = useState('');
  const [nikAhliWaris, setNikAhliWaris] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [hubungan, setHubungan] = useState('');
  const [tglLahirWaris, setTglLahirWaris] = useState('');
  const [alamat, setAlamat] = useState('');

  // ── Edit state: Data Pemakaman ──────────────────────────────────
  const [burialDate, setBurialDate] = useState('');
  const [notes, setNotes] = useState('');

  // ── Edit state: Dokumen baru (opsional saat edit) ───────────────
  const [dokKTP, setDokKTP] = useState(null);
  const [dokKK, setDokKK] = useState(null);
  const [dokAkte, setDokAkte] = useState(null);
  const [dokSuratKematian, setDokSuratKematian] = useState(null);
  const [dokSuratMedis, setDokSuratMedis] = useState(null);

  // ── Load data dari Firestore ────────────────────────────────────
  useEffect(() => {
    if (!id) {
      navigation.goBack();
      return;
    }
    const unsub = firestore()
      .collection('burials')
      .doc(id)
      .onSnapshot(
        snap => {
          if (snap.exists) {
            const d = snap.data();
            setData({id: snap.id, ...d});
            // isi semua state edit
            setDeceasedName(d.deceasedName || '');
            setNikJenazah(d.nikJenazah || '');
            setBinBinti(d.binBinti || '');
            setJenisKelamin(d.jenisKelamin || 'Laki-laki');
            setAgama(d.agama || '');
            setTglLahirJenazah(d.tglLahirJenazah || '');
            setTglWafat(d.tglWafat || '');
            setPenyebabKematian(d.penyebabKematian || '');
            setHeirName(d.heirName || '');
            setNikAhliWaris(d.nikAhliWaris || '');
            setNoTelepon(d.noTelepon || '');
            setTglLahirWaris(d.tglLahirWaris || '');
            setHubungan(d.hubungan || '');
            setAlamat(d.alamat || '');
            setBurialDate(d.burialDate || '');
            setNotes(d.notes || '');
          }
          setLoading(false);
        },
        err => {
          console.log(err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, [id, navigation]);

  // ── Auto-format tanggal ─────────────────────────────────────────
  const formatTanggal = (text, setter) => {
    let val = text.replace(/[^0-9]/g, '');
    if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    setter(val.slice(0, 10));
  };

  // ── Pilih foto dokumen ──────────────────────────────────────────
  const pickDoc = setter => {
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
          setter({
            uri: asset.uri,
            name: asset.fileName || 'upload.jpg',
            type: asset.type || 'image/jpeg',
          });
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

  // ── Simpan perubahan ────────────────────────────────────────────
  const handleSave = async () => {
    if (!deceasedName.trim() || !heirName.trim() || !burialDate.trim()) {
      Alert.alert(
        'Validasi',
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
    try {
      setSaving(true);

      // Upload dokumen baru kalau ada yang diganti
      const [urlKTP, urlKK, urlAkte, urlSuratKematian, urlSuratMedis] =
        await Promise.all([
          dokKTP
            ? uploadToCloudinary(dokKTP, 'ktp')
            : Promise.resolve(data.dokKTP),
          dokKK ? uploadToCloudinary(dokKK, 'kk') : Promise.resolve(data.dokKK),
          dokAkte
            ? uploadToCloudinary(dokAkte, 'Akte')
            : Promise.resolve(data.dokAkte),
          dokSuratKematian
            ? uploadToCloudinary(dokSuratKematian, 'surat_kematian')
            : Promise.resolve(data.dokSuratKematian),
          dokSuratMedis
            ? uploadToCloudinary(dokSuratMedis, 'surat_medis')
            : Promise.resolve(data.dokSuratMedis),
        ]);

      await firestore()
        .collection('burials')
        .doc(id)
        .set(
          {
            // Data jenazah
            deceasedName: deceasedName.trim(),
            nikJenazah: nikJenazah.trim(),
            binBinti: binBinti.trim(),
            jenisKelamin: jenisKelamin,
            agama: agama.trim(),
            tglLahirJenazah: tglLahirJenazah.trim(),
            tglWafat: tglWafat.trim(),
            penyebabKematian: penyebabKematian.trim(),
            // Data ahli waris
            heirName: heirName.trim(),
            nikAhliWaris: nikAhliWaris.trim(),
            noTelepon: noTelepon.trim(),
            hubungan: hubungan.trim(),
            tglLahirWaris: tglLahirWaris.trim(),
            alamat: alamat.trim(),
            // Data pemakaman
            burialDate: burialDate.trim(),
            notes: notes.trim(),
            // Dokumen
            dokKTP: urlKTP || null,
            dokKK: urlKK || null,
            dokSuratKematian: urlSuratKematian || null,
            dokSuratMedis: urlSuratMedis || null,
            // Timestamp update
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );

      Alert.alert('Sukses', 'Perubahan berhasil disimpan.');
      setEditMode(false);
      setDokKTP(null);
      setDokKK(null);
      setDokSuratKematian(null);
      setDokSuratMedis(null);
      navigation.goBack();
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading & null guard ────────────────────────────────────────
  if (loading)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );
  if (!data)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: '#888'}}>Data tidak ditemukan.</Text>
      </View>
    );

  const isOwner = auth().currentUser?.uid === data.createdBy;
  const canEdit = isOwner && data.status === 'pending';

  // ── Warna status ────────────────────────────────────────────────
  const statusCfg = {
    pending: {bg: '#fff3cd', txt: '#856404', label: '⏳ MENUNGGU VERIFIKASI'},
    verified: {bg: '#d4edda', txt: '#155724', label: '✅ TERVERIFIKASI'},
    rejected: {bg: '#f8d7da', txt: '#721c24', label: '❌ DITOLAK'},
  };
  const sc = statusCfg[data.status] || statusCfg.pending;

  // ── Sub-komponen ────────────────────────────────────────────────
  const Row = ({icon, label, value}) => (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );

  const SectionTitle = ({title}) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const DocBadge = ({label, url, newFile}) => (
    <TouchableOpacity
      style={[
        styles.docBadge,
        url || newFile ? styles.docBadgeAda : styles.docBadgeTidak,
      ]}
      onPress={() => !editMode && bukaDoc(url, label)}>
      <Text
        style={[
          styles.docBadgeTxt,
          url || newFile ? styles.docBadgeTxtAda : styles.docBadgeTxtTidak,
        ]}>
        {newFile ? `🔄 ${label}` : url ? `✅ ${label}` : `❌ ${label}`}
      </Text>
    </TouchableOpacity>
  );

  const JKButton = ({label}) => (
    <TouchableOpacity
      onPress={() => setJenisKelamin(label)}
      style={[styles.jkBtn, jenisKelamin === label && styles.jkBtnActive]}>
      <Text
        style={[styles.jkTxt, jenisKelamin === label && styles.jkTxtActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const EditInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    maxLength,
    multiline,
  }) => (
    <>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={[
          styles.editInput,
          multiline && {height: 70, textAlignVertical: 'top'},
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        multiline={multiline}
      />
    </>
  );

  // ════════════════════════════════════════════════════════════════
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{padding: 16, paddingBottom: 50}}>
      {/* ══ HEADER STATUS ══ */}
      <View style={[styles.statusBanner, {backgroundColor: sc.bg}]}>
        <Text style={[styles.statusLabel, {color: sc.txt}]}>{sc.label}</Text>
      </View>

      {/* ══ SECTION 1: DATA JENAZAH ══ */}
      <View style={styles.card}>
        <SectionTitle title="📋  Data Jenazah" />
        {!editMode ? (
          <>
            <Row icon="👤" label="Nama" value={data.deceasedName} />
            <Row icon="🪪" label="NIK" value={data.nikJenazah} />
            <Row icon="📝" label="Bin/Binti" value={data.binBinti} />
            <Row icon="⚧" label="Jenis Kelamin" value={data.jenisKelamin} />
            <Row icon="🕌" label="Agama" value={data.agama} />
            <Row icon="🎂" label="Tanggal Lahir" value={data.tglLahirJenazah} />
            <Row icon="🕯️" label="Tanggal Wafat" value={data.tglWafat} />
            <Row icon="💊" label="Penyebab" value={data.penyebabKematian} />
          </>
        ) : (
          <>
            <EditInput
              label="Nama Jenazah *"
              value={deceasedName}
              onChangeText={setDeceasedName}
              placeholder="Nama lengkap jenazah"
            />
            <EditInput
              label="NIK Jenazah * (16 digit)"
              value={nikJenazah}
              onChangeText={setNikJenazah}
              placeholder="3175010101900001"
              keyboardType="number-pad"
              maxLength={16}
            />
            <EditInput
              label="Bin / Binti *"
              value={binBinti}
              onChangeText={setBinBinti}
              placeholder="bin Ahmad / binti Siti"
            />
            <Text style={styles.editLabel}>Jenis Kelamin *</Text>
            <View style={styles.jkRow}>
              <JKButton label="Laki-laki" />
              <JKButton label="Perempuan" />
            </View>
            <EditInput
              label="Agama *"
              value={agama}
              onChangeText={setAgama}
              placeholder="Agama jenazah"
            />
            <EditInput
              label="Tanggal Lahir (DD-MM-YYYY)"
              value={tglLahirJenazah}
              onChangeText={t => formatTanggal(t, setTglLahirJenazah)}
              placeholder="10-05-1945"
              keyboardType="number-pad"
              maxLength={10}
            />
            <EditInput
              label="Tanggal Wafat (DD-MM-YYYY)"
              value={tglWafat}
              onChangeText={t => formatTanggal(t, setTglWafat)}
              placeholder="05-12-2025"
              keyboardType="number-pad"
              maxLength={10}
            />
            <EditInput
              label="Penyebab Kematian *"
              value={penyebabKematian}
              onChangeText={setPenyebabKematian}
              placeholder="Contoh: Sakit jantung"
            />
          </>
        )}
      </View>

      {/* ══ SECTION 2: DATA AHLI WARIS ══ */}
      <View style={styles.card}>
        <SectionTitle title="👤  Data Ahli Waris" />
        {!editMode ? (
          <>
            <Row icon="👤" label="Nama" value={data.heirName} />
            <Row icon="🪪" label="NIK" value={data.nikAhliWaris} />
            <Row icon="📞" label="No. Telepon" value={data.noTelepon} />
            <Row icon="🤝" label="Hubungan" value={data.hubungan} />
            <Row icon="🎂" label="Tanggal Lahir" value={data.tglLahirWaris} />
            <Row icon="📝" label="Alamat" value={data.alamat} />
          </>
        ) : (
          <>
            <EditInput
              label="Nama Ahli Waris *"
              value={heirName}
              onChangeText={setHeirName}
              placeholder="Nama lengkap ahli waris"
            />
            <EditInput
              label="NIK Ahli Waris * (16 digit)"
              value={nikAhliWaris}
              onChangeText={setNikAhliWaris}
              placeholder="3175010101900002"
              keyboardType="number-pad"
              maxLength={16}
            />
            <EditInput
              label="No. Telepon *"
              value={noTelepon}
              onChangeText={setNoTelepon}
              placeholder="08123456789"
              keyboardType="phone-pad"
              maxLength={13}
            />
            <EditInput
              label="Hubungan dengan Jenazah *"
              value={hubungan}
              onChangeText={setHubungan}
              placeholder="Anak, Suami, Istri, Saudara"
            />
            <EditInput
              label="Tanggal Lahir (DD-MM-YYYY)"
              value={tglLahirWaris}
              onChangeText={t => formatTanggal(t, setTglLahirWaris)}
              placeholder="10-05-1945"
              keyboardType="number-pad"
              maxLength={10}
            />
            <EditInput
              label="Alamat"
              value={notes}
              onChangeText={setNotes}
              placeholder="Alamat Saat ini"
              multiline
            />
          </>
        )}
      </View>

      {/* ══ SECTION 3: DATA PEMAKAMAN ══ */}
      <View style={styles.card}>
        <SectionTitle title="🕌  Data Pemakaman" />
        <Row icon="📅" label="Tgl Pemakaman" value={data.burialDate} />
        <Row icon="📝" label="Catatan" value={data.notes || '-'} />
        {data.assignedBlock ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.lokasiHeader}>
              📍 Lokasi Makam (dari Admin)
            </Text>
            <Row icon="🗺️" label="Block" value={data.assignedBlock} />
            <Row
              icon="🔢"
              label="Nomor Makam"
              value={data.assignedGraveNumber}
            />
            <Row
              icon="📋"
              label="Catatan Admin"
              value={data.adminNote || '-'}
            />
          </>
        ) : null}
        {editMode ? (
          <>
            <View style={styles.divider} />
            <EditInput
              label="Tanggal Pemakaman (DD-MM-YYYY)"
              value={burialDate}
              onChangeText={t => formatTanggal(t, setBurialDate)}
              placeholder="06-12-2025"
              keyboardType="number-pad"
              maxLength={10}
            />
            <EditInput
              label="Catatan (opsional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Catatan / patokan lokasi"
              multiline
            />
          </>
        ) : null}
      </View>

      {/* ══ SECTION 4: DOKUMEN ══ */}
      <View style={styles.card}>
        <SectionTitle title="📎  Dokumen Pendukung" />

        {[
          {
            label: 'KTP',
            urlKey: 'dokKTP',
            newFile: editMode ? dokKTP : null,
            setter: setDokKTP,
          },
          {
            label: 'KK',
            urlKey: 'dokKK',
            newFile: editMode ? dokKK : null,
            setter: setDokKK,
          },
          {
            label: 'Akte',
            urlKey: 'dokAkte',
            newFile: editMode ? dokAkte : null,
            setter: setDokAkte,
          },
          {
            label: 'Surat Kematian',
            urlKey: 'dokSuratKematian',
            newFile: editMode ? dokSuratKematian : null,
            setter: setDokSuratKematian,
          },
          {
            label: 'Surat Medis',
            urlKey: 'dokSuratMedis',
            newFile: editMode ? dokSuratMedis : null,
            setter: setDokSuratMedis,
          },
        ].map(({label, urlKey, newFile, setter}) => {
          const existingUrl = data[urlKey];
          const previewUri = newFile ? newFile.uri : existingUrl || null;
          const hasDoc = !!previewUri;

          return (
            <View key={label} style={styles.docItem}>
              {/* Baris atas: label + status badge */}
              <View style={styles.docItemHeader}>
                <Text style={styles.docItemLabel}>{label}</Text>
                <View
                  style={[
                    styles.docStatusBadge,
                    hasDoc ? styles.docBadgeAda : styles.docBadgeTidak,
                  ]}>
                  <Text
                    style={[
                      styles.docStatusTxt,
                      hasDoc ? styles.docBadgeTxtAda : styles.docBadgeTxtTidak,
                    ]}>
                    {newFile
                      ? '🔄 Diperbarui'
                      : hasDoc
                      ? '✅ Ada'
                      : '❌ Belum ada'}
                  </Text>
                </View>
              </View>

              {/* Preview foto */}
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
                    <Text style={styles.docTapHint}>🔍 Ketuk untuk buka</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.docEmpty}>
                  <Text style={styles.docEmptyIcon}>📄</Text>
                  <Text style={styles.docEmptyTxt}>Belum diunggah</Text>
                </View>
              )}

              {/* Tombol ganti (hanya saat edit mode) */}
              {editMode && (
                <TouchableOpacity
                  style={[
                    styles.docGantiBtn,
                    newFile && styles.docGantiBtnUpdate,
                  ]}
                  onPress={() => pickDoc(setter)}>
                  <Text style={styles.docGantiBtnTxt}>
                    {newFile
                      ? '🔄 Ganti lagi'
                      : hasDoc
                      ? '✏️ Ganti Foto'
                      : '📎 Pilih Foto'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* ══ TOMBOL AKSI ══ */}
      {canEdit && !editMode && (
        <TouchableOpacity
          style={styles.btnEdit}
          onPress={() => setEditMode(true)}>
          <Text style={styles.btnTxt}>✏️ Edit Data</Text>
        </TouchableOpacity>
      )}

      {editMode && (
        <>
          <TouchableOpacity
            style={styles.btnSave}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.btnTxt}>Menyimpan...</Text>
              </View>
            ) : (
              <Text style={styles.btnTxt}>💾 Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={() => setEditMode(false)}
            disabled={saving}>
            <Text style={[styles.btnTxt, {color: '#555'}]}>Batal</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  statusBanner: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  statusLabel: {fontWeight: 'bold', fontSize: 14},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e90ff',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 6,
  },
  row: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8},
  rowIcon: {width: 22, fontSize: 14},
  rowLabel: {width: 130, color: '#888', fontSize: 13},
  rowValue: {flex: 1, color: '#303030', fontSize: 13, fontWeight: '600'},
  divider: {height: 1, backgroundColor: '#f0f0f0', marginVertical: 12},
  lokasiHeader: {
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 8,
    fontSize: 13,
  },
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6},
  docHint: {color: '#aaa', fontSize: 11, marginBottom: 6},
  docBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  docBadgeAda: {backgroundColor: '#d4edda', borderColor: '#28a745'},
  docBadgeTidak: {backgroundColor: '#f0f0f0', borderColor: '#ccc'},
  docBadgeTxt: {fontSize: 12, fontWeight: '600'},
  docBadgeTxtAda: {color: '#155724'},
  docBadgeTxtTidak: {color: '#888'},
  editLabel: {
    marginTop: 12,
    marginBottom: 4,
    color: '#555',
    fontSize: 13,
    fontWeight: '500',
  },
  editInput: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 13,
  },
  jkRow: {flexDirection: 'row', gap: 8, marginTop: 4},
  jkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  jkBtnActive: {backgroundColor: '#1e90ff', borderColor: '#1e90ff'},
  jkTxt: {color: '#373248', fontWeight: '500'},
  jkTxtActive: {color: '#fff', fontWeight: 'bold'},
  btnEdit: {
    backgroundColor: '#1e90ff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 10,
  },
  btnSave: {
    backgroundColor: '#2ed573',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 10,
  },
  btnCancel: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  // ── Dokumen item baru ───────────────────────────────────────────
  docItem: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  docItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  docItemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  docStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  docStatusTxt: {
    fontSize: 11,
    fontWeight: '600',
  },
  docPreview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  docTapHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#1e90ff',
    marginTop: 5,
  },
  docEmpty: {
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docEmptyIcon: {fontSize: 28},
  docEmptyTxt: {color: '#aaa', fontSize: 12, marginTop: 4},
  docGantiBtn: {
    marginTop: 10,
    padding: 9,
    borderRadius: 8,
    backgroundColor: '#e8f4fd',
    borderWidth: 1,
    borderColor: '#1e90ff',
    alignItems: 'center',
  },
  docGantiBtnUpdate: {
    backgroundColor: '#fff3cd',
    borderColor: '#f0a500',
  },
  docGantiBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e90ff',
  },
  btnTxt: {color: '#fff', fontWeight: 'bold', fontSize: 15},
});
