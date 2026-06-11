// src/screens/AdminInfoScreen.js
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import auth from '@react-native-firebase/auth';

const InformasiScreen = ({navigation}) => {
  const user = auth().currentUser;

  const logout = async () => {
    try {
      await auth().signOut();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (err) {
      console.log('[AdminInfo] logout error:', err);
    }
  };

  const goToDashboard = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#07575b" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 24}}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Informasi Admin</Text>
          <Text style={styles.headerSubtitle}>{user?.email || 'Admin'}</Text>
        </View>

        {/* CARD WELCOME */}
        <View style={styles.cardHighlight}>
          <Text style={styles.cardHighlightTitle}>
            Selamat datang, Admin 👑
          </Text>
          <Text style={styles.cardHighlightText}>
            Halaman ini berisi informasi penting mengenai penggunaan aplikasi
            pendataan pemakaman. Gunakan sebagai panduan saat mengelola data.
          </Text>
          <TouchableOpacity
            style={styles.highlightButton}
            onPress={goToDashboard}>
            <Text style={styles.highlightButtonText}>Buka Dashboard</Text>
          </TouchableOpacity>
        </View>

        {/* INFO SECTION 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tanggung Jawab Admin</Text>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Memverifikasi akun user baru dan memastikan role (admin/user)
              sudah sesuai.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Mengawasi data pemakaman yang diinput oleh petugas lapangan, dan
              menghapus data yang tidak valid.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>
              Menjaga kerahasiaan kredensial admin dan tidak membagikannya
              kepada pihak lain.
            </Text>
          </View>
        </View>

        {/* INFO SECTION 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alur Kerja Singkat</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepNumberWrapper}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.stepTitle}>Login sebagai Admin</Text>
              <Text style={styles.stepText}>
                Masuk menggunakan akun admin yang sudah terdaftar. Sistem akan
                otomatis mengarahkan ke halaman Home Admin.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumberWrapper}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.stepTitle}>Pantau Dashboard</Text>
              <Text style={styles.stepText}>
                Cek jumlah user, admin, dan total data pemakaman. Pastikan tidak
                ada aktivitas yang mencurigakan.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumberWrapper}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.stepTitle}>Kelola Data Pemakaman</Text>
              <Text style={styles.stepText}>
                Lakukan pengecekan rutin terhadap data baru: nama jenazah, blok,
                nomor makam, dan penanggung jawab.
              </Text>
            </View>
          </View>
        </View>

        {/* INFO SECTION 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips Keamanan</Text>
          <Text style={styles.infoText}>
            • Jangan menggunakan password yang sama dengan akun lain.{'\n'}•
            Rutin ganti password dan keluar (logout) setelah selesai menggunakan
            aplikasi.{'\n'}• Jika menemukan data yang tidak wajar, segera
            evaluasi dan konfirmasi ke petugas terkait.
          </Text>
        </View>

        {/* INFO SECTION 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontak Bantuan</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Tim IT</Text>
            <Text style={styles.contactValue}>it-support@jakarta.go.id</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Admin Utama</Text>
            <Text style={styles.contactValue}>+62 812-3456-7890</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Jam Layanan</Text>
            <Text style={styles.contactValue}>Senin–Jumat, 08.00–16.00</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default InformasiScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e272e',
  },
  container: {
    flex: 1,
    backgroundColor: '#E4EEF1FF',
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
    fontSize: 13,
    marginTop: 2,
  },
  cardHighlight: {
    marginHorizontal: 16,
    marginTop: -30,
    backgroundColor: '#3742fa',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
  },
  cardHighlightTitle: {
    color: '#f5f6fa',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardHighlightText: {
    color: '#dcdde1',
    fontSize: 13,
    marginBottom: 12,
  },
  highlightButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2ed573',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  highlightButtonText: {
    color: '#f5f6fa',
    fontWeight: 'bold',
    fontSize: 13,
  },
  section: {
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2f3542',
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e90ff',
    marginTop: 6,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#57606f',
  },
  stepItem: {
    flexDirection: 'row',
    marginTop: 10,
  },
  stepNumberWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e90ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 3,
  },
  stepNumber: {
    color: '#f5f6fa',
    fontWeight: 'bold',
    fontSize: 13,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f3542',
  },
  stepText: {
    fontSize: 13,
    color: '#57606f',
  },
  infoText: {
    fontSize: 13,
    color: '#57606f',
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  contactLabel: {
    fontSize: 13,
    color: '#57606f',
  },
  contactValue: {
    fontSize: 13,
    color: '#2f3542',
    fontWeight: '600',
  },
  footerButtons: {
    marginTop: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 3,
  },
  footerButtonText: {
    color: '#f5f6fa',
    fontWeight: 'bold',
  },
});
