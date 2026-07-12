// src/admin/Informasi.js
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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Ionicons from 'react-native-vector-icons/Ionicons';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Data panduan penggunaan, dipisah per menu tab admin ───────────
const GUIDE_SECTIONS = [
  {
    key: 'home',
    icon: 'home-outline',
    title: 'Home — Dashboard',
    items: [
      'Menampilkan ringkasan jumlah user, admin, dan total data pemakaman yang terdaftar.',
      'Gunakan halaman ini sebagai pemeriksaan cepat setiap kali login, sebelum masuk ke menu Data.',
    ],
  },
  {
    key: 'data',
    icon: 'reader-outline',
    title: 'Data — Verifikasi Pengajuan',
    items: [
      'Menu Data memiliki 3 kategori tab: Makam Baru, Perpanjangan, dan Ijin Tumpang. Setiap tab menampilkan jumlah pengajuan berstatus pending pada badge angka di sebelah nama tab.',
      'Ketuk salah satu entri untuk membuka detail lengkap: data jenazah, data ahli waris, dan dokumen pendukung yang diunggah user.',
      'Ketuk thumbnail dokumen untuk melihat versi penuh sebelum memutuskan verifikasi.',
      'Isi Blok Makam, Nomor Makam, dan Catatan Lokasi, lalu pilih Verifikasi untuk menyetujui, atau Tolak jika data tidak valid.',
      'Khusus pengajuan Perpanjangan yang disetujui, data blok dan nomor makam pada catatan pemakaman asal akan ikut diperbarui secara otomatis.',
    ],
  },
  {
    key: 'informasi',
    icon: 'information-circle-outline',
    title: 'Informasi',
    items: [
      'Berisi panduan penggunaan aplikasi ini serta kontak bantuan apabila admin mengalami kendala teknis.',
    ],
  },
  {
    key: 'profile',
    icon: 'person-circle-outline',
    title: 'Profile',
    items: [
      'Menampilkan data akun admin yang sedang login dan menyediakan opsi keluar (logout) dari aplikasi.',
    ],
  },
];

const RESPONSIBILITIES = [
  'Memverifikasi setiap pengajuan pemakaman, perpanjangan sewa, dan ijin tumpang sebelum status berubah menjadi disetujui.',
  'Memastikan blok dan nomor makam yang diberikan tidak bentrok dengan makam lain yang sudah terisi.',
  'Memeriksa kelengkapan dan keaslian dokumen yang diunggah sebelum menyetujui pengajuan.',
  'Menjaga kerahasiaan kredensial akun admin dan tidak membagikannya kepada pihak yang tidak berwenang.',
];

const SECURITY_TIPS = [
  'Gunakan password yang berbeda dari akun lain dan ganti secara berkala.',
  'Selalu logout setelah selesai menggunakan aplikasi, terutama pada perangkat bersama.',
  'Segera tindak lanjuti apabila menemukan data atau pengajuan yang terlihat tidak wajar.',
];

export default function InformasiScreen({navigation}) {
  const user = auth().currentUser;
  const [openSection, setOpenSection] = useState('data');

  const toggleSection = key => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection(prev => (prev === key ? null : key));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1a3c5e" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 30}}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Informasi Admin</Text>
          <Text style={styles.headerSubtitle}>{user?.email || 'Admin'}</Text>
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

        {/* ── TANGGUNG JAWAB ADMIN ── */}
        <Text style={styles.groupLabel}>Tanggung Jawab Admin</Text>
        <View style={styles.card}>
          {RESPONSIBILITIES.map((text, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <View style={[styles.bulletDot, {backgroundColor: '#1a3c5e'}]} />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── TIPS KEAMANAN ── */}
        <Text style={styles.groupLabel}>Tips Keamanan</Text>
        <View style={styles.card}>
          {SECURITY_TIPS.map((text, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#2ed573"
                style={{marginTop: 2, marginRight: 8}}
              />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── KONTAK BANTUAN ── */}
        <Text style={styles.groupLabel}>Kontak Bantuan</Text>
        <View style={styles.card}>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Tim IT</Text>
            <Text style={styles.contactValue}>it-support@jakarta.go.id</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Admin Utama</Text>
            <Text style={styles.contactValue}>+62 812-3456-7890</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Jam Layanan</Text>
            <Text style={styles.contactValue}>
              Senin – Minggu, 08.00 – 16.00
            </Text>
          </View>
        </View>
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
});
