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

export default function BurialDetailScreen({route, navigation}) {
  const {id, edit} = route.params || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState(null);
  const [deceasedName, setDeceasedName] = useState('');
  const [heirName, setHeirName] = useState('');
  const [burialDate, setBurialDate] = useState('');
  const [notes, setNotes] = useState('');

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
            setDeceasedName(d.deceasedName || '');
            setHeirName(d.heirName || '');
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

  const handleSave = async () => {
    if (!deceasedName.trim() || !heirName.trim() || !burialDate.trim()) {
      Alert.alert('Validasi', 'Lengkapi fields penting.');
      return;
    }
    if (data.status !== 'pending') {
      Alert.alert(
        'Tidak diizinkan',
        'Hanya entri berstatus pending yang bisa diubah.',
      );
      return;
    }
    try {
      setSaving(true);
      await firestore().collection('burials').doc(id).set(
        {
          deceasedName: deceasedName.trim(),
          heirName: heirName.trim(),
          burialDate: burialDate.trim(),
          notes: notes.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
      Alert.alert('Sukses', 'Perubahan disimpan');
      navigation.goBack();
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Gagal menyimpan.');
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
  if (!data)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Data tidak ditemukan</Text>
      </View>
    );

  const isOwner = auth().currentUser?.uid === data.createdBy;
  const canEdit = isOwner && data.status === 'pending';

  return (
    <ScrollView style={{padding: 12, backgroundColor: '#f1f2f6'}}>
      <View style={styles.card}>
        <Text style={styles.title}>{data.deceasedName}</Text>
        <Text style={styles.meta}>Ahli waris: {data.heirName}</Text>
        <Text style={styles.meta}>Tanggal: {data.burialDate}</Text>
        <Text style={styles.meta}>Status: {data.status}</Text>
        <Text style={styles.meta}>
          Lokasi: {data.assignedBlock || '-'} /{' '}
          {data.assignedGraveNumber || '-'}
        </Text>
        <Text style={{marginTop: 8}}>
          Catatan submitter: {data.notes || '-'}
        </Text>
        {data.adminNote ? (
          <Text style={{marginTop: 6}}>Catatan admin: {data.adminNote}</Text>
        ) : null}
      </View>

      {canEdit ? (
        <>
          <Text style={{marginTop: 8, marginBottom: 4}}>Edit Jenazah</Text>
          <TextInput
            style={styles.input}
            value={deceasedName}
            onChangeText={setDeceasedName}
          />
          <TextInput
            style={styles.input}
            value={heirName}
            onChangeText={setHeirName}
          />
          <TextInput
            style={styles.input}
            value={burialDate}
            onChangeText={setBurialDate}
          />
          <TextInput
            style={[styles.input, {height: 80}]}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleSave}
            disabled={saving}>
            <Text style={{color: '#fff'}}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  title: {fontSize: 16, fontWeight: 'bold'},
  meta: {color: '#555', marginTop: 4},
  input: {backgroundColor: '#fff', padding: 10, borderRadius: 8, marginTop: 8},
  btnPrimary: {
    backgroundColor: '#2ed573',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
});
