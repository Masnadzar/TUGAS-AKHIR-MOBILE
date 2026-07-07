// src/user/UserBurialForm.js
import React, {useState} from 'react';
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

export default function UserBurialFormScreen({navigation}) {
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
  const [nikAhliWaris, setNikAhliWaris] = useState(''); // ← BARU
  const [noTelepon, setNoTelepon] = useState(''); // ← BARU
  const [hubungan, setHubungan] = useState(''); // ← BARU
  const [tglLahirWaris, setTglLahirWaris] = useState('');
  const [alamat, setAlamat] = useState('');

  // ── State: Data Pemakaman ───────────────────────────────────────
  const [burialDate, setBurialDate] = useState('');
  const [notes, setNotes] = useState('');

  // ── State: Dokumen ──────────────────────────────────────────────
  const [dokKTP, setDokKTP] = useState(null);
  const [dokKK, setDokKK] = useState(null);
  const [dokAkte, setDokAkte] = useState(null);
  const [dokSuratKematian, setDokSuratKematian] = useState(null);
  const [dokSuratMedis, setDokSuratMedis] = useState(null);

  // ── State: Loading ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

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

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validasi satu per satu agar pesan error spesifik
    if (!deceasedName.trim())
      return Alert.alert('Validasi', 'Nama jenazah wajib diisi.');
    if (!nikJenazah.trim())
      return Alert.alert('Validasi', 'NIK jenazah wajib diisi.');
    if (!/^\d{16}$/.test(nikJenazah.trim()))
      return Alert.alert('Validasi', 'NIK jenazah harus tepat 16 digit angka.');
    if (!binBinti.trim())
      return Alert.alert('Validasi', 'Bin/Binti wajib diisi.');
    if (!agama.trim()) return Alert.alert('Validasi', 'Agama wajib diisi.');
    if (!tglLahirJenazah.trim())
      return Alert.alert('Validasi', 'Tanggal lahir jenazah wajib diisi.');
    if (!/^\d{2}-\d{2}-\d{4}$/.test(tglLahirJenazah))
      return Alert.alert(
        'Validasi',
        'Format Tgl Lahir: DD-MM-YYYY\nContoh: 10-05-1945',
      );
    if (!tglWafat.trim())
      return Alert.alert('Validasi', 'Tanggal wafat wajib diisi.');
    if (!/^\d{2}-\d{2}-\d{4}$/.test(tglWafat))
      return Alert.alert(
        'Validasi',
        'Format Tgl Wafat: DD-MM-YYYY\nContoh: 05-12-2025',
      );
    if (!penyebabKematian.trim())
      return Alert.alert('Validasi', 'Penyebab kematian wajib diisi.');

    // Validasi data ahli waris
    if (!heirName.trim())
      return Alert.alert('Validasi', 'Nama ahli waris wajib diisi.');
    if (!nikAhliWaris.trim())
      return Alert.alert('Validasi', 'NIK ahli waris wajib diisi.');
    if (!/^\d{16}$/.test(nikAhliWaris.trim()))
      return Alert.alert(
        'Validasi',
        'NIK ahli waris harus tepat 16 digit angka.',
      );
    if (!noTelepon.trim())
      return Alert.alert('Validasi', 'No. telepon ahli waris wajib diisi.');
    if (!/^\d{10,13}$/.test(noTelepon.trim()))
      return Alert.alert(
        'Validasi',
        'No. telepon harus 10-13 digit angka.\nContoh: 08123456789',
      );
    if (!hubungan.trim())
      return Alert.alert('Validasi', 'Hubungan dengan jenazah wajib diisi.');
    if (!/^\d{2}-\d{2}-\d{4}$/.test(tglLahirWaris))
      return Alert.alert(
        'Validasi',
        'Format Tgl Lahir: DD-MM-YYYY\nContoh: 10-05-1945',
      );
    if (!alamat.trim()) return Alert.alert('Validasi', 'Alamat Saat ini.');

    // Validasi tanggal pemakaman
    if (!burialDate.trim())
      return Alert.alert('Validasi', 'Tanggal pemakaman wajib diisi.');
    if (!/^\d{2}-\d{2}-\d{4}$/.test(burialDate))
      return Alert.alert(
        'Validasi',
        'Format Tgl Pemakaman: DD-MM-YYYY\nContoh: 06-12-2025',
      );

    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Auth', 'Silakan login terlebih dahulu.');
      navigation.navigate('Login');
      return;
    }

    try {
      setLoading(true);

      // STEP 1: Upload dokumen ke Cloudinary
      setUploadProgress('Mengupload dokumen...');
      const [urlKTP, urlKK, urlAkte, urlSuratKematian, urlSuratMedis] =
        await Promise.all([
          uploadToCloudinary(dokKTP, 'ktp'),
          uploadToCloudinary(dokKK, 'kk'),
          uploadToCloudinary(dokAkte, 'akte'),
          uploadToCloudinary(dokSuratKematian, 'surat_kematian'),
          uploadToCloudinary(dokSuratMedis, 'surat_medis'),
        ]);

      // STEP 2: Simpan ke Firestore collection 'burials'
      setUploadProgress('Menyimpan data...');
      await firestore()
        .collection('burials')
        .add({
          // ── Data Jenazah ──────────────────────────────
          deceasedName: deceasedName.trim(), // String
          nikJenazah: nikJenazah.trim(), // String (16 digit)
          binBinti: binBinti.trim(), // String
          jenisKelamin: jenisKelamin, // String: "Laki-laki"/"Perempuan"
          agama: agama.trim(), // String
          tglLahirJenazah: tglLahirJenazah.trim(), // String "DD-MM-YYYY"
          tglWafat: tglWafat.trim(), // String "DD-MM-YYYY"
          penyebabKematian: penyebabKematian.trim(), // String

          // ── Data Ahli Waris ───────────────────────────
          heirName: heirName.trim(), // String
          nikAhliWaris: nikAhliWaris.trim(), // String (16 digit) ← BARU
          noTelepon: noTelepon.trim(), // String ← BARU
          hubungan: hubungan.trim(), // String ← BARU
          tglLahirWaris: tglLahirWaris.trim(),
          alamat: alamat.trim(),

          // ── Data Pemakaman ────────────────────────────
          burialDate: burialDate.trim(), // String "DD-MM-YYYY"
          notes: notes.trim(), // String (boleh kosong)

          // ── Dokumen (URL Cloudinary / null) ───────────
          dokKTP: urlKTP || null, // String URL / null
          dokKK: urlKK || null, // String URL / null
          dokAkte: urlKK || null, // String URL / null
          dokSuratKematian: urlSuratKematian || null, // String URL / null
          dokSuratMedis: urlSuratMedis || null, // String URL / null

          // ── Metadata & Status ─────────────────────────
          createdBy: user.uid, // String (UID Firebase Auth)
          createdAt: firestore.FieldValue.serverTimestamp(), // Timestamp
          status: 'pending', // String: "pending"/"verified"/"rejected"
          assignedBlock: null, // String / null → diisi admin
          assignedGraveNumber: null, // String / null → diisi admin
          adminNote: null, // String / null → diisi admin
          verifiedBy: null, // String / null → UID admin
          verifiedAt: null, // Timestamp / null
        });

      Alert.alert(
        'Sukses',
        'Data pemakaman berhasil dikirim!\nTunggu verifikasi admin.',
      );

      // Reset semua state
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

      navigation.navigate('UserBurialList');
    } catch (err) {
      console.log('[UserBurialForm] err', err);
      Alert.alert('Error', 'Gagal mengirim data: ' + err.message);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
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
  const DocBtn = ({label, file, onPress}) => (
    <TouchableOpacity style={styles.docBtn} onPress={onPress}>
      <Text style={styles.docBtnTxt}>
        {file ? `✅  ${file.name}` : `📎  Pilih ${label}`}
      </Text>
    </TouchableOpacity>
  );

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{padding: 16, paddingBottom: 50}}>
      <Text style={styles.pageTitle}>Daftarkan Jenazah</Text>

      {/* ════════════════════════════════════════
          SECTION 1 — DATA JENAZAH
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Data Jenazah</Text>

        <Text style={styles.label}>Nama Jenazah *</Text>
        <TextInput
          style={styles.input}
          value={deceasedName}
          onChangeText={setDeceasedName}
          placeholder="Nama lengkap jenazah"
        />

        <Text style={styles.label}>NIK Jenazah * (16 digit)</Text>
        <TextInput
          style={styles.input}
          value={nikJenazah}
          onChangeText={setNikJenazah}
          placeholder="Contoh: 3175010101900001"
          keyboardType="number-pad"
          maxLength={16}
        />

        <Text style={styles.label}>Bin / Binti *</Text>
        <TextInput
          style={styles.input}
          value={binBinti}
          onChangeText={setBinBinti}
          placeholder="cth: bin Ahmad  /  binti Siti"
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
        />

        <Text style={styles.label}>Tanggal Lahir Jenazah * (DD-MM-YYYY)</Text>
        <TextInput
          style={styles.input}
          value={tglLahirJenazah}
          onChangeText={t => formatTanggal(t, setTglLahirJenazah)}
          placeholder="Contoh: 10-05-1945"
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Tanggal Wafat * (DD-MM-YYYY)</Text>
        <TextInput
          style={styles.input}
          value={tglWafat}
          onChangeText={t => formatTanggal(t, setTglWafat)}
          placeholder="Contoh: 05-12-2025"
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Penyebab Kematian *</Text>
        <TextInput
          style={styles.input}
          value={penyebabKematian}
          onChangeText={setPenyebabKematian}
          placeholder="Contoh: Sakit jantung"
        />
      </View>

      {/* ════════════════════════════════════════
          SECTION 2 — DATA AHLI WARIS
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Data Ahli Waris</Text>

        <Text style={styles.label}>Nama Ahli Waris *</Text>
        <TextInput
          style={styles.input}
          value={heirName}
          onChangeText={setHeirName}
          placeholder="Nama lengkap ahli waris"
        />

        <Text style={styles.label}>NIK Ahli Waris * (16 digit)</Text>
        <TextInput
          style={styles.input}
          value={nikAhliWaris}
          onChangeText={setNikAhliWaris}
          placeholder="Contoh: 3175010101900002"
          keyboardType="number-pad"
          maxLength={16}
        />

        <Text style={styles.label}>No. Telepon Ahli Waris *</Text>
        <TextInput
          style={styles.input}
          value={noTelepon}
          onChangeText={setNoTelepon}
          placeholder="Contoh: 08123456789"
          keyboardType="phone-pad"
          maxLength={13}
        />

        <Text style={styles.label}>Hubungan dengan Jenazah *</Text>
        <TextInput
          style={styles.input}
          value={hubungan}
          onChangeText={setHubungan}
          placeholder="cth: Anak, Suami, Istri, Saudara"
        />

        <Text style={styles.label}>
          Tanggal Lahir Ahli Waris * (DD-MM-YYYY)
        </Text>
        <TextInput
          style={styles.input}
          value={tglLahirWaris}
          onChangeText={t => formatTanggal(t, setTglLahirWaris)}
          placeholder="Contoh: 10-05-2021"
          keyboardType="number-pad"
          maxLength={10}
        />
        <Text style={styles.label}>Alamat *</Text>
        <TextInput
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
          value={alamat}
          onChangeText={setAlamat}
          placeholder="Alamat Saat ini"
          multiline
        />
      </View>

      {/* ════════════════════════════════════════
          SECTION 3 — DATA PEMAKAMAN
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🕌 Data Pemakaman</Text>

        <Text style={styles.label}>Tanggal Pemakaman * (DD-MM-YYYY)</Text>
        <TextInput
          style={styles.input}
          value={burialDate}
          onChangeText={t => formatTanggal(t, setBurialDate)}
          placeholder="Contoh: 06-12-2025"
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Catatan (opsional)</Text>
        <TextInput
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Catatan / patokan lokasi"
          multiline
        />
      </View>

      {/* ════════════════════════════════════════
          SECTION 4 — UPLOAD DOKUMEN
      ════════════════════════════════════════ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📎 Dokumen Pendukung</Text>
        <Text style={styles.docNote}>
          Format: JPG / PNG • Foto dari galeri HP
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
          TOMBOL SUBMIT
      ════════════════════════════════════════ */}
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
          <Text style={styles.submitTxt}>Kirim Data Pemakaman</Text>
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
    marginVertical: 16,
    color: '#303030',
  },
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
    color: '#1e90ff',
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
  docBtn: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#1e90ff',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  docBtnTxt: {color: '#1e90ff', fontSize: 13},
  docNote: {color: '#888', fontSize: 11, marginBottom: 8},
  submitBtn: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    marginTop: 4,
  },
  submitTxt: {color: '#fff', fontWeight: 'bold', fontSize: 15},
});
