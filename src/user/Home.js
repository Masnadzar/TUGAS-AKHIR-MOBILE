import React, {useEffect, useState, useCallback} from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ── Palet warna ──────────────────────────────────────────────────
const C = {
  bg: '#0b1120',
  hijau: '#00c853',
  biru: '#448aff',
  ungu: '#7c4dff',
  oranye: '#ff9100',
  merah: '#ff5252',
  putih: '#f5f5f5',
  abu: '#90a4ae',
  abuGelap: '#546e7a',
  garis: '#eceff1',
  teksUtama: '#1a2535',
};

// ── Definisi 3 jenis permohonan, dipetakan ke collection & layar aslinya ──
const JENIS = {
  baru: {
    key: 'baru',
    label: 'Makam Baru',
    warna: C.hijau,
    icon: 'add-circle-outline',
    collection: 'burials',
    formScreen: 'UserBurialForm',
  },
  perpanjangan: {
    key: 'perpanjangan',
    label: 'Perpanjangan',
    warna: C.biru,
    icon: 'refresh-circle-outline',
    collection: 'perpanjangan',
    formScreen: 'PerpanjanganForm',
  },
  tumpang: {
    key: 'tumpang',
    label: 'Ijin Tumpang',
    warna: C.ungu,
    icon: 'people-circle-outline',
    collection: 'tumpangan',
    formScreen: 'TumpanganForm',
  },
};

const formatTgl = val => {
  if (!val) return '-';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
};

const warnaBadge = status => {
  switch (status) {
    case 'verified':
      return {bg: C.hijau, label: 'Diverifikasi'};
    case 'rejected':
      return {bg: C.merah, label: 'Ditolak'};
    default:
      return {bg: C.oranye, label: 'Pending'};
  }
};

