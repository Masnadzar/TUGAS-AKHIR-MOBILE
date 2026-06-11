// src/screens/RegisterScreen.js
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // role: "user" atau "admin"
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validasi', 'Semua field wajib diisi');
      return;
    }

    try {
      setLoading(true);
      const userCred = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password,
      );

      const uid = userCred.user.uid;

      // Simpan data user + role ke Firestore
      await firestore().collection('users').doc(uid).set({
        name: name.trim(),
        email: email.trim(),
        role: role, // "user" atau "admin"
        createdAt: firestore.FieldValue.serverTimestamp(),
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
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        <Text style={{marginTop: 12, marginBottom: 6, color: '#555'}}>
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
          style={{marginTop: 16}}>
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
  container: {
    marginHorizontal: 32,
    marginTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#373248',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#868293',
    marginBottom: 20,
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
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    marginRight: 6,
    backgroundColor: '#ffffff',
  },
  roleButtonActive: {
    backgroundColor: '#61a2f1',
    borderColor: '#61a2f1',
  },
  roleText: {
    textAlign: 'center',
    color: '#373248',
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
