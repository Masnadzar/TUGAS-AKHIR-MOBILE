import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {launchImageLibrary} from 'react-native-image-picker';
import {
  validateTglLahir,
  validateTglWafat,
  validateBurialDate,
  batasKalenderTglLahir,
  batasKalenderTglWafat,
  batasKalenderBurialDate,
  MAKS_HARI_PEMAKAMAN_SETELAH_WAFAT,
} from '../utils/dateValidation';
import DatePickerField from '../components/DatePickerField';

const CLOUD_NAME = 'dq59p6llb';
const UPLOAD_PRESET = 'burial_upload';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const uploadToCloudinary = async (fileObj, folder) => {
  if (!fileObj) return null;
  // fileObj may already be an existing remote URL (string) if user didn't change it
  if (typeof fileObj === 'string') return fileObj;
  const formData = new FormData();
  formData.append('file', {
    uri: fileObj.uri,
    type: fileObj.type || 'image/jpeg',
    name: fileObj.name || 'upload.jpg',
  });
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `burial_documents/${folder}`);
  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
    headers: {Accept: 'application/json'},
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudinary error (${folder}): ${errText}`);
  }
  const json = await response.json();
  return json.secure_url;
};

// route.params?.burialId → jika ada, form berjalan dalam mode EDIT (Update)
export default function UserBurialFormScreen({navigation, route}) {
  const burialId = route?.params?.burialId || null;
  const isEditMode = !!burialId;

  // ── State: Data Jenazah ─────────────────────────────────────────
  const [deceasedName, setDeceasedName] = useState('');
  const [nikJenazah, setNikJenazah] = useState('');
  const [binBinti, setBinBinti] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('Laki-laki');
  const [agama, setAgama] = useState('Islam');
  const [tglLahirJenazah, setTglLahirJenazah] = useState('');
  const [tglWafat, setTglWafat] = useState('');
  const [penyebabKematian, setPenyebabKematian] = useState('');

  // ── State: Data Ahli Waris ──────────────────────────────────────
  const [heirName, setHeirName] = useState('');
  const [nikAhliWaris, setNikAhliWaris] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [hubungan, setHubungan] = useState('');
  const [tglLahirWaris, setTglLahirWaris] = useState('');
  const [alamat, setAlamat] = useState('');

  // ── State: Data Pemakaman ───────────────────────────────────────
  const [burialDate, setBurialDate] = useState('');
  const [notes, setNotes] = useState('');

  // ── State: Dokumen (bisa berupa object baru {uri,name,type} ATAU string URL lama) ──
  const [dokKTP, setDokKTP] = useState(null);
  const [dokKK, setDokKK] = useState(null);
  const [dokAkte, setDokAkte] = useState(null);
  const [dokSuratKematian, setDokSuratKematian] = useState(null);
  const [dokSuratMedis, setDokSuratMedis] = useState(null);

  // ── State: Status (khusus mode edit) ─────────────────────────────
  const [status, setStatus] = useState('pending');

  // ── State: Loading ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [uploadProgress, setUploadProgress] = useState('');

  // ── READ: ambil data existing saat mode edit ────────────────────
  const loadExistingData = useCallback(async () => {
    if (!burialId) return;
    try {
      setFetching(true);
      const doc = await firestore().collection('burials').doc(burialId).get();
      if (!doc.exists) {
        Alert.alert('Tidak ditemukan', 'Data pemakaman tidak ditemukan.');
        navigation.goBack();
        return;
      }
      const d = doc.data();
      setDeceasedName(d.deceasedName || '');
      setNikJenazah(d.nikJenazah || '');
      setBinBinti(d.binBinti || '');
      setJenisKelamin(d.jenisKelamin || 'Laki-laki');
      setAgama(d.agama || 'Islam');
      setTglLahirJenazah(d.tglLahirJenazah || '');
      setTglWafat(d.tglWafat || '');
      setPenyebabKematian(d.penyebabKematian || '');
      setHeirName(d.heirName || '');
      setNikAhliWaris(d.nikAhliWaris || '');
      setNoTelepon(d.noTelepon || '');
      setHubungan(d.hubungan || '');
      setTglLahirWaris(d.tglLahirWaris || '');
      setAlamat(d.alamat || '');
      setBurialDate(d.burialDate || '');
      setNotes(d.notes || '');
      setDokKTP(d.dokKTP || null);
      setDokKK(d.dokKK || null);
      setDokAkte(d.dokAkte || null);
      setDokSuratKematian(d.dokSuratKematian || null);
      setDokSuratMedis(d.dokSuratMedis || null);
      setStatus(d.status || 'pending');
    } catch (err) {
      console.log('[UserBurialForm] load err', err);
      Alert.alert('Error', 'Gagal memuat data: ' + err.message);
    } finally {
      setFetching(false);
    }
  }, [burialId, navigation]);

  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // ── Auto-format tanggal DD-MM-YYYY saat ketik ───────────────────
  const formatTanggal = (text, setter) => {
    let val = text.replace(/[^0-9]/g, '');
    if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    setter(val.slice(0, 10));
  };

  // ── Pilih foto dari galeri HP ───────────────────────────────────
  const pickDoc = setter => {
    launchImageLibrary(
      {mediaType: 'photo', includeBase64: false, quality: 0.8},
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', 'Gagal memilih file: ' + response.errorMessage);
          return;
        }
        const asset = response.assets?.[0];
        if (asset) {
          setter({
            uri: asset.uri,
            name: asset.fileName || 'upload.jpg',
            type: asset.type || 'image/jpeg',
          });
        }
      },
    );
  };

  const validateAll = () => {
    if (!deceasedName.trim()) return 'Nama jenazah wajib diisi.';
    if (!nikJenazah.trim()) return 'NIK jenazah wajib diisi.';
    if (!/^\d{16}$/.test(nikJenazah.trim()))
      return 'NIK jenazah harus tepat 16 digit angka.';
    if (!binBinti.trim()) return 'Bin/Binti wajib diisi.';
    if (!agama.trim()) return 'Agama wajib diisi.';
    if (!tglLahirJenazah.trim()) return 'Tanggal lahir jenazah wajib diisi.';
    {
      const err = validateTglLahir(tglLahirJenazah);
      if (err) return err;
    }
    if (!tglWafat.trim()) return 'Tanggal wafat wajib diisi.';
    {
      const err = validateTglWafat(tglWafat);
      if (err) return err;
    }
    if (!penyebabKematian.trim()) return 'Penyebab kematian wajib diisi.';
    if (!heirName.trim()) return 'Nama ahli waris wajib diisi.';
    if (!nikAhliWaris.trim()) return 'NIK ahli waris wajib diisi.';
    if (!/^\d{16}$/.test(nikAhliWaris.trim()))
      return 'NIK ahli waris harus tepat 16 digit angka.';
    if (!noTelepon.trim()) return 'No. telepon ahli waris wajib diisi.';
    if (!/^\d{10,13}$/.test(noTelepon.trim()))
      return 'No. telepon harus 10-13 digit angka.\nContoh: 08123456789';
    if (!hubungan.trim()) return 'Hubungan dengan jenazah wajib diisi.';
    if (!/^\d{2}-\d{2}-\d{4}$/.test(tglLahirWaris))
      return 'Format Tgl Lahir: DD-MM-YYYY\nContoh: 10-05-1945';
    if (!alamat.trim()) return 'Alamat Saat ini wajib diisi.';
    if (!burialDate.trim()) return 'Tanggal pemakaman wajib diisi.';
    {
      const err = validateBurialDate(burialDate, tglWafat);
      if (err) return err;
    }
    return null;
  };

  const resetForm = () => {
    setDeceasedName('');
    setNikJenazah('');
    setBinBinti('');
    setJenisKelamin('Laki-laki');
    setAgama('Islam');
    setTglLahirJenazah('');
    setTglWafat('');
    setPenyebabKematian('');
    setHeirName('');
    setNikAhliWaris('');
    setNoTelepon('');
    setHubungan('');
    setTglLahirWaris('');
    setAlamat('');
    setBurialDate('');
    setNotes('');
    setDokKTP(null);
    setDokKK(null);
    setDokAkte(null);
    setDokSuratKematian(null);
    setDokSuratMedis(null);
  };

  // ── CREATE / UPDATE ──────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationError = validateAll();
    if (validationError) return Alert.alert('Validasi', validationError);

    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Auth', 'Silakan login terlebih dahulu.');
      navigation.navigate('Login');
      return;
    }

    try {
      setLoading(true);

      setUploadProgress('Mengupload dokumen...');
      const [urlKTP, urlKK, urlAkte, urlSuratKematian, urlSuratMedis] =
        await Promise.all([
          uploadToCloudinary(dokKTP, 'ktp'),
          uploadToCloudinary(dokKK, 'kk'),
          uploadToCloudinary(dokAkte, 'akte'),
          uploadToCloudinary(dokSuratKematian, 'surat_kematian'),
          uploadToCloudinary(dokSuratMedis, 'surat_medis'),
        ]);

      const payload = {
        deceasedName: deceasedName.trim(),
        nikJenazah: nikJenazah.trim(),
        binBinti: binBinti.trim(),
        jenisKelamin,
        agama: agama.trim(),
        tglLahirJenazah: tglLahirJenazah.trim(),
        tglWafat: tglWafat.trim(),
        penyebabKematian: penyebabKematian.trim(),

        heirName: heirName.trim(),
        nikAhliWaris: nikAhliWaris.trim(),
        noTelepon: noTelepon.trim(),
        hubungan: hubungan.trim(),
        tglLahirWaris: tglLahirWaris.trim(),
        alamat: alamat.trim(),

        burialDate: burialDate.trim(),
        notes: notes.trim(),

        dokKTP: urlKTP || null,
        dokKK: urlKK || null,
        dokAkte: urlAkte || null,
        dokSuratKematian: urlSuratKematian || null,
        dokSuratMedis: urlSuratMedis || null,
      };

      setUploadProgress('Menyimpan data...');

      if (isEditMode) {
        await firestore()
          .collection('burials')
          .doc(burialId)
          .update({
            ...payload,
            updatedAt: firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid,
            // status kembali ke pending setelah diedit agar admin verifikasi ulang
            status: 'pending',
          });
        Alert.alert('Sukses', 'Data pemakaman berhasil diperbarui.');
      } else {
        await firestore()
          .collection('burials')
          .add({
            ...payload,
            createdBy: user.uid,
            createdAt: firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            assignedBlock: null,
            assignedGraveNumber: null,
            adminNote: null,
            verifiedBy: null,
            verifiedAt: null,
          });
        Alert.alert(
          'Sukses',
          'Data pemakaman berhasil dikirim!\nTunggu verifikasi admin.',
        );
        resetForm();
      }

      navigation.navigate('Home');
    } catch (err) {
      console.log('[UserBurialForm] err', err);
      Alert.alert('Error', 'Gagal menyimpan data: ' + err.message);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  // ── DELETE ────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!isEditMode) return;
    Alert.alert(
      'Hapus Data',
      'Yakin ingin menghapus data pemakaman ini? Tindakan ini tidak dapat dibatalkan.',
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await firestore().collection('burials').doc(burialId).delete();
              Alert.alert('Terhapus', 'Data pemakaman telah dihapus.');
              navigation.navigate('Home');
            } catch (err) {
              Alert.alert('Error', 'Gagal menghapus data: ' + err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Tombol Jenis Kelamin ────────────────────────────────────────
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

  // ── Tombol Pilih Dokumen ────────────────────────────────────────
  const DocBtn = ({label, file, onPress}) => {
    const hasFile = !!file;
    const fileLabel =
      typeof file === 'string' ? 'Dokumen tersimpan' : file?.name;
    return (
      <TouchableOpacity
        style={[styles.docBtn, hasFile && styles.docBtnFilled]}
        onPress={onPress}>
        <View style={styles.docBtnRow}>
          <View style={[styles.docDot, hasFile && styles.docDotFilled]} />
          <Text style={[styles.docBtnTxt, hasFile && styles.docBtnTxtFilled]}>
            {hasFile ? fileLabel : `Pilih ${label}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const statusLabel =
    {
      pending: 'Menunggu Verifikasi',
      verified: 'Terverifikasi',
      rejected: 'Ditolak',
    }[status] || status;

  const statusStyle =
    {
      pending: styles.statusPending,
      verified: styles.statusVerified,
      rejected: styles.statusRejected,
    }[status] || styles.statusPending;

  if (fetching) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#2f6fed" />
        <Text style={styles.loadingScreenTxt}>Memuat data...</Text>
      </View>
    );
  }

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{padding: 16, paddingBottom: 50}}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>
          {isEditMode ? 'Edit Data Pemakaman' : 'Daftarkan Jenazah'}
        </Text>
        <Text style={styles.pageSubtitle}>
          {isEditMode
            ? 'Perbarui informasi yang telah dikirim sebelumnya'
            : 'Lengkapi data berikut untuk pengajuan pemakaman'}
        </Text>
        {isEditMode && (
          <View style={[styles.statusBadge, statusStyle]}>
            <Text style={styles.statusBadgeTxt}>{statusLabel}</Text>
          </View>
        )}
      </View>

      {/* ════════════════════════════════════════
          SECTION 1 — DATA JENAZAH
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardAccent, {backgroundColor: '#2f6fed'}]} />
          <Text style={styles.cardTitle}>Data Jenazah</Text>
        </View>

        <Text style={styles.label}>Nama Jenazah *</Text>
        <TextInput
          style={styles.input}
          value={deceasedName}
          onChangeText={setDeceasedName}
          placeholder="Nama lengkap jenazah"
          placeholderTextColor="#a3a9b7"
        />

        <Text style={styles.label}>NIK Jenazah * (16 digit)</Text>
        <TextInput
          style={styles.input}
          value={nikJenazah}
          onChangeText={setNikJenazah}
          placeholder="Contoh: 3175010101900001"
          placeholderTextColor="#a3a9b7"
          keyboardType="number-pad"
          maxLength={16}
        />

        <Text style={styles.label}>Bin / Binti *</Text>
        <TextInput
          style={styles.input}
          value={binBinti}
          onChangeText={setBinBinti}
          placeholder="cth: bin Ahmad  /  binti Siti"
          placeholderTextColor="#a3a9b7"
        />

        <Text style={styles.label}>Jenis Kelamin *</Text>
        <View style={styles.jkRow}>
          <JKButton label="Laki-laki" />
          <JKButton label="Perempuan" />
        </View>

        <Text style={styles.label}>Agama *</Text>
        <TextInput
          style={styles.input}
          value={agama}
          onChangeText={setAgama}
          placeholder="Agama jenazah"
          placeholderTextColor="#a3a9b7"
        />

        <DatePickerField
          label="Tanggal Lahir Jenazah *"
          value={tglLahirJenazah}
          onChange={setTglLahirJenazah}
          {...batasKalenderTglLahir()}
        />

        <DatePickerField
          label="Tanggal Wafat * (hanya boleh tahun ini)"
          value={tglWafat}
          onChange={setTglWafat}
          {...batasKalenderTglWafat()}
        />

        <Text style={styles.label}>Penyebab Kematian *</Text>
        <TextInput
          style={styles.input}
          value={penyebabKematian}
          onChangeText={setPenyebabKematian}
          placeholder="Contoh: Sakit jantung"
          placeholderTextColor="#a3a9b7"
        />
      </View>

      {/* ════════════════════════════════════════
          SECTION 2 — DATA AHLI WARIS
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardAccent, {backgroundColor: '#12b886'}]} />
          <Text style={styles.cardTitle}>Data Ahli Waris</Text>
        </View>

        <Text style={styles.label}>Nama Ahli Waris *</Text>
        <TextInput
          style={styles.input}
          value={heirName}
          onChangeText={setHeirName}
          placeholder="Nama lengkap ahli waris"
          placeholderTextColor="#a3a9b7"
        />

        <Text style={styles.label}>NIK Ahli Waris * (16 digit)</Text>
        <TextInput
          style={styles.input}
          value={nikAhliWaris}
          onChangeText={setNikAhliWaris}
          placeholder="Contoh: 3175010101900002"
          placeholderTextColor="#a3a9b7"
          keyboardType="number-pad"
          maxLength={16}
        />

        <Text style={styles.label}>No. Telepon Ahli Waris *</Text>
        <TextInput
          style={styles.input}
          value={noTelepon}
          onChangeText={setNoTelepon}
          placeholder="Contoh: 08123456789"
          placeholderTextColor="#a3a9b7"
          keyboardType="phone-pad"
          maxLength={13}
        />

        <Text style={styles.label}>Hubungan dengan Jenazah *</Text>
        <TextInput
          style={styles.input}
          value={hubungan}
          onChangeText={setHubungan}
          placeholder="cth: Anak, Suami, Istri, Saudara"
          placeholderTextColor="#a3a9b7"
        />

        <DatePickerField
          label="Tanggal Lahir Ahli Waris *"
          value={tglLahirWaris}
          onChange={setTglLahirWaris}
          {...batasKalenderTglLahir()}
        />
        <Text style={styles.label}>Alamat *</Text>
        <TextInput
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
          value={alamat}
          onChangeText={setAlamat}
          placeholder="Alamat saat ini"
          placeholderTextColor="#a3a9b7"
          multiline
        />
      </View>

      {/* ════════════════════════════════════════
          SECTION 3 — DATA PEMAKAMAN
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardAccent, {backgroundColor: '#f59f00'}]} />
          <Text style={styles.cardTitle}>Data Pemakaman</Text>
        </View>

        <DatePickerField
          label={`Tanggal Pemakaman * (maks. ${MAKS_HARI_PEMAKAMAN_SETELAH_WAFAT} hari setelah wafat)`}
          value={burialDate}
          onChange={setBurialDate}
          {...batasKalenderBurialDate(tglWafat)}
        />

        <Text style={styles.label}>Catatan (opsional)</Text>
        <TextInput
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Catatan / patokan lokasi"
          placeholderTextColor="#a3a9b7"
          multiline
        />
      </View>

      {/* ════════════════════════════════════════
          SECTION 4 — UPLOAD DOKUMEN
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardAccent, {backgroundColor: '#845ef7'}]} />
          <Text style={styles.cardTitle}>Dokumen Pendukung</Text>
        </View>
        <Text style={styles.docNote}>
          Format JPG/PNG, diambil dari galeri HP. Ketuk untuk mengganti file.
        </Text>

        <Text style={styles.label}>KTP Ahli Waris</Text>
        <DocBtn label="KTP" file={dokKTP} onPress={() => pickDoc(setDokKTP)} />

        <Text style={styles.label}>Kartu Keluarga (KK)</Text>
        <DocBtn label="KK" file={dokKK} onPress={() => pickDoc(setDokKK)} />

        <Text style={styles.label}>Akte</Text>
        <DocBtn
          label="Akte"
          file={dokAkte}
          onPress={() => pickDoc(setDokAkte)}
        />

        <Text style={styles.label}>Surat Kematian</Text>
        <DocBtn
          label="Surat Kematian"
          file={dokSuratKematian}
          onPress={() => pickDoc(setDokSuratKematian)}
        />

        <Text style={styles.label}>Surat Medis</Text>
        <DocBtn
          label="Surat Medis"
          file={dokSuratMedis}
          onPress={() => pickDoc(setDokSuratMedis)}
        />
      </View>

      {/* ════════════════════════════════════════
          TOMBOL AKSI — CREATE / UPDATE / DELETE
      ════════════════════════════════════════ */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={loading}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.submitTxt}>
              {uploadProgress || 'Memproses...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.submitTxt}>
            {isEditMode ? 'Simpan Perubahan' : 'Kirim Data Pemakaman'}
          </Text>
        )}
      </TouchableOpacity>

      {isEditMode && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          disabled={loading}>
          <Text style={styles.deleteBtnTxt}>Hapus Data</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f4f6fb'},
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f6fb',
  },
  loadingScreenTxt: {marginTop: 12, color: '#6b7280', fontSize: 13},
  header: {marginBottom: 18, marginTop: 8, paddingHorizontal: 2},
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b1f27',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeTxt: {fontSize: 11, fontWeight: '700', color: '#fff'},
  statusPending: {backgroundColor: '#f59f00'},
  statusVerified: {backgroundColor: '#12b886'},
  statusRejected: {backgroundColor: '#e03131'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 12},
  cardAccent: {width: 4, height: 18, borderRadius: 2, marginRight: 8},
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b1f27',
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
    color: '#5b6472',
    fontSize: 12.5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fb',
    padding: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#e4e7ee',
    color: '#1b1f27',
    fontSize: 14,
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
  docBtn: {
    backgroundColor: '#f8f9fb',
    borderWidth: 1,
    borderColor: '#dfe3ea',
    borderRadius: 9,
    padding: 12,
    marginTop: 4,
  },
  docBtnFilled: {
    backgroundColor: '#eefaf4',
    borderColor: '#12b886',
  },
  docBtnRow: {flexDirection: 'row', alignItems: 'center'},
  docDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c1c7d0',
    marginRight: 8,
  },
  docDotFilled: {backgroundColor: '#12b886'},
  docBtnTxt: {color: '#5b6472', fontSize: 13},
  docBtnTxtFilled: {color: '#0c8f68', fontWeight: '600'},
  docNote: {color: '#8a92a2', fontSize: 11, marginBottom: 4},
  submitBtn: {
    backgroundColor: '#2f6fed',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  loadingRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  submitTxt: {color: '#fff', fontWeight: '700', fontSize: 15},
  deleteBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e03131',
  },
  deleteBtnTxt: {color: '#e03131', fontWeight: '700', fontSize: 14},
});