// ── Kartu statistik ringkas ─────────────────────────────────────────
const StatCard = ({label, value, warna}) => (
  <View style={[styles.statCard, {borderLeftColor: warna}]}>
    <Text style={[styles.statAngka, {color: warna}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ================================================================
// MAIN SCREEN
// ================================================================
export default function HomeUserScreen({navigation}) {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null);
  const [jenisAktif, setJenisAktif] = useState('baru');

  // Data per collection asli — TIDAK digabung jadi satu, karena field-nya
  // memang berbeda antar jenis permohonan.
  const [dataBaru, setDataBaru] = useState([]);
  const [dataPerpanjangan, setDataPerpanjangan] = useState([]);
  const [dataTumpangan, setDataTumpangan] = useState([]);

  const user = auth().currentUser;

  // ── Ambil profil user ────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
      return;
    }
    firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then(snap => {
        if (snap.exists) setProfil(snap.data());
      })
      .catch(() => {});
  }, []);

  // ── Dengarkan 3 collection sekaligus, realtime ────────────────────
  // TANPA orderBy pada query (hanya where createdBy), lalu diurutkan manual
  // di JS -- supaya tidak butuh composite index Firestore. Karena realtime,
  // data baru yang baru saja diinput lewat form otomatis langsung muncul
  // di Home tanpa perlu refresh manual.
  useEffect(() => {
    if (!user) return;

    const sortDesc = (a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    };

    const unsubBaru = firestore()
      .collection('burials')
      .where('createdBy', '==', user.uid)
      .onSnapshot(
        snap => {
          const arr = [];
          snap.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
          setDataBaru(arr.sort(sortDesc));
          setLoading(false);
        },
        err => {
          console.log('[HomeUser] burials err', err);
          setLoading(false);
        },
      );

    const unsubPerpanjangan = firestore()
      .collection('perpanjangan')
      .where('createdBy', '==', user.uid)
      .onSnapshot(
        snap => {
          const arr = [];
          snap.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
          setDataPerpanjangan(arr.sort(sortDesc));
        },
        err => console.log('[HomeUser] perpanjangan err', err),
      );

    const unsubTumpangan = firestore()
      .collection('tumpangan')
      .where('createdBy', '==', user.uid)
      .onSnapshot(
        snap => {
          const arr = [];
          snap.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
          setDataTumpangan(arr.sort(sortDesc));
        },
        err => console.log('[HomeUser] tumpangan err', err),
      );

    return () => {
      unsubBaru();
      unsubPerpanjangan();
      unsubTumpangan();
    };
  }, [user]);

  const handleLogout = () => {
    Alert.alert('Konfirmasi', 'Yakin ingin logout?', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth().signOut();
            navigation.reset({index: 0, routes: [{name: 'Login'}]});
          } catch {
            Alert.alert('Error', 'Gagal logout');
          }
        },
      },
    ]);
  };

  const namaUser = profil?.name || user?.email?.split('@')[0] || 'User';

  const listPerJenis = {
    baru: dataBaru,
    perpanjangan: dataPerpanjangan,
    tumpang: dataTumpangan,
  };
  const daftarTampil = listPerJenis[jenisAktif] || [];

  // ── Tombol "+ Ajukan" mengarah ke layar yang benar sesuai jenisAktif.
  // Untuk Perpanjangan/Tumpangan, otomatis dihubungkan ke data Makam Baru
  // milik user (persis logika yang sama dengan CreateMenu.js di tab Create). ──
  const handleAjukan = () => {
    const jenis = JENIS[jenisAktif];

    if (jenis.key === 'baru') {
      navigation.navigate('Create', {screen: jenis.formScreen});
      return;
    }

    // Perpanjangan & Tumpangan butuh data makam lama untuk dihubungkan
    if (dataBaru.length === 0) {
      navigation.navigate('Create', {
        screen: jenis.formScreen,
        params: {linkedBurialId: null},
      });
      return;
    }
    if (dataBaru.length === 1) {
      navigation.navigate('Create', {
        screen: jenis.formScreen,
        params: {linkedBurialId: dataBaru[0].id},
      });
      return;
    }
    // Lebih dari 1 data makam -> biarkan user memilih
    navigation.navigate('Create', {
      screen: 'PilihDataLama',
      params: {target: jenis.formScreen, burials: dataBaru},
    });
  };

  // ── Navigasi ke layar detail sesuai jenis — satu tap langsung buka,
  // konsisten untuk ketiga jenis permohonan. Makam Baru -> BurialDetail
  // (mendukung edit + dokumen). Perpanjangan & Tumpangan -> PengajuanDetail
  // (mendukung edit selama status masih 'pending', sama seperti Makam Baru). ──
  const bukaDetail = item => {
    if (jenisAktif === 'baru') {
      navigation.navigate('BurialDetail', {id: item.id});
    } else {
      navigation.navigate('PengajuanDetail', {
        id: item.id,
        collection: JENIS[jenisAktif].collection,
      });
    }
  };

  // ── Render satu kartu, field ringkasan disesuaikan per jenis ──────────
  const renderKartu = ({item}) => {
    const {bg, label} = warnaBadge(item.status);
    const bisaEdit = item.status === 'pending';

    // Field ringkasan disamakan persis dengan field yang ditulis oleh
    // form pengajuan (UserBurialForm / PerpanjanganForm / TumpanganForm)
    // dan yang ditampilkan di PengajuanDetail.js, supaya data konsisten
    // dan tidak muncul kosong.
    let subteks = '-';
    if (jenisAktif === 'baru') {
      subteks = `Wafat: ${item.tglWafat || '-'}`;
    } else if (jenisAktif === 'perpanjangan') {
      subteks = `Ahli waris: ${item.heirName || '-'}`;
    } else if (jenisAktif === 'tumpang') {
      subteks = `Blok lama: ${item.assignedBlockLama || '-'}`;
    }

    return (
      <TouchableOpacity
        style={styles.kartu}
        onPress={() => bukaDetail(item)}
        activeOpacity={0.85}>
        <View style={styles.kartuHeader}>
          <View
            style={[
              styles.kartuIconWrap,
              {backgroundColor: JENIS[jenisAktif].warna + '18'},
            ]}>
            <Ionicons
              name={JENIS[jenisAktif].icon}
              size={22}
              color={JENIS[jenisAktif].warna}
            />
          </View>

          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={styles.kartuNama} numberOfLines={1}>
              {item.deceasedName || item.heirName || '(nama kosong)'}
            </Text>
            <Text style={styles.kartuSub} numberOfLines={1}>
              {subteks}
            </Text>
            <Text style={styles.kartuTgl}>
              Diajukan: {formatTgl(item.createdAt)}
            </Text>
          </View>

          <View style={{alignItems: 'flex-end'}}>
            <View style={[styles.badge, {backgroundColor: bg}]}>
              <Text style={styles.badgeTeks}>{label}</Text>
            </View>
            {bisaEdit && (
              <View style={styles.editHint}>
                <Ionicons name="create-outline" size={11} color={C.abuGelap} />
                <Text style={styles.editHintTeks}>Bisa diedit</Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={C.abu}
              style={{marginTop: 6}}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        <View style={styles.pusatLayar}>
          <ActivityIndicator size="large" color={C.hijau} />
          <Text style={styles.loadingTeks}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{paddingBottom: 40}}
        showsVerticalScrollIndicator={false}>
        {/* ── HEADER ── */}
        <View style={styles.hero}>
          <View style={styles.profilKartu}>
            <View style={styles.profilAvatar}>
              <Text style={styles.profilAvatarTeks}>
                {namaUser.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.profilSalam}>Selamat datang</Text>
              <Text style={styles.profilNama} numberOfLines={1}>
                {namaUser}
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutTeks}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STATISTIK ── */}
        <View style={styles.seksiPadding}>
          <View style={styles.statBaris}>
            <StatCard
              label="Makam Baru"
              value={dataBaru.length}
              warna={JENIS.baru.warna}
            />
            <StatCard
              label="Perpanjangan"
              value={dataPerpanjangan.length}
              warna={JENIS.perpanjangan.warna}
            />
            <StatCard
              label="Ijin Tumpang"
              value={dataTumpangan.length}
              warna={JENIS.tumpang.warna}
            />
          </View>
        </View>

        {/* ── SELECTOR JENIS ── */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>Jenis Permohonan</Text>
          <View style={styles.jenisGrid}>
            {Object.values(JENIS).map(j => {
              const aktif = jenisAktif === j.key;
              return (
                <TouchableOpacity
                  key={j.key}
                  style={[
                    styles.jenisBtn,
                    aktif && {backgroundColor: j.warna, borderColor: j.warna},
                    !aktif && {borderColor: j.warna + '55'},
                  ]}
                  onPress={() => setJenisAktif(j.key)}
                  activeOpacity={0.85}>
                  <Ionicons
                    name={j.icon}
                    size={22}
                    color={aktif ? '#fff' : j.warna}
                  />
                  <Text
                    style={[
                      styles.jenisBtnLabel,
                      {color: aktif ? '#fff' : j.warna},
                    ]}>
                    {j.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── TOMBOL AJUKAN — sesuai jenis aktif ── */}
        <View style={styles.seksiPadding}>
          <TouchableOpacity
            style={[
              styles.tombolAjukan,
              {backgroundColor: JENIS[jenisAktif].warna},
            ]}
            onPress={handleAjukan}>
            <Text style={styles.tombolAjukanTeks}>
              Ajukan {JENIS[jenisAktif].label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── DAFTAR DATA SESUAI JENIS AKTIF ── */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>
            Data {JENIS[jenisAktif].label} Saya ({daftarTampil.length})
          </Text>

          {daftarTampil.length === 0 ? (
            <View style={styles.kosongBox}>
              <Text style={styles.kosongTeks}>Belum ada data</Text>
              <Text style={styles.kosongSub}>
                Data {JENIS[jenisAktif].label.toLowerCase()} yang Anda ajukan
                akan muncul di sini dan bisa langsung ditekan untuk melihat
                detail lengkap serta diedit selama masih berstatus Pending.
              </Text>
            </View>
          ) : (
            <FlatList
              data={daftarTampil}
              keyExtractor={i => i.id}
              renderItem={renderKartu}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.bg},
  scroll: {flex: 1, backgroundColor: '#f4f5f7'},
  pusatLayar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  loadingTeks: {color: C.putih, marginTop: 12, fontSize: 14},

  hero: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  profilKartu: {flexDirection: 'row', alignItems: 'center', gap: 12},
  profilAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilAvatarTeks: {color: C.hijau, fontSize: 20, fontWeight: 'bold'},
  profilSalam: {color: C.abu, fontSize: 12},
  profilNama: {color: C.putih, fontSize: 17, fontWeight: 'bold', marginTop: 2},
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff10',
  },
  logoutTeks: {color: C.putih, fontSize: 12, fontWeight: '600'},

  seksiPadding: {paddingHorizontal: 14, marginTop: 14},
  judulSeksi: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.teksUtama,
    marginBottom: 10,
  },

  statBaris: {flexDirection: 'row', gap: 10},
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    elevation: 1,
  },
  statAngka: {fontSize: 22, fontWeight: 'bold'},
  statLabel: {fontSize: 10, color: C.abuGelap, marginTop: 3},

  jenisGrid: {flexDirection: 'row', gap: 10},
  jenisBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 6,
  },
  jenisBtnLabel: {fontSize: 11, fontWeight: '700', textAlign: 'center'},

  tombolAjukan: {borderRadius: 12, paddingVertical: 13, alignItems: 'center'},
  tombolAjukanTeks: {color: '#fff', fontWeight: 'bold', fontSize: 14},

  kartu: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
  },
  kartuHeader: {flexDirection: 'row', alignItems: 'center', padding: 12},
  kartuIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kartuNama: {fontSize: 14, fontWeight: 'bold', color: C.teksUtama},
  kartuSub: {fontSize: 11, color: C.abuGelap, marginTop: 2},
  kartuTgl: {fontSize: 10, color: C.abu, marginTop: 3},

  badge: {borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3},
  badgeTeks: {color: '#fff', fontSize: 9, fontWeight: 'bold'},

  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 3,
  },
  editHintTeks: {fontSize: 9, color: C.abuGelap, fontWeight: '600'},

  kosongBox: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  kosongTeks: {fontSize: 14, color: '#37474f', fontWeight: '600'},
  kosongSub: {
    fontSize: 12,
    color: C.abu,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
