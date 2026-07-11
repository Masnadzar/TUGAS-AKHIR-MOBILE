// src/admin/AssignExtra.js
// Layar verifikasi admin untuk collection 'perpanjangan' dan 'tumpangan'.
// Sama seperti Assign.js (untuk 'burials'), tapi bisa dipakai untuk 2 collection
// sekaligus lewat route.params.collection ('perpanjangan' | 'tumpangan').
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
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const {width: SW, height: SH} = Dimensions.get('window');

// ── Konfigurasi tampilan per jenis collection ───────────────────────
const CONFIG = {
  perpanjangan: {
    title: 'Perpanjangan Sewa',
    color: '#ff9f1a',
    bgLight: '#fff7ec',
    dataRows: [
      {label: 'Nama Jenazah', field: 'deceasedName'},
      {label: 'NIK Jenazah', field: 'nikJenazah'},
      {label: 'Ahli Waris', field: 'heirName'},
      {label: 'NIK Ahli Waris', field: 'nikAhliWaris'},
      {label: 'No. Telepon', field: 'noTelepon'},
      {label: 'Alamat', field: 'alamat'},
      {label: 'Blok Lama', field: 'assignedBlock'},
      {label: 'No. Makam Lama', field: 'assignedGraveNumber'},
      {label: 'Tgl Pemakaman Asal', field: 'burialDateAsal'},
      {label: 'Catatan Pemohon', field: 'notes'},
    ],
    docFields: [
      {label: 'IPTM', field: 'dokIPTM'},
      {label: 'KTP Ahli Waris', field: 'dokKTPWaris'},
    ],
  },
  tumpangan: {
    title: 'Ijin Tumpang',
    color: '#2ed573',
    bgLight: '#f0fff5',
    dataRows: [
      {label: 'Nama Jenazah Baru', field: 'deceasedName'},
      {label: 'NIK Jenazah', field: 'nikJenazah'},
      {label: 'Bin/Binti', field: 'binBinti'},
      {label: 'Agama', field: 'agama'},
      {label: 'Tgl Lahir', field: 'tglLahirJenazah'},
      {label: 'Tgl Wafat', field: 'tglWafat'},
      {label: 'Tgl Pemakaman', field: 'burialDate'},
      {label: 'Ahli Waris', field: 'heirName'},
      {label: 'NIK Ahli Waris', field: 'nikAhliWaris'},
      {label: 'No. Telepon', field: 'noTelepon'},
      {label: 'Alamat', field: 'alamat'},
      {label: 'Blok Makam Lama (tumpang di sini)', field: 'assignedBlockLama'},
      {label: 'No. Makam Lama', field: 'assignedGraveNumberLama'},
      {label: 'Catatan Pemohon', field: 'notes'},
    ],
    docFields: [
      {label: 'KTP', field: 'dokKTP'},
      {label: 'KK', field: 'dokKK'},
      {label: 'Akte', field: 'dokAkte'},
      {label: 'Surat Kematian', field: 'dokSuratKematian'},
      {label: 'IPTM Lama', field: 'dokIPTMLama'},
    ],
  },
};

