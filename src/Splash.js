// src/screens/SplashScreen.js
import React, {useEffect} from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const SplashScreen = ({navigation}) => {
  useEffect(() => {
    // kasih efek delay dikit biar splash kelihatan
    const timer = setTimeout(async () => {
      try {
        const currentUser = auth().currentUser;

        // kalau belum login → ke Login
        if (!currentUser) {
          navigation.reset({
            index: 0,
            routes: [{name: 'Login'}],
          });
          return;
        }

        // kalau sudah login → cek role di Firestore
        const doc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();

        const role = doc.exists ? doc.data().role : 'user';

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
      } catch (err) {
        console.log('[Splash] error:', err);
        // kalau ada error, paksa ke login saja
        navigation.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
      }
    }, 2000); // 1,5 detik

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#07575b" barStyle="light-content" />

      <View style={styles.container}>
        {/* Lingkaran logo */}
        <View>
          <Image
            source={require('../assets/logo.png')}
            style={{marginHorizontal: 105}}
          />
        </View>

        {/* Nama aplikasi */}
        <Text style={styles.appName}>Pendataan Pemakaman</Text>
        <Text style={styles.tagline}>
          Kelola data makam dengan rapi, cepat, dan terpusat.
        </Text>

        {/* Loading */}
        <View style={styles.bottomArea}>
          <ActivityIndicator size="large" color="#2ed573" />
          <Text style={styles.loadingText}>Menyiapkan aplikasi...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e272e',
  },
  container: {
    flex: 1,
    backgroundColor: '#E4EEF1FF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#2ed573',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    elevation: 8,
  },
  logoText: {
    color: '#f5f6fa',
    fontSize: 40,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f5f6fa',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: '#dcdde1',
    textAlign: 'center',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 6,
    color: '#dcdde1',
    fontSize: 12,
  },
});
