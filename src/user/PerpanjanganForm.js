// src/user/PerpanjanganForm.js
// Perpanjangan sewa makam: pakai ulang data lama, tambah upload IPTM + KTP ahli waris.
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
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

const DocBtn = ({label, file, onPress}) => (
  <TouchableOpacity style={styles.docBtn} onPress={onPress}>
    <Text style={styles.docBtnTxt}>
      {file ? `✓ ${file.name}` : `Pilih Foto ${label}`}
    </Text>
  </TouchableOpacity>
);

export default function PerpanjanganFormScreen({route, navigation}) {
  const linkedBurialId = route.params?.linkedBurialId ?? null;

  const [linkedBurial, setLinkedBurial] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [dokIPTM, setDokIPTM] = useState(null);
  const [dokKTPWaris, setDokKTPWaris] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Ambil data pemakaman TERBARU langsung dari Firestore (bukan data statis
  // yang dikirim lewat navigasi), supaya selalu tersambung & ter-update
  // walau data di 'burials' berubah (misalnya diverifikasi/diedit admin).
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
          setLinkedBurial({id: doc.id, ...doc.data()});
        } else {
          setLoadError(
            'Data pemakaman tidak ditemukan (mungkin sudah dihapus).',
          );
        }
      } catch (e) {
        console.log('[PerpanjanganForm] fetch error:', e);
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
      return Alert.alert('Mohon tunggu', 'Data pemakaman masih dimuat.');
    }
    if (!linkedBurial) {
      return Alert.alert(
        'Data tidak ditemukan',
        'Anda belum memiliki data pemakaman terdaftar untuk diperpanjang. Silakan daftar Makam Baru terlebih dahulu.',
      );
    }
    if (!dokIPTM)
      return Alert.alert('Validasi', 'Dokumen IPTM wajib diupload.');
    if (!dokKTPWaris)
      return Alert.alert('Validasi', 'KTP Ahli Waris wajib diupload.');

    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Auth', 'Silakan login terlebih dahulu.');
      navigation.navigate('Login');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress('Mengupload dokumen...');
      const [urlIPTM, urlKTPWaris] = await Promise.all([
        uploadToCloudinary(dokIPTM, 'iptm_perpanjangan'),
        uploadToCloudinary(dokKTPWaris, 'ktp_perpanjangan'),
      ]);

      setUploadProgress('Menyimpan data...');
      await firestore()
        .collection('perpanjangan')
        .add({
          // ── Referensi data pemakaman lama ─────────────
          burialId: linkedBurial.id,
          deceasedName: linkedBurial.deceasedName || null,
          nikJenazah: linkedBurial.nikJenazah || null,
          heirName: linkedBurial.heirName || null,
          nikAhliWaris: linkedBurial.nikAhliWaris || null,
          noTelepon: linkedBurial.noTelepon || null,
          alamat: linkedBurial.alamat || null,
          assignedBlock: linkedBurial.assignedBlock || null,
          assignedGraveNumber: linkedBurial.assignedGraveNumber || null,
          burialDateAsal: linkedBurial.burialDate || null,

          // ── Dokumen baru untuk perpanjangan ────────────
          dokIPTM: urlIPTM || null,
          dokKTPWaris: urlKTPWaris || null,
          notes: notes.trim(),

          // ── Metadata & status ──────────────────────────
          createdBy: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          status: 'pending', // pending / verified / rejected
        });

      Alert.alert('Sukses', 'Pengajuan perpanjangan sewa berhasil dikirim.');
      navigation.goBack();
    } catch (error) {
      console.log('[Perpanjangan] error:', error);
      Alert.alert('Error', error.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.pageTitle}>Perpanjangan Sewa Makam</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Data Terdaftar</Text>
        {loadingData ? (
          <ActivityIndicator color="#ff9f1a" />
        ) : loadError ? (
          <Text style={{color: '#e74c3c'}}>{loadError}</Text>
        ) : linkedBurial ? (
          <>
            <Row label="Nama Jenazah" value={linkedBurial.deceasedName} />
            <Row label="Ahli Waris" value={linkedBurial.heirName} />
            <Row
              label="Blok / No. Makam"
              value={`${linkedBurial.assignedBlock || '-'} / ${
                linkedBurial.assignedGraveNumber || '-'
              }`}
            />
            <Row label="Tanggal Pemakaman" value={linkedBurial.burialDate} />
          </>
        ) : (
          <Text style={{color: '#e74c3c'}}>
            Tidak ada data pemakaman yang bisa dihubungkan.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📎 Dokumen Perpanjangan</Text>
        <Text style={styles.docNote}>
          Hanya perlu upload 2 dokumen berikut untuk perpanjangan.
        </Text>

        <Text style={styles.label}>IPTM (Ijin Pemakaian Tanah Makam)</Text>
        <DocBtn
          label="IPTM"
          file={dokIPTM}
          onPress={() => pickDoc(setDokIPTM)}
        />

        <Text style={styles.label}>KTP Ahli Waris</Text>
        <DocBtn
          label="KTP"
          file={dokKTPWaris}
          onPress={() => pickDoc(setDokKTPWaris)}
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
          <Text style={styles.submitTxt}>Kirim Pengajuan Perpanjangan</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const Row = ({label, value}) => (
  <View style={{flexDirection: 'row', marginBottom: 6}}>
    <Text style={{width: 130, color: '#888', fontSize: 13}}>{label}</Text>
    <Text style={{flex: 1, color: '#303030', fontSize: 13, fontWeight: '500'}}>
      {value || '-'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
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
    color: '#ff9f1a',
    marginBottom: 10,
  },
  label: {marginTop: 10, marginBottom: 4, color: '#555', fontSize: 13},
  docBtn: {
    backgroundColor: '#fff7ec',
    borderWidth: 1,
    borderColor: '#ff9f1a',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  docBtnTxt: {color: '#ff9f1a', fontSize: 13},
  docNote: {color: '#888', fontSize: 11, marginBottom: 8},
  submitBtn: {
    backgroundColor: '#ff9f1a',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    marginTop: 4,
    marginBottom: 30,
  },
  submitTxt: {color: '#fff', fontWeight: 'bold', fontSize: 15},
});
