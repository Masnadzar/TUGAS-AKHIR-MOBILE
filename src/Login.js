// src/screens/LoginScreen.js
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
  Image,
  Modal,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const Login = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  const onResetPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Validasi', 'Email wajib diisi');
      return;
    }

    try {
      setResetLoading(true);
      await auth().sendPasswordResetEmail(resetEmail.trim());
      Alert.alert(
        'Berhasil',
        'Link reset password telah dikirim ke email Anda',
      );
      setShowForgot(false);
      setResetEmail('');
    } catch (error) {
      console.log('[ResetPassword] error:', error);

      let message = 'Terjadi kesalahan';
      if (error.code === 'auth/user-not-found') {
        message = 'Email tidak terdaftar';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Format email tidak valid';
      }

      Alert.alert('Gagal', message);
    } finally {
      setResetLoading(false);
    }
  };

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validasi', 'Email dan password wajib diisi');
      return;
    }

    try {
      setLoading(true);
      const userCred = await auth().signInWithEmailAndPassword(
        email.trim(),
        password,
      );
      const uid = userCred.user.uid;

      // ambil role dari Firestore
      const userDoc = await firestore().collection('users').doc(uid).get();

      if (!userDoc.exists) {
        Alert.alert(
          'Error',
          'Data user di Firestore tidak ditemukan. Hubungi admin.',
        );
        return;
      }

      const data = userDoc.data();
      const role = data.role;

      if (role === 'admin') {
        navigation.reset({
          index: 0,
          routes: [{name: 'HomeAdmin'}],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{name: 'HomeUser'}],
        });
      }
    } catch (error) {
      console.log('[Login] error:', error);
      Alert.alert('Error', error.message || 'Gagal login');
      // Default pesan
      let message = 'Terjadi kesalahan saat login';

      // Khusus kasus tertentu (pilihan)
      if (error.code === 'auth/invalid-email') {
        message = 'Format email tidak valid';
      } else if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        message = 'Email atau password salah';
      }

      Alert.alert('Login gagal', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{flex: 1, backgroundColor: '#E4EEF1FF'}}>
      <StatusBar backgroundColor="#07575b" barStyle="dark-content" />
      <View style={styles.container}>
        <Image
          source={require('../assets/logo.png')}
          style={{marginHorizontal: 105}}
        />
        <Text style={styles.title}>Pendataan Pemakaman</Text>
        <Text style={styles.subtitle}>Masuk sebagai User atau Admin</Text>

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

        <TouchableOpacity
          style={styles.button}
          onPress={onLogin}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Memproses...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowForgot(true)}
          style={{marginTop: 10}}>
          <Text style={{textAlign: 'center', color: '#07575b'}}>
            Lupa Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={{marginTop: 16}}>
          <Text style={{textAlign: 'center', color: '#373248'}}>
            Belum punya akun?{' '}
            <Text style={{color: '#61a2f1'}}>Daftar di sini</Text>
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={showForgot}
        onRequestClose={() => setShowForgot(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Lupa Password</Text>
            <Text style={styles.modalSubtitle}>
              Masukkan email akun Anda untuk reset password
            </Text>

            <TextInput
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={onResetPassword}
              disabled={resetLoading}>
              <Text style={styles.buttonText}>
                {resetLoading ? 'Mengirim...' : 'Kirim Email Reset'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowForgot(false)}
              style={{marginTop: 10}}>
              <Text style={{textAlign: 'center', color: '#888'}}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 32,
    marginTop: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#66A5AD',
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#07575b',
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 10,
  },
});
