// src/Register.js
// ─────────────────────────────────────────────────────────────
// PERUBAHAN dari versi sebelumnya:
// + state: adminAlamat, adminNoTelepon — HANYA dipakai untuk role Admin
// + Section "Data Kontak Admin" (Alamat & No. Telepon) muncul
//   HANYA saat mendaftar sebagai Admin, agar datanya bisa
//   langsung tampil & diedit lagi lewat ProfileScreen admin.
// + Bagian User (NIK, Tanggal Lahir, Alamat, Hubungan) TIDAK diubah.
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
import {validateTglLahir} from './utils/dateValidation';

const Register = ({navigation}) => {
  // ── State lama (tidak diubah) ─────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  // ── State khusus User (tidak diubah) ──────────────────────
  const [nik, setNik] = useState('');
  const [tglLahir, setTglLahir] = useState(''); // DD-MM-YYYY
  const [alamat, setAlamat] = useState('');
  const [hubungan, setHubungan] = useState(''); // cth: Anak, Suami, Istri

  // ── State khusus Admin (baru) ─────────────────────────────
  const [adminAlamat, setAdminAlamat] = useState('');
  const [adminNoTelepon, setAdminNoTelepon] = useState('');

  const isAdmin = role === 'admin';

  const onRegister = async () => {
    // ── Validasi dasar (semua role) ─────────────────────────
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validasi', 'Nama, email, dan password wajib diisi');
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert('Validasi', 'Password minimal 6 karakter');
      return;
    }

    if (!isAdmin) {
      // ── Validasi khusus role "user" (tidak diubah) ─────────
      if (
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
      const err = validateTglLahir(tglLahir);
      if (err) return Alert.alert('Validasi', err);
    } else {
      // ── Validasi khusus role "admin" (baru) ────────────────
      if (!adminAlamat.trim() || !adminNoTelepon.trim()) {
        Alert.alert('Validasi', 'Alamat dan no. telepon wajib diisi');
        return;
      }
      if (!/^\d{10,13}$/.test(adminNoTelepon.trim())) {
        Alert.alert('Validasi', 'No. telepon harus 10-13 digit angka');
        return;
      }
    }

    try {
      setLoading(true);
      const userCred = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password,
      );
      const uid = userCred.user.uid;

      // ── Payload Firestore ────────────────────────────────────
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role: role, // "user" atau "admin"
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      if (!isAdmin) {
        payload.nik = nik.trim();
        payload.tglLahir = tglLahir.trim();
        payload.alamat = alamat.trim();
        payload.hubungan = hubungan.trim();
      } else {
        payload.alamat = adminAlamat.trim();
        payload.noTelepon = adminNoTelepon.trim();
      }

      await firestore().collection('users').doc(uid).set(payload);

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

        <Text style={[styles.sectionLabel, {marginTop: 4}]}>
          Daftar sebagai:
        </Text>
        <View style={styles.roleRow}>
          <RoleButton label="User" value="user" />
          <RoleButton label="Admin" value="admin" />
        </View>

        {!isAdmin ? (
          <>
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
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Data Kontak Admin</Text>
            <TextInput
              value={adminNoTelepon}
              onChangeText={text =>
                setAdminNoTelepon(text.replace(/[^0-9]/g, ''))
              }
              placeholder="No. Telepon Admin"
              keyboardType="phone-pad"
              maxLength={13}
              style={styles.input}
            />
            <TextInput
              value={adminAlamat}
              onChangeText={setAdminAlamat}
              placeholder="Alamat lengkap"
              multiline
              numberOfLines={3}
              style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
            />
          </>
        )}

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
