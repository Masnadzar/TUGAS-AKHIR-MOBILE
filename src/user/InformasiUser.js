// src/screens/UserInfoScreen.js
import React, {useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
  Image,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Ionicons from 'react-native-vector-icons/Ionicons';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Data panduan penggunaan, dipisah per menu tab user ────────────
const GUIDE_SECTIONS = [
  {
    key: 'home',
    icon: 'home-outline',
    title: 'Beranda',
    items: [
      'Menampilkan ringkasan jumlah permohonan yang sudah Anda ajukan, dikelompokkan menjadi 3 jenis: Makam Baru, Perpanjangan, dan Ijin Tumpang.',
      'Ketuk salah satu jenis permohonan untuk melihat data yang sudah Anda input, termasuk foto yang diunggah.',
      'Setiap kartu permohonan bisa dibuka untuk melihat status terkini: Pending, Diverifikasi, atau Ditolak.',
    ],
  },
  {
    key: 'ajukan',
    icon: 'document-text-outline',
    title: 'Mengajukan Permohonan',
    items: [
      'Pilih jenis permohonan yang sesuai kebutuhan: Makam Baru untuk jenazah yang baru meninggal, Perpanjangan untuk memperpanjang masa pakai makam, atau Ijin Tumpang untuk memakamkan jenazah baru pada makam keluarga yang sudah terpakai.',
      'Isi data jenazah dengan lengkap dan benar sesuai dokumen resmi.',
      'Unggah dokumen pendukung seperti KTP, KK, surat kematian, dan surat medis agar proses verifikasi oleh admin lebih cepat.',
      'Setelah dikirim, permohonan akan berstatus Pending sampai diperiksa oleh admin.',
    ],
  },
  {
    key: 'informasi',
    icon: 'information-circle-outline',
    title: 'Informasi',
    items: [
      'Berisi panduan penggunaan aplikasi ini, etika di area pemakaman, jam berkunjung, kontak admin, serta lokasi makam pada peta.',
    ],
  },
  {
    key: 'profile',
    icon: 'person-circle-outline',
    title: 'Profile',
    items: [
      'Menampilkan data akun Anda sebagai ahli waris dan menyediakan opsi keluar (logout) dari aplikasi.',
      'Sebagian data seperti NIK dan tanggal lahir bersifat terkunci dan tidak bisa diubah setelah registrasi.',
    ],
  },
];

const ETIKA = [
  'Jaga ketenangan dan tidak berisik selama berada di area pemakaman.',
  'Jaga kebersihan, jangan buang sampah sembarangan.',
  'Gunakan pakaian yang sopan saat berkunjung.',
  'Hormati peziarah lain dan petugas pemakaman.',
  'Ikuti petunjuk petugas saat proses pemakaman berlangsung.',
];

const TIPS = [
  'Pastikan dokumen yang diunggah jelas dan tidak buram agar tidak perlu mengajukan ulang.',
  'Pantau status permohonan secara berkala di halaman Beranda.',
  'Segera hubungi admin apabila permohonan Anda ditolak untuk mengetahui alasannya.',
];

export default function UserInfoScreen({navigation}) {
  const user = auth().currentUser;
  const [openSection, setOpenSection] = useState('ajukan');

  const toggleSection = key => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection(prev => (prev === key ? null : key));
  };

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
      <StatusBar backgroundColor="#1a3c5e" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 30}}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Informasi Ahli Waris</Text>
          <Text style={styles.headerSubtitle}>{user?.email || 'User'}</Text>
        </View>

        {/* ── PANDUAN PENGGUNAAN ── */}
        <Text style={styles.groupLabel}>Panduan Penggunaan Aplikasi</Text>
        <View style={styles.accordionWrap}>
          {GUIDE_SECTIONS.map(section => {
            const open = openSection === section.key;
            return (
              <View key={section.key} style={styles.accordionItem}>
                <TouchableOpacity
                  style={styles.accordionHeader}
                  activeOpacity={0.7}
                  onPress={() => toggleSection(section.key)}>
                  <View style={styles.accordionIconWrap}>
                    <Ionicons name={section.icon} size={18} color="#1a3c5e" />
                  </View>
                  <Text style={styles.accordionTitle}>{section.title}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#999"
                  />
                </TouchableOpacity>

                {open && (
                  <View style={styles.accordionBody}>
                    {section.items.map((text, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{text}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── ETIKA DI AREA PEMAKAMAN ── */}
        <Text style={styles.groupLabel}>Etika di Area Pemakaman</Text>
        <View style={styles.card}>
          {ETIKA.map((text, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <View style={[styles.bulletDot, {backgroundColor: '#1a3c5e'}]} />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── TIPS MENGAJUKAN PERMOHONAN ── */}
        <Text style={styles.groupLabel}>Tips Mengajukan Permohonan</Text>
        <View style={styles.card}>
          {TIPS.map((text, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#2ed573"
                style={{marginTop: 2, marginRight: 8}}
              />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── JAM BERKUNJUNG & KONTAK ── */}
        <Text style={styles.groupLabel}>Jam Berkunjung & Kontak Admin</Text>
        <View style={styles.card}>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Jam Kunjung</Text>
            <Text style={styles.contactValue}>07.00 – 17.00 WIB</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Admin Pemakaman</Text>
            <Text style={styles.contactValue}>0812-3456-7890</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>admin@tpukota.go.id</Text>
          </View>
        </View>

        {/* ── LOKASI MAKAM PADA MAPS ── */}
        <Text style={styles.groupLabel}>Lokasi Makam pada Maps</Text>
        <TouchableOpacity
          style={styles.mapCard}
          onPress={() => openMaps(-6.3297724, 106.8981871, 'TPU Cipayung')}
          activeOpacity={0.85}>
          <Image source={require('./map.jpeg')} style={styles.mapImage} />
          <View style={styles.mapInfo}>
            <View style={styles.mapTitleRow}>
              <Ionicons name="location-outline" size={16} color="#1a3c5e" />
              <Text style={styles.mapTitle}>TPU Cipayung</Text>
            </View>
            <Text style={styles.mapText}>
              Ketuk untuk membuka lokasi ini di Google Maps. Ubah tampilan ke
              Satellite agar terlihat dari atas dan memudahkan pencarian blok
              makam.
            </Text>
            <View style={styles.mapHintRow}>
              <Text style={styles.mapHint}>Buka di Google Maps</Text>
              <Ionicons name="open-outline" size={14} color="#1e90ff" />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#1a3c5e'},
  container: {flex: 1, backgroundColor: '#f1f2f6'},

  header: {
    backgroundColor: '#1a3c5e',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 22,
  },
  headerTitle: {color: '#ffffff', fontSize: 20, fontWeight: '700'},
  headerSubtitle: {color: '#c8d6e5', fontSize: 13, marginTop: 4},

  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8395a7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    elevation: 1,
  },

  // ── Accordion ──
  accordionWrap: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f4',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  accordionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#eef3f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2f3542',
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingLeft: 54,
  },

  bulletRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e90ff',
    marginTop: 6,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#57606f',
  },

  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  contactLabel: {fontSize: 13, color: '#8395a7'},
  contactValue: {fontSize: 13, color: '#2f3542', fontWeight: '600'},
  divider: {height: 1, backgroundColor: '#eef1f4'},

  // ── Maps ──
  mapCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  mapImage: {
    height: 130,
    width: '100%',
  },
  mapInfo: {padding: 12},
  mapTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  mapTitle: {fontSize: 14, fontWeight: '700', color: '#2f3542'},
  mapText: {fontSize: 12, color: '#57606f', marginTop: 4, lineHeight: 17},
  mapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  mapHint: {fontSize: 12, color: '#1e90ff', fontWeight: '600'},
});