export default function AssignExtra({route, navigation}) {
  const {id, collection} = route.params || {};
  const cfg = CONFIG[collection];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState('');
  const [graveNo, setGraveNo] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLabel, setPreviewLabel] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    if (!id || !collection || !cfg) {
      Alert.alert('Error', 'Parameter tidak lengkap.');
      navigation.goBack();
      return;
    }
    const unsub = firestore()
      .collection(collection)
      .doc(id)
      .onSnapshot(
        snap => {
          if (snap.exists) {
            const d = {id: snap.id, ...snap.data()};
            setData(d);
            // Untuk tumpangan: blok/no makam baru (tempat jenazah baru ditumpangkan)
            // Untuk perpanjangan: blok/no makam yang diperpanjang (biasanya sama dgn lama,
            // tapi admin tetap bisa mengoreksi kalau perlu)
            setBlock(d.assignedBlockBaru || d.assignedBlock || '');
            setGraveNo(
              d.assignedGraveNumberBaru || d.assignedGraveNumber || '',
            );
            setAdminNote(d.adminNote || '');
          } else {
            Alert.alert('Error', 'Data tidak ditemukan');
            navigation.goBack();
          }
          setLoading(false);
        },
        err => {
          console.log('[AssignExtra] error:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, [id, collection]);

  const bukaPreview = (url, label) => {
    if (!url) {
      Alert.alert('Info', `Dokumen ${label} tidak diunggah.`);
      return;
    }
    setPreviewUrl(url);
    setPreviewLabel(label);
    setImgLoading(true);
    setPreviewVisible(true);
  };

  const handleVerify = async () => {
    if (!block.trim() || !graveNo.trim()) {
      Alert.alert('Validasi', 'Blok dan nomor makam wajib diisi.');
      return;
    }
    try {
      setSaving(true);
      const adminUid = auth().currentUser?.uid;

      // Field disimpan sebagai *Baru supaya tidak menimpa data referensi lama
      // (assignedBlock/assignedGraveNumber lama tetap tersimpan untuk riwayat).
      await firestore()
        .collection(collection)
        .doc(id)
        .set(
          {
            assignedBlockBaru: block.trim(),
            assignedGraveNumberBaru: graveNo.trim(),
            adminNote: adminNote.trim(),
            status: 'verified',
            verifiedBy: adminUid || null,
            verifiedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );

      // Untuk perpanjangan: begitu diverifikasi, ikut update collection 'burials'
      // asalnya supaya blok/lokasi tetap sinkron & tersambung.
      if (collection === 'perpanjangan' && data?.burialId) {
        await firestore().collection('burials').doc(data.burialId).set(
          {
            assignedBlock: block.trim(),
            assignedGraveNumber: graveNo.trim(),
            lastExtendedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
      }

      Alert.alert('Sukses', 'Data berhasil diverifikasi.');
      navigation.goBack();
    } catch (err) {
      console.log('[AssignExtra] verify error:', err);
      Alert.alert('Error', 'Gagal memverifikasi.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    Alert.alert('Tolak', 'Tandai entri ini sebagai ditolak?', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Tolak',
        style: 'destructive',
        onPress: async () => {
          await firestore()
            .collection(collection)
            .doc(id)
            .set(
              {
                status: 'rejected',
                verifiedBy: auth().currentUser?.uid || null,
                verifiedAt: firestore.FieldValue.serverTimestamp(),
              },
              {merge: true},
            );
          navigation.goBack();
        },
      },
    ]);
  };

  if (!cfg || loading)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );

  const Row = ({label, value}) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );

  const DocCard = ({label, url}) => (
    <TouchableOpacity
      style={[styles.docCard, url ? styles.docCardAda : styles.docCardTidak]}
      onPress={() => bukaPreview(url, label)}
      activeOpacity={0.85}>
      {url ? (
        <>
          <Image
            source={{uri: url}}
            style={styles.docThumb}
            resizeMode="cover"
          />
          <View
            style={[
              styles.docCardOverlay,
              {backgroundColor: cfg.color + 'd9'},
            ]}>
            <Text style={styles.docCardLabel}>{label}</Text>
            <Text style={styles.docCardHint}>Ketuk untuk perbesar</Text>
          </View>
        </>
      ) : (
        <View style={styles.docCardEmpty}>
          <Text style={styles.docCardEmptyIcon}>📄</Text>
          <Text style={styles.docCardLabel}>{label}</Text>
          <Text style={styles.docCardHint}>Tidak diunggah</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const sc = {
    pending: {bg: '#fff3cd', txt: '#856404', label: '⏳ PENDING'},
    verified: {bg: '#d4edda', txt: '#155724', label: '✅ TERVERIFIKASI'},
    rejected: {bg: '#f8d7da', txt: '#721c24', label: '❌ DITOLAK'},
  }[data.status] || {bg: '#eee', txt: '#333', label: data.status};

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{padding: 16, paddingBottom: 50}}>
        <View style={[styles.headerCard, {backgroundColor: sc.bg}]}>
          <Text style={[styles.headerNama, {color: sc.txt}]}>
            {cfg.title}: {data.deceasedName || '-'}
          </Text>
          <Text style={[styles.statusPill, {color: sc.txt}]}>{sc.label}</Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, {color: cfg.color}]}>
            📋 Data Pengajuan
          </Text>
          {cfg.dataRows.map(r => (
            <Row key={r.field} label={r.label} value={data[r.field]} />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, {color: cfg.color}]}>📎 Dokumen</Text>
          <Text style={styles.docHint}>
            Ketuk gambar untuk melihat dokumen secara penuh
          </Text>
          <View style={styles.docGrid}>
            {cfg.docFields.map(d => (
              <DocCard key={d.field} label={d.label} url={data[d.field]} />
            ))}
          </View>
        </View>

        {data.status === 'pending' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, {color: cfg.color}]}>
              ✏️ Tentukan Lokasi Makam
            </Text>

            <Text style={styles.inputLabel}>Blok Makam *</Text>
            <TextInput
              style={styles.input}
              value={block}
              onChangeText={setBlock}
              placeholder="Contoh: A1, B3"
            />

            <Text style={styles.inputLabel}>Nomor Makam *</Text>
            <TextInput
              style={styles.input}
              value={graveNo}
              onChangeText={setGraveNo}
              placeholder="Contoh: 045"
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Catatan / Patokan Lokasi</Text>
            <TextInput
              style={[styles.input, {height: 75, textAlignVertical: 'top'}]}
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Contoh: Baris ke-3 dari kiri, dekat pohon"
              multiline
            />

            <TouchableOpacity
              style={[styles.btnVerify, {backgroundColor: cfg.color}]}
              onPress={handleVerify}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnTxt}>✅ Verifikasi & Simpan</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnReject}
              onPress={handleReject}
              disabled={saving}>
              <Text style={styles.btnTxt}>❌ Tolak Entri</Text>
            </TouchableOpacity>
          </View>
        )}

        {data.status === 'verified' && (
          <View style={[styles.card, {backgroundColor: '#d4edda'}]}>
            <Text
              style={{
                color: '#155724',
                fontWeight: 'bold',
                textAlign: 'center',
              }}>
              ✅ Sudah diverifikasi
            </Text>
            <Row label="Blok Makam" value={data.assignedBlockBaru} />
            <Row label="Nomor Makam" value={data.assignedGraveNumberBaru} />
            <Row label="Catatan" value={data.adminNote || '-'} />
          </View>
        )}

        {data.status === 'rejected' && (
          <View style={[styles.card, {backgroundColor: '#f8d7da'}]}>
            <Text
              style={{
                color: '#721c24',
                fontWeight: 'bold',
                textAlign: 'center',
              }}>
              ❌ Entri ini telah ditolak
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{previewLabel}</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setPreviewVisible(false)}>
              <Text style={styles.modalCloseTxt}>✕ Tutup</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalImgWrap}>
            {imgLoading && (
              <ActivityIndicator
                size="large"
                color="#fff"
                style={StyleSheet.absoluteFill}
              />
            )}
            <Image
              source={{uri: previewUrl}}
              style={styles.modalImg}
              resizeMode="contain"
              onLoadStart={() => setImgLoading(true)}
              onLoadEnd={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                Alert.alert('Error', 'Gagal memuat gambar.');
                setPreviewVisible(false);
              }}
            />
          </View>
          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterTxt}>
              Cubit untuk zoom • Geser untuk menutup
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  headerCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerNama: {fontWeight: 'bold', fontSize: 16, flex: 1},
  statusPill: {fontSize: 12, fontWeight: 'bold'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
  },
  cardTitle: {fontSize: 15, fontWeight: 'bold', marginBottom: 10},
  row: {flexDirection: 'row', marginBottom: 6},
  rowLabel: {width: 170, color: '#888', fontSize: 13},
  rowValue: {flex: 1, color: '#303030', fontSize: 13, fontWeight: '600'},
  docHint: {color: '#aaa', fontSize: 11, marginBottom: 10},
  docGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  docCard: {
    width: (SW - 80) / 2,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  docCardAda: {backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ddd'},
  docCardTidak: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 110,
  },
  docThumb: {width: '100%', height: 110},
  docCardOverlay: {padding: 6},
  docCardLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  docCardHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    textAlign: 'center',
  },
  docCardEmpty: {alignItems: 'center', padding: 16},
  docCardEmptyIcon: {fontSize: 28, marginBottom: 4},
  inputLabel: {marginTop: 10, marginBottom: 4, color: '#555', fontSize: 13},
  input: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  btnVerify: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
  },
  btnReject: {
    backgroundColor: '#ff6b6b',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
  },
  btnTxt: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  modalTitle: {color: '#fff', fontWeight: 'bold', fontSize: 16},
  modalClose: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalCloseTxt: {color: '#fff', fontWeight: 'bold', fontSize: 13},
  modalImgWrap: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  modalImg: {width: SW, height: SH * 0.75},
  modalFooter: {paddingVertical: 14, alignItems: 'center'},
  modalFooterTxt: {color: 'rgba(255,255,255,0.5)', fontSize: 11},
});
