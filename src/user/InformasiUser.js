// src/screens/UserInfoScreen.js
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import auth from '@react-native-firebase/auth';

const UserInfoScreen = ({navigation}) => {
  const user = auth().currentUser;

  // fungsi buka Google Maps di Android
  const openMaps = (lat, lng, label) => {
    const url = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(
      label,
    )})`;
    Linking.openURL(url).catch(err =>
      console.log('[UserInfo] gagal membuka maps:', err),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1e272e" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 24}}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Informasi Pemakaman</Text>
          <Text style={styles.headerSubtitle}>
            Selamat datang, {user?.email || 'User'}
          </Text>
        </View>

        {/* TENTANG APLIKASI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tentang Aplikasi</Text>
          <Text style={styles.cardText}>
            Aplikasi ini membantu Anda mencari informasi pemakaman: nama
            jenazah, blok dan nomor makam, serta penanggung jawab. Data dikelola
            oleh admin sehingga informasi tetap rapi dan mudah dilacak.
          </Text>
        </View>

        {/* PANDUAN PENGGUNA */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Panduan Penggunaan</Text>
          <Text style={styles.cardText}>1. Masuk menggunakan akun Anda.</Text>
          <Text style={styles.cardText}>
            2. Gunakan menu {'"'}Data Pemakaman{'"'} untuk melihat daftar
            lengkap.
          </Text>
          <Text style={styles.cardText}>
            3. Gunakan menu {'"'}Pencarian Makam{'"'} untuk mencari berdasarkan
            nama jenazah atau blok.
          </Text>
          <Text style={styles.cardText}>
            4. Jika ada data yang tidak sesuai, hubungi admin melalui kontak di
            bawah.
          </Text>
        </View>

        {/* ETIKA DI AREA PEMAKAMAN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Etika di Area Pemakaman</Text>
          <Text style={styles.cardText}>
            • Jaga ketenangan dan tidak berisik.
          </Text>
          <Text style={styles.cardText}>
            • Jaga kebersihan, jangan buang sampah sembarangan.
          </Text>
          <Text style={styles.cardText}>• Gunakan pakaian yang sopan.</Text>
          <Text style={styles.cardText}>
            • Hormati peziarah lain dan petugas pemakaman.
          </Text>
        </View>

        {/* JAM BERKUNJUNG & KONTAK */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Jam Berkunjung & Kontak</Text>
          <Text style={styles.cardText}>Jam kunjung: 07.00 - 17.00 WIB</Text>
          <Text style={styles.cardText}>Admin pemakaman: 0812-3456-7890</Text>
          <Text style={styles.cardText}>Email: admin@tpukota.go.id</Text>
        </View>

        {/* PILIH LOKASI PADA MAPS */}
        <Text style={styles.sectionLabel}>Lokasi pada Maps</Text>

        {/* Contoh 1: TPU Kota Sejahtera */}
        <TouchableOpacity
          style={styles.mapCard}
          onPress={() => openMaps(-6.3297724, 106.8981871, 'TPU Cipayung')}>
          {/* Gambar bisa dari assets sendiri atau URL */}
          <Image source={require('./map.jpeg')} style={styles.mapImage} />

          <View style={styles.mapInfo}>
            <Text style={styles.mapTitle}>TPU Cipayung</Text>
            <Text style={styles.mapText}>
              Tekan untuk membuka lokasi ini di Google Maps. Ubah tampilan ke
              Satellite agar terlihat dari atas.
            </Text>
            <Text style={styles.mapHint}>▶ Buka di Google Maps</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserInfoScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e272e',
  },
  container: {
    flex: 1,
    backgroundColor: '#f1f2f6',
  },
  header: {
    backgroundColor: '#1e272e',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
    elevation: 4,
  },
  headerTitle: {
    color: '#f5f6fa',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#dcdde1',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2f3542',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    color: '#57606f',
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 6,
    marginHorizontal: 16,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2f3542',
  },
  mapCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
  },
  mapImage: {
    height: 120,
    width: '100%',
  },
  mapInfo: {
    padding: 10,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2f3542',
  },
  mapText: {
    fontSize: 12,
    color: '#57606f',
    marginTop: 2,
  },
  mapHint: {
    fontSize: 12,
    color: '#1e90ff',
    marginTop: 4,
    fontWeight: '600',
  },
  footerButtons: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 3,
  },
  footerButtonText: {
    color: '#f5f6fa',
    fontWeight: 'bold',
  },
});
