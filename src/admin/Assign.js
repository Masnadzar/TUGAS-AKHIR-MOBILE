// src/screens/AdminAssignScreen.js
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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function Assign({route, navigation}) {
  const {id} = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [block, setBlock] = useState('');
  const [graveNo, setGraveNo] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleVerify = async () => {
    if (!block.trim() || !graveNo.trim()) {
      Alert.alert(
        'Validasi',
        'Block dan nomor makam wajib diisi untuk verifikasi.',
      );
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
      Alert.alert('Sukses', 'Entri berhasil diverifikasi.');
      navigation.goBack();
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Gagal memverifikasi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator />
      </View>
    );

  return (
    <ScrollView style={{padding: 12, backgroundColor: '#f1f2f6'}}>
      <View style={styles.card}>
        <Text style={styles.title}>{data.deceasedName}</Text>
        <Text style={styles.meta}>Ahli waris: {data.heirName}</Text>
        <Text style={styles.meta}>Tanggal: {data.burialDate}</Text>
        <Text style={{marginTop: 8}}>
          Catatan submitter: {data.notes || '-'}
        </Text>
      </View>

      <Text style={{marginTop: 10}}>Tentukan Lokasi & Catatan Patok</Text>
      <TextInput
        style={styles.input}
        placeholder="Block (contoh: A1)"
        value={block}
        onChangeText={setBlock}
      />
      <TextInput
        style={styles.input}
        placeholder="Nomor Makam"
        value={graveNo}
        onChangeText={setGraveNo}
      />
      <TextInput
        style={[styles.input, {height: 80}]}
        placeholder="Catatan/patok lokasi"
        value={adminNote}
        onChangeText={setAdminNote}
        multiline
      />

      <TouchableOpacity
        style={[styles.btn, {backgroundColor: '#2ed573'}]}
        onPress={handleVerify}
        disabled={saving}>
        <Text style={{color: '#fff'}}>
          {saving ? 'Memproses...' : 'Verifikasi & Simpan Lokasi'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, {backgroundColor: '#ff6b6b'}]}
        onPress={() => {
          // optional: mark as rejected
          Alert.alert('Tolak', 'Tandai entri sebagai ditolak?', [
            {text: 'Batal', style: 'cancel'},
            {
              text: 'Tolak',
              onPress: async () => {
                await firestore().collection('burials').doc(id).set(
                  {
                    status: 'rejected',
                    verifiedBy: auth().currentUser?.uid,
                    verifiedAt: firestore.FieldValue.serverTimestamp(),
                  },
                  {merge: true},
                );
                navigation.goBack();
              },
            },
          ]);
        }}>
        <Text style={{color: '#fff'}}>Tolak Entri</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {backgroundColor: '#fff', padding: 12, borderRadius: 8, elevation: 2},
  title: {fontWeight: 'bold', fontSize: 16},
  meta: {color: '#555', marginTop: 4},
  input: {backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 8},
  btn: {padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center'},
});
