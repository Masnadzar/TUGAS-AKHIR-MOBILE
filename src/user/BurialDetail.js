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
            dokAkte: urlAkte || null,
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
      setDokAkte(null);
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
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#2f6fed" />
      </View>
    );
  if (!data)
    return (
      <View style={styles.centerScreen}>
        <Text style={{color: '#8a92a2'}}>Data tidak ditemukan.</Text>
      </View>
    );

  const isOwner = auth().currentUser?.uid === data.createdBy;
  const canEdit = isOwner && data.status === 'pending';

  // ── Konfigurasi status ───────────────────────────────────────────
  const statusCfg = {
    pending: {
      bg: '#fff8e6',
      dot: '#f59f00',
      txt: '#a06b00',
      label: 'Menunggu Verifikasi',
    },
    verified: {
      bg: '#eafaf3',
      dot: '#12b886',
      txt: '#0c8f68',
      label: 'Terverifikasi',
    },
    rejected: {bg: '#fdedec', dot: '#e03131', txt: '#c0392b', label: 'Ditolak'},
  };
  const sc = statusCfg[data.status] || statusCfg.pending;

  // ── Sub-komponen ────────────────────────────────────────────────
  const Row = ({label, value}) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );

  const SectionTitle = ({title, color}) => (
    <View style={styles.cardHeader}>
      <View style={[styles.cardAccent, {backgroundColor: color}]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
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
        placeholderTextColor="#a3a9b7"
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
        <View style={[styles.statusDot, {backgroundColor: sc.dot}]} />
        <Text style={[styles.statusLabel, {color: sc.txt}]}>{sc.label}</Text>
      </View>

      {/* ══ SECTION 1: DATA JENAZAH ══ */}
      <View style={styles.card}>
        <SectionTitle title="Data Jenazah" color="#2f6fed" />
        {!editMode ? (
          <>
            <Row label="Nama" value={data.deceasedName} />
            <Row label="NIK" value={data.nikJenazah} />
            <Row label="Bin/Binti" value={data.binBinti} />
            <Row label="Jenis Kelamin" value={data.jenisKelamin} />
            <Row label="Agama" value={data.agama} />
            <Row label="Tanggal Lahir" value={data.tglLahirJenazah} />
            <Row label="Tanggal Wafat" value={data.tglWafat} />
            <Row label="Penyebab" value={data.penyebabKematian} />
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
        <SectionTitle title="Data Ahli Waris" color="#12b886" />
        {!editMode ? (
          <>
            <Row label="Nama" value={data.heirName} />
            <Row label="NIK" value={data.nikAhliWaris} />
            <Row label="No. Telepon" value={data.noTelepon} />
            <Row label="Hubungan" value={data.hubungan} />
            <Row label="Tanggal Lahir" value={data.tglLahirWaris} />
            <Row label="Alamat" value={data.alamat} />
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
              value={alamat}
              onChangeText={setAlamat}
              placeholder="Alamat saat ini"
              multiline
            />
          </>
        )}
      </View>

      {/* ══ SECTION 3: DATA PEMAKAMAN ══ */}
      <View style={styles.card}>
        <SectionTitle title="Data Pemakaman" color="#f59f00" />
        <Row label="Tgl Pemakaman" value={data.burialDate} />
        <Row label="Catatan" value={data.notes || '-'} />
        {data.assignedBlock ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.lokasiHeader}>Lokasi Makam (dari Admin)</Text>
            <Row label="Block" value={data.assignedBlock} />
            <Row label="Nomor Makam" value={data.assignedGraveNumber} />
            <Row label="Catatan Admin" value={data.adminNote || '-'} />
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
        <SectionTitle title="Dokumen Pendukung" color="#845ef7" />

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
          // Foto yang diinput user (baru dipilih ATAU sudah tersimpan) selalu ditampilkan
          const previewUri = newFile ? newFile.uri : existingUrl || null;
          const hasDoc = !!previewUri;

          return (
            <View key={label} style={styles.docItem}>
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
                          ? '#f59f00'
                          : hasDoc
                          ? '#12b886'
                          : '#c1c7d0',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.docStatusTxt,
                      hasDoc ? styles.docBadgeTxtAda : styles.docBadgeTxtTidak,
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
                  onPress={() => pickDoc(setter)}>
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

      {/* ══ TOMBOL AKSI ══ */}
      {canEdit && !editMode && (
        <TouchableOpacity
          style={styles.btnEdit}
          onPress={() => setEditMode(true)}>
          <Text style={styles.btnTxt}>Edit Data</Text>
        </TouchableOpacity>
      )}

      {editMode && (
        <>
          <TouchableOpacity
            style={styles.btnSave}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.btnTxt}>Menyimpan...</Text>
              </View>
            ) : (
              <Text style={styles.btnTxt}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={() => setEditMode(false)}
            disabled={saving}>
            <Text style={[styles.btnTxt, {color: '#5b6472'}]}>Batal</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f4f6fb'},
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6fb',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },
  statusDot: {width: 9, height: 9, borderRadius: 5, marginRight: 8},
  statusLabel: {fontWeight: '700', fontSize: 13.5},
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  cardAccent: {width: 4, height: 18, borderRadius: 2, marginRight: 8},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: '#1b1f27'},
  row: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9},
  rowLabel: {width: 130, color: '#8a92a2', fontSize: 12.5},
  rowValue: {flex: 1, color: '#1b1f27', fontSize: 13.5, fontWeight: '600'},
  divider: {height: 1, backgroundColor: '#eef0f4', marginVertical: 12},
  lokasiHeader: {
    fontWeight: '700',
    color: '#12b886',
    marginBottom: 10,
    fontSize: 13,
  },
  editLabel: {
    marginTop: 12,
    marginBottom: 5,
    color: '#5b6472',
    fontSize: 12.5,
    fontWeight: '500',
  },
  editInput: {
    backgroundColor: '#f8f9fb',
    padding: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e4e7ee',
    fontSize: 13.5,
    color: '#1b1f27',
  },
  jkRow: {flexDirection: 'row', gap: 8, marginTop: 4},
  jkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e4e7ee',
    backgroundColor: '#f8f9fb',
    alignItems: 'center',
  },
  jkBtnActive: {backgroundColor: '#2f6fed', borderColor: '#2f6fed'},
  jkTxt: {color: '#5b6472', fontWeight: '500', fontSize: 13.5},
  jkTxtActive: {color: '#fff', fontWeight: '700'},
  btnEdit: {
    backgroundColor: '#2f6fed',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnSave: {
    backgroundColor: '#12b886',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  btnCancel: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e7ee',
    marginBottom: 10,
  },
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
    color: '#2f6fed',
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
    borderColor: '#2f6fed',
    alignItems: 'center',
  },
  docGantiBtnUpdate: {
    backgroundColor: '#fff8e6',
    borderColor: '#f59f00',
  },
  docGantiBtnTxt: {fontSize: 13, fontWeight: '600', color: '#2f6fed'},
  btnTxt: {color: '#fff', fontWeight: '700', fontSize: 15},
});
