import React, {useState, useEffect} from 'react';
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

const formatTanggal = (text, setter) => {
  let val = text.replace(/[^0-9]/g, '');
  if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
  if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
  setter(val.slice(0, 10));
};

const DocBtn = ({label, file, onPress}) => (
  <TouchableOpacity style={styles.docBtn} onPress={onPress}>
    <Text style={styles.docBtnTxt}>
      {file ? `✓ ${file.name}` : `Pilih Foto ${label}`}
    </Text>
  </TouchableOpacity>
);

const Row = ({label, value}) => (
  <View style={{flexDirection: 'row', marginBottom: 6}}>
    <Text style={{width: 150, color: '#888', fontSize: 13}}>{label}</Text>
    <Text style={{flex: 1, color: '#303030', fontSize: 13, fontWeight: '500'}}>
      {value || '-'}
    </Text>
  </View>
);

export default function TumpanganFormScreen({route, navigation}) {
  const linkedBurialId = route.params?.linkedBurialId ?? null;

  const [linkedBurial, setLinkedBurial] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Data jenazah baru yang akan tumpang
  const [deceasedName, setDeceasedName] = useState('');
  const [nikJenazah, setNikJenazah] = useState('');
  const [binBinti, setBinBinti] = useState('');
  const [agama, setAgama] = useState('Islam');
  const [tglLahirJenazah, setTglLahirJenazah] = useState('');
  const [tglWafat, setTglWafat] = useState('');
  const [burialDate, setBurialDate] = useState('');
  const [notes, setNotes] = useState('');

  // Ahli waris (diisi via prefill setelah data lama berhasil dimuat)
  const [heirName, setHeirName] = useState('');
  const [nikAhliWaris, setNikAhliWaris] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [alamat, setAlamat] = useState('');

  // Dokumen
  const [dokKTP, setDokKTP] = useState(null);
  const [dokKK, setDokKK] = useState(null);
  const [dokAkte, setDokAkte] = useState(null);
  const [dokSuratKematian, setDokSuratKematian] = useState(null);
  const [dokSuratMedis, setDokSuratMedis] = useState(null); // ← BARU: surat medis
  const [dokIPTMLama, setDokIPTMLama] = useState(null); // ← khusus tumpangan

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Ambil data pemakaman TERBARU dari Firestore by ID, lalu prefill ahli waris.
  useEffect(() => {
    let active = true;
    const fetchLinked = async () => {
      if (!linkedBurialId) {
        setLoadingData(false);
        return;
      }
      setLoadingData(true);
      setLoadError(null);
      try {
        const doc = await firestore()
          .collection('burials')
          .doc(linkedBurialId)
          .get();
        if (!active) return;
        if (doc.exists) {
          const data = {id: doc.id, ...doc.data()};
          setLinkedBurial(data);
          setHeirName(data.heirName || '');
          setNikAhliWaris(data.nikAhliWaris || '');
          setNoTelepon(data.noTelepon || '');
          setAlamat(data.alamat || '');
        } else {
          setLoadError(
            'Data pemakaman tidak ditemukan (mungkin sudah dihapus).',
          );
        }
      } catch (e) {
        console.log('[TumpanganForm] fetch error:', e);
        if (active) setLoadError(e?.message || 'Gagal memuat data pemakaman.');
      } finally {
        if (active) setLoadingData(false);
      }
    };
    fetchLinked();
    return () => {
      active = false;
    };
  }, [linkedBurialId]);

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

  const handleSubmit = async () => {
    if (loadingData) {
      return Alert.alert('Mohon tunggu', 'Data sedang dimuat.');
    }
    if (!deceasedName.trim())
      return Alert.alert('Validasi', 'Nama jenazah wajib diisi.');
    if (!/^\d{16}$/.test(nikJenazah.trim()))
      return Alert.alert('Validasi', 'NIK jenazah harus tepat 16 digit angka.');
    if (!binBinti.trim())
      return Alert.alert('Validasi', 'Bin/Binti wajib diisi.');
    {
      const err = validateTglLahir(tglLahirJenazah);
      if (err) return Alert.alert('Validasi', err);
    }
    {
      const err = validateTglWafat(tglWafat);
      if (err) return Alert.alert('Validasi', err);
    }
    {
      const err = validateBurialDate(burialDate, tglWafat);
      if (err) return Alert.alert('Validasi', err);
    }
    if (!heirName.trim())
      return Alert.alert('Validasi', 'Nama ahli waris wajib diisi.');
    if (!/^\d{16}$/.test(nikAhliWaris.trim()))
      return Alert.alert(
        'Validasi',
        'NIK ahli waris harus tepat 16 digit angka.',
      );
    if (!/^\d{10,13}$/.test(noTelepon.trim()))
      return Alert.alert('Validasi', 'No. telepon harus 10-13 digit angka.');
    if (!alamat.trim()) return Alert.alert('Validasi', 'Alamat wajib diisi.');
    if (!dokIPTMLama)
      return Alert.alert(
        'Validasi',
        'Dokumen IPTM terdahulu wajib diupload untuk pengajuan tumpangan.',
      );

    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Auth', 'Silakan login terlebih dahulu.');
      navigation.navigate('Login');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress('Mengupload dokumen...');
      const [
        urlKTP,
        urlKK,
        urlAkte,
        urlSuratKematian,
        urlSuratMedis,
        urlIPTMLama,
      ] = await Promise.all([
        uploadToCloudinary(dokKTP, 'ktp_tumpangan'),
        uploadToCloudinary(dokKK, 'kk_tumpangan'),
        uploadToCloudinary(dokAkte, 'akte_tumpangan'),
        uploadToCloudinary(dokSuratKematian, 'surat_kematian_tumpangan'),
        uploadToCloudinary(dokSuratMedis, 'surat_medis_tumpangan'),
        uploadToCloudinary(dokIPTMLama, 'iptm_tumpangan'),
      ]);

      setUploadProgress('Menyimpan data...');
      await firestore()
        .collection('tumpangan')
        .add({
          // ── Referensi makam lama (jika ada) ────────────
          linkedBurialId: linkedBurial?.id || null,
          assignedBlockLama: linkedBurial?.assignedBlock || null,
          assignedGraveNumberLama: linkedBurial?.assignedGraveNumber || null,

          // ── Data jenazah baru ──────────────────────────
          deceasedName: deceasedName.trim(),
          nikJenazah: nikJenazah.trim(),
          binBinti: binBinti.trim(),
          agama: agama.trim(),
          tglLahirJenazah: tglLahirJenazah.trim(),
          tglWafat: tglWafat.trim(),
          burialDate: burialDate.trim(),
          notes: notes.trim(),

          // ── Ahli waris ──────────────────────────────────
          heirName: heirName.trim(),
          nikAhliWaris: nikAhliWaris.trim(),
          noTelepon: noTelepon.trim(),
          alamat: alamat.trim(),

          // ── Dokumen ─────────────────────────────────────
          dokKTP: urlKTP || null,
          dokKK: urlKK || null,
          dokAkte: urlAkte || null,
          dokSuratKematian: urlSuratKematian || null,
          dokSuratMedis: urlSuratMedis || null,
          dokIPTMLama: urlIPTMLama || null,

          // ── Metadata & status ───────────────────────────
          createdBy: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          status: 'pending',
          assignedBlock: null,
          assignedGraveNumber: null,
        });

      Alert.alert('Sukses', 'Pengajuan ijin tumpang berhasil dikirim.');
      navigation.goBack();
    } catch (error) {
      console.log('[Tumpangan] error:', error);
      Alert.alert('Error', error.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.pageTitle}>Ijin Tumpang Makam</Text>

      {loadingData && (
        <View style={styles.linkBanner}>
          <ActivityIndicator color="#2ed573" size="small" />
        </View>
      )}
      {!loadingData && loadError && (
        <View style={[styles.linkBanner, {backgroundColor: '#fff0f0'}]}>
          <Text style={[styles.linkBannerTxt, {color: '#e74c3c'}]}>
            {loadError}
          </Text>
        </View>
      )}
      {!loadingData && !loadError && linkedBurial && (
        <View style={styles.linkBanner}>
          <Text style={styles.linkBannerTxt}>
            Terhubung dengan makam: {linkedBurial.deceasedName} (Blok{' '}
            {linkedBurial.assignedBlock || '-'})
          </Text>
        </View>
      )}

      {/* ── Referensi data jenazah yang SUDAH ADA di makam ini ──
          (bukan data jenazah baru yang akan tumpang -- itu diisi
          di form di bawah). Ditampilkan agar ahli waris bisa
          memastikan makam yang dituju benar. ── */}
      {!loadingData && !loadError && linkedBurial && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Data Jenazah Terdahulu di Makam Ini
          </Text>
          <Row label="Nama" value={linkedBurial.deceasedName} />
          <Row label="Bin/Binti" value={linkedBurial.binBinti} />
          <Row
            label="Hubungan dengan Ahli Waris"
            value={linkedBurial.hubungan}
          />
          <Row label="Tanggal Lahir" value={linkedBurial.tglLahirJenazah} />
          <Row label="Tanggal Wafat" value={linkedBurial.tglWafat} />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚰️ Data Jenazah</Text>
        <Text style={styles.label}>Nama Jenazah *</Text>
        <TextInput
          style={styles.input}
          value={deceasedName}
          onChangeText={setDeceasedName}
        />
        <Text style={styles.label}>NIK Jenazah * (16 digit)</Text>
        <TextInput
          style={styles.input}
          value={nikJenazah}
          onChangeText={setNikJenazah}
          keyboardType="number-pad"
          maxLength={16}
        />
        <Text style={styles.label}>Bin/Binti *</Text>
        <TextInput
          style={styles.input}
          value={binBinti}
          onChangeText={setBinBinti}
        />
        <DatePickerField
          label="Tanggal Lahir *"
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
        <DatePickerField
          label={`Tanggal Pemakaman * (maks. ${MAKS_HARI_PEMAKAMAN_SETELAH_WAFAT} hari setelah wafat)`}
          value={burialDate}
          onChange={setBurialDate}
          {...batasKalenderBurialDate(tglWafat)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Data Ahli Waris</Text>
        <Text style={styles.label}>Nama Ahli Waris *</Text>
        <TextInput
          style={styles.input}
          value={heirName}
          onChangeText={setHeirName}
        />
        <Text style={styles.label}>NIK Ahli Waris * (16 digit)</Text>
        <TextInput
          style={styles.input}
          value={nikAhliWaris}
          onChangeText={setNikAhliWaris}
          keyboardType="number-pad"
          maxLength={16}
        />
        <Text style={styles.label}>No. Telepon *</Text>
        <TextInput
          style={styles.input}
          value={noTelepon}
          onChangeText={setNoTelepon}
          keyboardType="phone-pad"
          maxLength={13}
        />
        <Text style={styles.label}>Alamat *</Text>
        <TextInput
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
          value={alamat}
          onChangeText={setAlamat}
          multiline
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📎 Dokumen Pendukung</Text>
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

        <Text style={[styles.label, {color: '#2ed573', fontWeight: 'bold'}]}>
          IPTM Terdahulu * (wajib untuk tumpangan)
        </Text>
        <DocBtn
          label="IPTM Lama"
          file={dokIPTMLama}
          onPress={() => pickDoc(setDokIPTMLama)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Catatan</Text>
        <Text style={styles.label}>Catatan Tambahan (opsional)</Text>
        <TextInput
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Catatan tambahan untuk petugas"
          multiline
        />
      </View>

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={loading}>
        {loading ? (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.submitTxt}>
              {uploadProgress || 'Memproses...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.submitTxt}>Kirim Pengajuan Tumpangan</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#303030',
  },
  linkBanner: {
    backgroundColor: '#e8fff0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  linkBannerTxt: {color: '#2ed573', fontSize: 12, fontWeight: '600'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2ed573',
    marginBottom: 10,
  },
  label: {marginTop: 10, marginBottom: 4, color: '#555', fontSize: 13},
  input: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  docBtn: {
    backgroundColor: '#f0fff5',
    borderWidth: 1,
    borderColor: '#2ed573',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  docBtnTxt: {color: '#2ed573', fontSize: 13},
  submitBtn: {
    backgroundColor: '#2ed573',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    marginTop: 4,
    marginBottom: 30,
  },
  submitTxt: {color: '#fff', fontWeight: 'bold', fontSize: 15},
});
