// src/admin/Home.js
import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ── Warna tema ──────────────────────────────────────────────────
const C = {
  bg: '#0f1923',
  hijau: '#00c853',
  biru: '#2979ff',
  oranye: '#ff9f1a',
  merah: '#ff5252',
  abu: '#b0bec5',
  putih: '#f5f5f5',
  pending: '#ff9f1a',
  verified: '#00c853',
  rejected: '#ff5252',
};

// ── Konfigurasi 3 kategori pengajuan ──────────────────────────
const CATEGORIES = [
  {
    key: 'burials',
    label: 'Makam Baru',
    icon: 'add-circle-outline',
    color: C.biru,
    assignTarget: 'Assign',
  },
  {
    key: 'perpanjangan',
    label: 'Perpanjangan',
    icon: 'refresh-circle-outline',
    color: C.oranye,
    assignTarget: 'AssignExtra',
  },
  {
    key: 'tumpangan',
    label: 'Ijin Tumpang',
    icon: 'people-circle-outline',
    color: C.hijau,
    assignTarget: 'AssignExtra',
  },
];

// ── Helper format waktu ─────────────────────────────────────────
const formatWaktu = val => {
  if (!val) return '-';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const warnaBadge = status => {
  switch (status) {
    case 'verified':
      return {bg: C.verified, teks: 'Diverifikasi'};
    case 'rejected':
      return {bg: C.rejected, teks: 'Ditolak'};
    default:
      return {bg: C.pending, teks: 'Pending'};
  }
};

// ── Kartu statistik ──────────────────────────────────────────────
const StatCard = ({icon, label, value, warna, sub}) => (
  <View style={[styles.statCard, {borderLeftColor: warna}]}>
    <View style={[styles.statIconWrap, {backgroundColor: warna + '1a'}]}>
      <Ionicons name={icon} size={20} color={warna} />
    </View>
    <View style={{flex: 1}}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  </View>
);

export default function HomeAdminScreen({navigation}) {
  const [loading, setLoading] = useState(true);
  const [adminNama, setAdminNama] = useState('Admin');

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalUserBiasa, setTotalUserBiasa] = useState(0);

  // Data & jumlah per kategori: { burials: {list, pending, verified, rejected}, ... }
  const [dataByCategory, setDataByCategory] = useState({
    burials: {list: [], pending: [], verified: 0, rejected: 0},
    perpanjangan: {list: [], pending: [], verified: 0, rejected: 0},
    tumpangan: {list: [], pending: [], verified: 0, rejected: 0},
  });

  const [activeTab, setActiveTab] = useState('burials'); // kategori pending yang ditampilkan
  const [expandId, setExpandId] = useState(null);

  useEffect(() => {
    const currentUser = auth().currentUser;
    if (currentUser?.uid) {
      firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get()
        .then(snap => {
          const d = snap.data();
          if (d?.name) setAdminNama(d.name);
        })
        .catch(() => {});
    }

    const unsubUsers = firestore()
      .collection('users')
      .onSnapshot(
        snap => {
          let a = 0,
            u = 0;
          snap.forEach(doc => {
            const d = doc.data() || {};
            if (d.role === 'admin') a++;
            else u++;
          });
          setTotalUsers(snap.size);
          setTotalAdmins(a);
          setTotalUserBiasa(u);
        },
        err => console.log('[HomeAdmin] users err', err),
      );

    // Dengarkan 3 collection sekaligus. TANPA orderBy pada query (hanya .get semua
    // dokumen collection), lalu diurutkan & difilter status secara manual di JS —
    // supaya tidak butuh composite index (konsisten dengan perbaikan sebelumnya).
    const unsubsCategory = CATEGORIES.map(cat =>
      firestore()
        .collection(cat.key)
        .onSnapshot(
          snap => {
            const arr = [];
            snap.forEach(doc => arr.push({id: doc.id, ...doc.data()}));

            const byTime = (a, b) => {
              const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
              const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
              return ta - tb;
            };

            const pendingList = arr
              .filter(d => d.status === 'pending')
              .sort(byTime);
            const verifiedCount = arr.filter(
              d => d.status === 'verified',
            ).length;
            const rejectedCount = arr.filter(
              d => d.status === 'rejected',
            ).length;
            const recentList = [...arr]
              .sort((a, b) => byTime(b, a))
              .slice(0, 10);

            setDataByCategory(prev => ({
              ...prev,
              [cat.key]: {
                list: recentList,
                pending: pendingList,
                verified: verifiedCount,
                rejected: rejectedCount,
              },
            }));
            setLoading(false);
          },
          err => console.log(`[HomeAdmin] ${cat.key} err`, err),
        ),
    );

    return () => {
      unsubUsers();
      unsubsCategory.forEach(u => u());
    };
  }, []);

  const handleLogout = () => {
    Alert.alert('Konfirmasi Logout', 'Apakah Anda yakin ingin keluar?', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth().signOut();
            navigation.reset({index: 0, routes: [{name: 'Login'}]});
          } catch (err) {
            Alert.alert('Error', 'Gagal logout');
          }
        },
      },
    ]);
  };

  const goToVerify = (categoryKey, id) => {
    const cat = CATEGORIES.find(c => c.key === categoryKey);
    if (!cat || !id) return Alert.alert('Error', 'Data tidak valid');
    if (cat.assignTarget === 'Assign') {
      navigation.navigate('Assign', {id});
    } else {
      navigation.navigate('AssignExtra', {id, collection: categoryKey});
    }
  };

  const toggleExpand = id => setExpandId(prev => (prev === id ? null : id));

  // Total pending gabungan 3 kategori
  const totalPendingSemua = CATEGORIES.reduce(
    (sum, c) => sum + (dataByCategory[c.key]?.pending.length || 0),
    0,
  );
  const totalBurialLike =
    (dataByCategory.burials.list.length || 0) +
    dataByCategory.burials.verified +
    dataByCategory.burials.rejected +
    dataByCategory.burials.pending.length;

  const activeCat = CATEGORIES.find(c => c.key === activeTab);
  const activePendingList = dataByCategory[activeTab]?.pending || [];

  // ── Render 1 baris info kecil ─────────────────────────────────
  const InfoBaris = ({label, value}) => (
    <View style={styles.infoBaris}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );

  // ── Render item pending (kategori manapun) ────────────────────
  const renderPendingItem = ({item}) => {
    const isExpand = expandId === item.id;
    return (
      <View style={styles.burialCard}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}
          style={styles.burialCardHeader}>
          <View style={styles.burialCardLeft}>
            <View
              style={[styles.avatarBulat, {backgroundColor: activeCat.color}]}>
              <Text style={styles.avatarTeks}>
                {(item.deceasedName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.namaJenazah} numberOfLines={1}>
                {item.deceasedName || '(nama kosong)'}
              </Text>
              <Text style={styles.subJenazah}>
                Ahli waris: {item.heirName || '-'}
              </Text>
              <Text style={styles.subJenazah}>
                {formatWaktu(item.createdAt)}
              </Text>
            </View>
          </View>
          <View style={{alignItems: 'flex-end', gap: 6}}>
            <View
              style={[
                styles.badge,
                {backgroundColor: warnaBadge(item.status).bg},
              ]}>
              <Text style={styles.badgeTeks}>
                {warnaBadge(item.status).teks}
              </Text>
            </View>
            <Ionicons
              name={isExpand ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#90a4ae"
            />
          </View>
        </TouchableOpacity>

        {isExpand && (
          <View style={styles.expandArea}>
            <View style={styles.expandDivider} />
            <InfoBaris label="NIK Jenazah" value={item.nikJenazah} />
            <InfoBaris label="No. Telepon" value={item.noTelepon} />
            <InfoBaris label="Alamat" value={item.alamat} />
            {item.assignedBlock && (
              <InfoBaris
                label="Blok Terkait"
                value={`${item.assignedBlock || '-'} / No. ${
                  item.assignedGraveNumber || '-'
                }`}
              />
            )}
            {item.notes ? (
              <InfoBaris label="Catatan" value={item.notes} />
            ) : null}

            <View style={styles.aksiRow}>
              <TouchableOpacity
                style={[styles.tombolAksi, {backgroundColor: activeCat.color}]}
                onPress={() => goToVerify(activeTab, item.id)}>
                <Text style={styles.tombolAksiTeks}>Verifikasi Sekarang</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        <View style={styles.pusatLayar}>
          <ActivityIndicator size="large" color={C.hijau} />
          <Text style={styles.loadingTeks}>Memuat dashboard...</Text>
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
        {/* ── HERO HEADER ── */}
        <View style={styles.hero}>
          <View style={styles.heroKiri}>
            <Text style={styles.heroSalam}>Selamat datang</Text>
            <Text style={styles.heroNama}>{adminNama}</Text>
            <View style={styles.heroBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={C.hijau}
              />
              <Text style={styles.heroBadgeTeks}>Administrator</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={C.merah} />
            <Text style={styles.logoutTeks}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ── STAT CARDS ── */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>Statistik</Text>
          <View style={styles.statBaris}>
            <StatCard
              icon="people-outline"
              label="Total Akun"
              value={totalUsers}
              warna={C.biru}
              sub={`${totalAdmins} Admin • ${totalUserBiasa} User`}
            />
            <StatCard
              icon="documents-outline"
              label="Total Pengajuan"
              value={totalBurialLike}
              warna={C.hijau}
            />
          </View>

          {/* Ringkasan per kategori */}
          <View style={styles.statusBarContainer}>
            <Text style={styles.statusBarLabel}>
              Pengajuan Pending per Kategori
            </Text>
            <View style={styles.statusBarBaris}>
              {CATEGORIES.map(cat => (
                <View key={cat.key} style={styles.statusItem}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                  <Text style={styles.statusItemTeks}>{cat.label}</Text>
                  <Text style={[styles.statusAngka, {color: cat.color}]}>
                    {dataByCategory[cat.key]?.pending.length || 0}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── AKSES CEPAT ── */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>Akses Cepat</Text>
          <View style={styles.aksesCepatBaris}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.aksesCepatKartu, {backgroundColor: cat.color}]}
                onPress={() => navigation.navigate('Data')}>
                <Ionicons name={cat.icon} size={24} color="#fff" />
                <Text style={styles.aksesCepatTeks}>{cat.label}</Text>
                {dataByCategory[cat.key]?.pending.length > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotTeks}>
                      {dataByCategory[cat.key].pending.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── TAB PENDING PER KATEGORI ── */}
        <View style={styles.seksiPadding}>
          <View style={styles.tabBaris}>
            {CATEGORIES.map(cat => {
              const active = activeTab === cat.key;
              const count = dataByCategory[cat.key]?.pending.length || 0;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.tabBtn, active && {backgroundColor: '#fff'}]}
                  onPress={() => setActiveTab(cat.key)}>
                  <Text style={[styles.tabTeks, active && {color: '#1a2535'}]}>
                    {cat.label}
                    {count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activePendingList.length === 0 ? (
            <View style={styles.kosongContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={36}
                color={C.hijau}
              />
              <Text style={styles.kosongTeks}>
                Tidak ada pengajuan {activeCat.label.toLowerCase()} yang pending
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.keteranganTab}>
                Ketuk kartu untuk lihat detail singkat & verifikasi. Total:{' '}
                {activePendingList.length} pengajuan.
              </Text>
              <FlatList
                data={activePendingList}
                keyExtractor={i => i.id}
                renderItem={renderPendingItem}
                scrollEnabled={false}
              />
            </>
          )}

          <TouchableOpacity
            style={styles.lihatSemuaBtn}
            onPress={() => navigation.navigate('Data')}>
            <Text style={styles.lihatSemuaTeks}>Lihat Semua Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.bg},
  scroll: {flex: 1, backgroundColor: '#f0f2f5'},
  pusatLayar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  loadingTeks: {color: C.putih, marginTop: 12, fontSize: 14},

  hero: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
  },
  heroKiri: {flex: 1},
  heroSalam: {color: C.abu, fontSize: 13},
  heroNama: {color: C.putih, fontSize: 22, fontWeight: 'bold', marginTop: 2},
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,200,83,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,200,83,0.3)',
  },
  heroBadgeTeks: {color: C.hijau, fontSize: 12, fontWeight: '600'},
  logoutBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,82,82,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.25)',
  },
  logoutTeks: {color: C.merah, fontSize: 11, fontWeight: '600', marginTop: 2},

  seksiPadding: {paddingHorizontal: 14, marginTop: 16},
  judulSeksi: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a2535',
    marginBottom: 10,
  },
  statBaris: {flexDirection: 'row', gap: 10, marginBottom: 10},
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {fontSize: 22, fontWeight: 'bold', color: '#1a2535'},
  statLabel: {fontSize: 11, color: '#607d8b', marginTop: 1},
  statSub: {fontSize: 10, color: '#90a4ae', marginTop: 2},

  statusBarContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
  },
  statusBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#37474f',
    marginBottom: 10,
  },
  statusBarBaris: {flexDirection: 'row', justifyContent: 'space-around'},
  statusItem: {alignItems: 'center', gap: 4},
  statusItemTeks: {fontSize: 11, color: '#607d8b'},
  statusAngka: {fontSize: 16, fontWeight: 'bold'},

  aksesCepatBaris: {flexDirection: 'row', gap: 10},
  aksesCepatKartu: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    position: 'relative',
    gap: 6,
  },
  aksesCepatTeks: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: C.merah,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDotTeks: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },

  tabBaris: {
    flexDirection: 'row',
    backgroundColor: '#e8ecef',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center'},
  tabTeks: {fontSize: 12, color: '#90a4ae', fontWeight: '600'},
  keteranganTab: {fontSize: 12, color: '#90a4ae', marginBottom: 8},

  burialCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
  },
  burialCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
  },
  burialCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  avatarBulat: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTeks: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
  namaJenazah: {fontSize: 15, fontWeight: 'bold', color: '#1a2535', flex: 1},
  subJenazah: {fontSize: 12, color: '#607d8b', marginTop: 2},

  expandArea: {paddingHorizontal: 14, paddingBottom: 14},
  expandDivider: {height: 1, backgroundColor: '#f0f0f0', marginVertical: 10},
  infoBaris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {fontSize: 12, color: '#90a4ae'},
  infoValue: {
    fontSize: 13,
    color: '#263238',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  aksiRow: {marginTop: 8},
  tombolAksi: {paddingVertical: 11, borderRadius: 10, alignItems: 'center'},
  tombolAksiTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},

  badge: {borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3},
  badgeTeks: {color: '#fff', fontSize: 10, fontWeight: 'bold'},

  kosongContainer: {alignItems: 'center', paddingVertical: 30, gap: 8},
  kosongTeks: {
    fontSize: 13,
    color: '#37474f',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  lihatSemuaBtn: {
    marginTop: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    elevation: 2,
  },
  lihatSemuaTeks: {color: '#fff', fontWeight: 'bold', fontSize: 14},
});
