import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function UserBurialFormScreen({navigation}) {
  const [deceasedName, setDeceasedName] = useState('');
  const [heirName, setHeirName] = useState('');
  const [burialDate, setBurialDate] = useState(''); // format YYYY-MM-DD (or use datepicker lib)
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!deceasedName.trim() || !heirName.trim() || !burialDate.trim()) {
      Alert.alert(
        'Validasi',
        'Nama jenazah, ahli waris, dan tanggal pemakaman wajib diisi.',
      );
      return;
    }
    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Auth', 'Silakan login terlebih dahulu.');
      navigation.navigate('Login');
      return;
    }
    try {
      setLoading(true);
      await firestore().collection('burials').add({
        deceasedName: deceasedName.trim(),
        heirName: heirName.trim(),
        burialDate: burialDate.trim(),
        notes: notes.trim(),
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
        'Data pemakaman berhasil dikirim. Tunggu verifikasi admin.',
      );
      // reset or navigate to list
      setDeceasedName('');
      setHeirName('');
      setBurialDate('');
      setNotes('');
      navigation.navigate('UserBurialList');
    } catch (err) {
      console.log('[UserBurialForm] err', err);
      Alert.alert('Error', 'Gagal mengirim data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.title}>Daftarkan Jenazah</Text>

      <Text style={styles.label}>Nama Jenazah</Text>
      <TextInput
        style={styles.input}
        value={deceasedName}
        onChangeText={setDeceasedName}
        placeholder="Nama jenazah"
      />

      <Text style={styles.label}>Nama Ahli Waris</Text>
      <TextInput
        style={styles.input}
        value={heirName}
        onChangeText={setHeirName}
        placeholder="Nama ahli waris"
      />

      <Text style={styles.label}>Tanggal Pemakaman (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={burialDate}
        onChangeText={setBurialDate}
        placeholder="2025-12-05"
      />

      <Text style={styles.label}>Catatan</Text>
      <TextInput
        style={[styles.input, {height: 100}]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Catatan / patokan lokasi"
        multiline
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Mengirim...' : 'Kirim'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  label: {marginTop: 8, marginBottom: 4, color: '#555'},
  input: {backgroundColor: '#fff', padding: 10, borderRadius: 8, elevation: 2},
  button: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontWeight: 'bold'},
});
