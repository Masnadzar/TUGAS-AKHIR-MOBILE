// src/admin/Assign.js
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

export default function Assign({route, navigation}) {
  const {id} = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState('');
  const [graveNo, setGraveNo] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  // ── State untuk preview gambar ──────────────────────────────────
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLabel, setPreviewLabel] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

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
            setData({id: snap.id, ...snap.data()});
            setBlock(snap.data().assignedBlock || '');
            setGraveNo(snap.data().assignedGraveNumber || '');
            setAdminNote(snap.data().adminNote || '');
          } else {
            Alert.alert('Error', 'Data tidak ditemukan');
            navigation.goBack();
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

  // ── Buka preview gambar dalam Modal ────────────────────────────
  const bukaPreview = (url, label) => {
    if (!url) {
      Alert.alert('Info', `Dokumen ${label} tidak diunggah oleh ahli waris.`);
      return;
    }
    setPreviewUrl(url);
    setPreviewLabel(label);
    setImgLoading(true);
    setPreviewVisible(true);
  };

  // ── Verifikasi ──────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!block.trim() || !graveNo.trim()) {
      Alert.alert('Validasi', 'Block dan nomor makam wajib diisi.');
      return;
    }
    try {
      setSaving(true);
      const adminUid = auth().currentUser?.uid;
      await firestore()
        .collection('burials')
        .doc(id)
        .set(
          {
            assignedBlock: block.trim(),
            assignedGraveNumber: graveNo.trim(),
            adminNote: adminNote.trim(),
            status: 'verified',
            verifiedBy: adminUid || null,
            verifiedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
      Alert.alert('Sukses', 'Data berhasil diverifikasi.');
      navigation.goBack();
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Gagal memverifikasi.');
    } finally {
      setSaving(false);
    }
  };

  // ── Tolak ───────────────────────────────────────────────────────
  const handleReject = () => {
    if (!adminNote.trim()) {
      Alert.alert(
        'Validasi',
        'Keterangan/alasan wajib diisi sebelum menolak pengajuan ini.',
      );
      return;
    }
    Alert.alert('Tolak', 'Tandai entri ini sebagai ditolak?', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Tolak',
        style: 'destructive',
        onPress: async () => {
          await firestore()
            .collection('burials')
            .doc(id)
            .set(
              {
                status: 'rejected',
                adminNote: adminNote.trim(),
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

  if (loading)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );

  // ── Komponen baris data ─────────────────────────────────────────
  const Row = ({label, value}) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );

  // ── Komponen tombol dokumen ─────────────────────────────────────
  // Menampilkan thumbnail kecil kalau ada URL
  // Ketuk → buka Modal preview fullscreen
  const DocCard = ({label, url}) => (
    <TouchableOpacity
      style={[styles.docCard, url ? styles.docCardAda : styles.docCardTidak]}
      onPress={() => bukaPreview(url, label)}
      activeOpacity={0.85}>
      {url ? (
        // Ada dokumen → tampilkan thumbnail
        <>
          <Image
            source={{uri: url}}
            style={styles.docThumb}
            resizeMode="cover"
          />
          <View style={styles.docCardOverlay}>
            <Text style={styles.docCardLabel}>{label}</Text>
            <Text style={styles.docCardHint}>Ketuk untuk perbesar</Text>
          </View>
        </>
      ) : (
        // Tidak ada dokumen
        <View style={styles.docCardEmpty}>
          <Text style={styles.docCardEmptyIcon}>📄</Text>
          <Text style={styles.docCardLabel}>{label}</Text>
          <Text style={styles.docCardHint}>Tidak diunggah</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ── Status config ───────────────────────────────────────────────
  const sc = {
    pending: {bg: '#fff3cd', txt: '#856404', label: '⏳ PENDING'},
    verified: {bg: '#d4edda', txt: '#155724', label: '✅ DITERIMA'},
    rejected: {bg: '#f8d7da', txt: '#721c24', label: '❌ DITOLAK'},
  }[data.status] || {bg: '#eee', txt: '#333', label: data.status};

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{padding: 16, paddingBottom: 50}}>
        {/* ══ HEADER STATUS ══ */}
        <View style={[styles.headerCard, {backgroundColor: sc.bg}]}>
          <Text style={[styles.headerNama, {color: sc.txt}]}>
            {data.deceasedName || '-'}
          </Text>
          <Text style={[styles.statusPill, {color: sc.txt}]}>{sc.label}</Text>
        </View>

        {/* ══ DATA JENAZAH ══ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Data Jenazah</Text>
          <Row label="Nama" value={data.deceasedName} />
          <Row label="NIK" value={data.nikJenazah} />
          <Row label="Bin/Binti" value={data.binBinti} />
          <Row label="Jenis Kelamin" value={data.jenisKelamin} />
          <Row label="Agama" value={data.agama} />
          <Row label="Tanggal Lahir" value={data.tglLahirJenazah} />
          <Row label="Tanggal Wafat" value={data.tglWafat} />
          <Row label="Penyebab" value={data.penyebabKematian} />
        </View>

        {/* ══ DATA AHLI WARIS ══ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Data Ahli Waris</Text>
          <Row label="Nama" value={data.heirName} />
          <Row label="NIK" value={data.nikAhliWaris} />
          <Row label="No. Telepon" value={data.noTelepon} />
          <Row label="Hubungan" value={data.hubungan} />
          <Row label="Tgl Pemakaman" value={data.burialDate} />
          <Row label="Tanggal Lahir" value={data.tglLahirWaris} />
          <Row label="Alamat" value={data.alamat || '-'} />
        </View>

        {/* ══ DOKUMEN PENDUKUNG — tampil sebagai thumbnail ══ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📎 Dokumen Pendukung</Text>
          <Text style={styles.docHint}>
            Ketuk gambar untuk melihat dokumen secara penuh
          </Text>
          {/* Grid 2 kolom */}
          <View style={styles.docGrid}>
            <DocCard label="KTP Ahli Waris" url={data.dokKTP} />
            <DocCard label="KK Ahli Waris" url={data.dokKK} />
            <DocCard label="KTP Jenazah" url={data.dokKTPJenazah} />
            <DocCard label="KK Jenazah" url={data.dokKKJenazah} />
            <DocCard label="Surat Kematian" url={data.dokSuratKematian} />
            <DocCard label="Surat Medis" url={data.dokSuratMedis} />
          </View>
        </View>

        {/* ══ INPUT VERIFIKASI — hanya muncul kalau pending ══ */}
        {data.status === 'pending' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✏️ Tentukan Lokasi Makam</Text>

            <Text style={styles.inputLabel}>Block Makam *</Text>
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

            <Text style={styles.inputLabel}>
              Keterangan (Catatan Lokasi jika diterima / Alasan jika ditolak) *
            </Text>
            <TextInput
              style={[styles.input, {height: 75, textAlignVertical: 'top'}]}
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Contoh: Baris ke-3 dari kiri, dekat pohon / Berkas tidak sesuai"
              multiline
            />

            <TouchableOpacity
              style={styles.btnVerify}
              onPress={handleVerify}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnTxt}>✅ Terima & Simpan</Text>
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
              ✅ Pengajuan telah diterima
            </Text>
            <Row label="Block" value={data.assignedBlock} />
            <Row label="Nomor Makam" value={data.assignedGraveNumber} />
            <Row label="Keterangan" value={data.adminNote || '-'} />
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
              ❌ Pengajuan ini telah ditolak
            </Text>
            <Row label="Keterangan" value={data.adminNote || '-'} />
          </View>
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════
          MODAL PREVIEW DOKUMEN — tampil fullscreen
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalBg}>
          {/* Header modal */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{previewLabel}</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setPreviewVisible(false)}>
              <Text style={styles.modalCloseTxt}>✕ Tutup</Text>
            </TouchableOpacity>
          </View>

          {/* Gambar fullscreen */}
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

          {/* Footer */}
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
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e90ff',
    marginBottom: 10,
  },
  row: {flexDirection: 'row', marginBottom: 6},
  rowLabel: {width: 140, color: '#888', fontSize: 13},
  rowValue: {flex: 1, color: '#303030', fontSize: 13, fontWeight: '600'},

  // ── Dokumen Grid ──
  docHint: {color: '#aaa', fontSize: 11, marginBottom: 10},
  docGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  docCard: {
    width: (SW - 80) / 2,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  docCardAda: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  docCardTidak: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 110,
  },
  docThumb: {width: '100%', height: 110},
  docCardOverlay: {backgroundColor: 'rgba(30,144,255,0.85)', padding: 6},
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

  // ── Input ──
  inputLabel: {marginTop: 10, marginBottom: 4, color: '#555', fontSize: 13},
  input: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  btnVerify: {
    backgroundColor: '#2ed573',
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

  // ── Modal Preview ──
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
