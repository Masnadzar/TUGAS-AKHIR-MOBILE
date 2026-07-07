// src/Register.js
// ─────────────────────────────────────────────────────────────
// PERUBAHAN dari versi lama:
// + state: nik, tglLahir, alamat, hubungan
// + validasi: NIK 16 digit, format tanggal DD-MM-YYYY
// + Firestore: menyimpan 4 field baru ke collection 'users'
// ─────────────────────────────────────────────────────────────
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const Register = ({navigation}) => {
  // ── State lama (tidak diubah) ─────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  // ── State baru ────────────────────────────────────────────
  const [nik, setNik] = useState('');
  const [tglLahir, setTglLahir] = useState(''); // DD-MM-YYYY
  const [alamat, setAlamat] = useState('');
  const [hubungan, setHubungan] = useState(''); // cth: Anak, Suami, Istri

  const onRegister = async () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !nik.trim() ||
      !tglLahir.trim() ||
      !alamat.trim() ||
      !hubungan.trim()
    ) {
      Alert.alert('Validasi', 'Semua field wajib diisi');
      return;
    }
    if (!/^\d{16}$/.test(nik.trim())) {
      Alert.alert('Validasi', 'NIK harus tepat 16 digit angka');
      return;
    }
    if (!/^\d{2}-\d{2}-\d{4}$/.test(tglLahir.trim())) {
      Alert.alert(
        'Validasi',
        'Format tanggal lahir: DD-MM-YYYY\nContoh: 25-08-1990',
      );
      return;
    }

    try {
      setLoading(true);
      const userCred = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password,
      );
      const uid = userCred.user.uid;

      await firestore().collection('users').doc(uid).set({
        name: name.trim(), // String
        email: email.trim(), // String
        role: role, // String: "user" atau "admin"
        nik: nik.trim(), // String (16 digit)
        tglLahir: tglLahir.trim(), // String "DD-MM-YYYY"
        alamat: alamat.trim(), // String
        hubungan: hubungan.trim(), // String
        createdAt: firestore.FieldValue.serverTimestamp(), // Timestamp
      });

      Alert.alert('Sukses', 'Registrasi berhasil, silakan login');
      navigation.replace('Login');
    } catch (error) {
      console.log('[Register] error:', error);
      Alert.alert('Error', error.message || 'Terjadi kesalahan saat register');
    } finally {
      setLoading(false);
    }
  };

  const RoleButton = ({label, value}) => (
    <TouchableOpacity
      onPress={() => setRole(value)}
      style={[styles.roleButton, role === value && styles.roleButtonActive]}>
      <Text style={[styles.roleText, role === value && styles.roleTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{flex: 1, backgroundColor: '#E4EEF1FF'}}>
      <StatusBar backgroundColor="#07575b" barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Register</Text>
        <Text style={styles.subtitle}>
          Buat akun baru sebagai User atau Admin
        </Text>

        <Text style={styles.sectionLabel}>Data Akun</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nama lengkap"
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (min. 6 karakter)"
          secureTextEntry
          style={styles.input}
        />

        <Text style={styles.sectionLabel}>Data Ahli Waris</Text>
        <TextInput
          value={nik}
          onChangeText={setNik}
          placeholder="NIK (16 digit angka)"
          keyboardType="number-pad"
          maxLength={16}
          style={styles.input}
        />
        <TextInput
          value={tglLahir}
          onChangeText={text => {
            let val = text.replace(/[^0-9]/g, '');
            if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
            if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
            setTglLahir(val.slice(0, 10));
          }}
          placeholder="Tanggal Lahir (DD-MM-YYYY)"
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
        />
        <TextInput
          value={alamat}
          onChangeText={setAlamat}
          placeholder="Alamat lengkap"
          multiline
          numberOfLines={3}
          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
        />
        <TextInput
          value={hubungan}
          onChangeText={setHubungan}
          placeholder="Hubungan dengan jenazah (cth: Anak, Suami, Istri)"
          style={styles.input}
        />

        <Text style={[styles.sectionLabel, {marginTop: 12}]}>
          Daftar sebagai:
        </Text>
        <View style={styles.roleRow}>
          <RoleButton label="User" value="user" />
          <RoleButton label="Admin" value="admin" />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={onRegister}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Mendaftar...' : 'Daftar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.replace('Login')}
          style={{marginTop: 16, marginBottom: 40}}>
          <Text style={{textAlign: 'center', color: '#373248'}}>
            Sudah punya akun?{' '}
            <Text style={{color: '#61a2f1'}}>Login di sini</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {marginHorizontal: 32, marginTop: 60},
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#373248',
    textAlign: 'center',
  },
  subtitle: {textAlign: 'center', color: '#868293', marginBottom: 16},
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#07575b',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dde',
    paddingBottom: 4,
  },
  input: {
    backgroundColor: '#ffffff',
    elevation: 2,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#303030',
    paddingVertical: 14,
    borderRadius: 6,
    marginTop: 10,
    elevation: 2,
  },
  buttonText: {color: '#ffffff', textAlign: 'center', fontWeight: 'bold'},
  roleRow: {flexDirection: 'row', justifyContent: 'space-between'},
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    marginRight: 6,
    backgroundColor: '#ffffff',
  },
  roleButtonActive: {backgroundColor: '#61a2f1', borderColor: '#61a2f1'},
  roleText: {textAlign: 'center', color: '#373248', fontWeight: '500'},
  roleTextActive: {color: '#ffffff', fontWeight: 'bold'},
});
