// ================================================================
// FILE: screens/HomeAdminScreen.js
// ================================================================
// Menggunakan @react-native-firebase/auth dan @react-native-firebase/firestore
// (BUKAN modular firebase/app) — sesuai import di file asli kamu
//
// Field yang ditampilkan (sesuai update terbaru):
//
// collection: users
//   name, email, role, createdAt, nik, tglLahir, alamat, hubungan, noTelp
//
// collection: burials
//   deceasedName, heirName, burialDate, status, createdBy, adminNote,
//   assignedBlock, assignedGraveNumber, notes, createdAt, updatedAt,
//   verifiedAt, nik, tglWafat, tglLahir, binBinti, penyebabKematian,
//   jenisKelamin, agama, alamatJenazah, emailPelapor,
//   dokumen: { ktp, kk, suratKematian, suratMedis }
// ================================================================

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
  Dimensions,
} from 'react-native';

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const {width} = Dimensions.get('window');

// ─── Warna tema ───────────────────────────────────────────────
const C = {
  bg: '#0f1923', // latar utama (gelap)
  card: '#1a2535', // kartu
  cardLight: '#ffffff', // kartu terang
  hijau: '#00c853', // aksen hijau
  hijauMuda: '#1de9b6',
  biru: '#2979ff',
  kuning: '#ffd740',
  merah: '#ff5252',
  abu: '#b0bec5',
  abuGelap: '#546e7a',
  putih: '#f5f5f5',
  pending: '#ff6d00',
  verified: '#00c853',
  rejected: '#ff5252',
};

// ─── Helper format waktu ──────────────────────────────────────
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

const formatWaktuLengkap = val => {
  if (!val) return '-';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

// ─── Badge status ─────────────────────────────────────────────
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

// ─── Kartu statistik ──────────────────────────────────────────
const StatCard = ({icon, label, value, warna, sub}) => (
  <View style={[styles.statCard, {borderLeftColor: warna}]}>
    <View style={styles.statIconWrap}>
      <Text style={styles.statIcon}>{icon}</Text>
    </View>
    <View style={{flex: 1}}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  </View>
);

// ─── Kartu dokumen kecil ──────────────────────────────────────
const DokumenBadge = ({label, ada}) => (
  <View
    style={[styles.dokBadge, {backgroundColor: ada ? '#e8f5e9' : '#fce4ec'}]}>
    <Text style={[styles.dokBadgeTeks, {color: ada ? '#2e7d32' : '#c62828'}]}>
      {ada ? '✅' : '❌'} {label}
    </Text>
  </View>
);

// ─── Baris info ───────────────────────────────────────────────
const InfoBaris = ({icon, label, value}) => (
  <View style={styles.infoBaris}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={{flex: 1}}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  </View>
);

// ================================================================
// MAIN SCREEN
// ================================================================
export default function HomeAdminScreen({navigation}) {
  const [loading, setLoading] = useState(true);
  const [adminNama, setAdminNama] = useState('Admin');

  // ── Stats ──
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalUserBiasa, setTotalUserBiasa] = useState(0);
  const [totalBurials, setTotalBurials] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // ── Data list ──
  const [recentBurials, setRecentBurials] = useState([]);
  const [pendingList, setPendingList] = useState([]);

  // ── Tab aktif ──
  const [tabAktif, setTabAktif] = useState('pending'); // 'pending' | 'terbaru'

  // ── Detail expand ──
  const [expandId, setExpandId] = useState(null);

  useEffect(() => {
    // Ambil nama admin yang sedang login
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

    let unsubUsers = () => {};
    let unsubBurials = () => {};

    const load = async () => {
      try {
        setLoading(true);

        // ── Realtime listener: users ──────────────────────────
        unsubUsers = firestore()
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

        // ── Realtime listener: burials ────────────────────────
        unsubBurials = firestore()
          .collection('burials')
          .onSnapshot(
            snap => {
              let pending = 0,
                verified = 0,
                rejected = 0;
              const arr = [];
              const pendArr = [];

              snap.forEach(doc => {
                const d = {id: doc.id, ...doc.data()};
                arr.push(d);
                if (d.status === 'pending') {
                  pendArr.push(d);
                  pending++;
                }
                if (d.status === 'verified') verified++;
                if (d.status === 'rejected') rejected++;
              });

              setTotalBurials(snap.size);
              setPendingCount(pending);
              setVerifiedCount(verified);
              setRejectedCount(rejected);

              // Sort terbaru dulu
              const sorted = [...arr].sort((x, y) => {
                const tx =
                  x.createdAt?.toMillis?.() ||
                  new Date(x.createdAt || 0).getTime();
                const ty =
                  y.createdAt?.toMillis?.() ||
                  new Date(y.createdAt || 0).getTime();
                return ty - tx;
              });

              setRecentBurials(sorted.slice(0, 10));
              setPendingList(
                pendArr.sort((x, y) => {
                  const tx =
                    x.createdAt?.toMillis?.() ||
                    new Date(x.createdAt || 0).getTime();
                  const ty =
                    y.createdAt?.toMillis?.() ||
                    new Date(y.createdAt || 0).getTime();
                  return tx - ty; // pending terlama duluan
                }),
              );
            },
            err => console.log('[HomeAdmin] burials err', err),
          );
      } catch (err) {
        console.log('[HomeAdmin] load err', err);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      try {
        unsubUsers();
      } catch (_) {}
      try {
        unsubBurials();
      } catch (_) {}
    };
  }, []);

  const handleLogout = () => {
    Alert.alert('Konfirmasi Logout', 'Apakah kamu yakin ingin keluar?', [
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

  const goToAssign = id => {
    if (!id) return Alert.alert('Error', 'ID tidak valid');
    navigation.navigate('Assign', {id});
  };

  const toggleExpand = id => {
    setExpandId(prev => (prev === id ? null : id));
  };

  // ── Render item pending ──────────────────────────────────────
  const renderPendingItem = ({item}) => {
    const isExpand = expandId === item.id;
    const dok = item.dokumen || {};
    return (
      <View style={styles.burialCard}>
        {/* Header kartu */}
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}
          style={styles.burialCardHeader}>
          <View style={styles.burialCardLeft}>
            <View style={styles.avatarBulat}>
              <Text style={styles.avatarTeks}>
                {(item.deceasedName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.namaJenazah} numberOfLines={1}>
                {item.deceasedName || '(nama kosong)'}
              </Text>
              <Text style={styles.subJenazah}>
                {item.jenisKelamin || '-'} • {item.agama || '-'}
              </Text>
              <Text style={styles.subJenazah}>
                Wafat: {item.tglWafat || item.burialDate || '-'}
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
            <Text style={styles.expandArrow}>{isExpand ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {/* Detail expand */}
        {isExpand && (
          <View style={styles.expandArea}>
            <View style={styles.expandDivider} />

            {/* Seksi data jenazah */}
            <Text style={styles.expandJudul}>📋 Data Jenazah</Text>
            <InfoBaris icon="🪪" label="NIK" value={item.nik} />
            <InfoBaris icon="📛" label="Bin/Binti" value={item.binBinti} />
            <InfoBaris icon="🎂" label="Tanggal Lahir" value={item.tglLahir} />
            <InfoBaris icon="💀" label="Tanggal Wafat" value={item.tglWafat} />
            <InfoBaris
              icon="⚕️"
              label="Penyebab Kematian"
              value={item.penyebabKematian}
            />
            <InfoBaris icon="🕌" label="Agama" value={item.agama} />
            <InfoBaris
              icon="🚻"
              label="Jenis Kelamin"
              value={item.jenisKelamin}
            />
            <InfoBaris icon="🏠" label="Alamat" value={item.alamatJenazah} />

            <View style={styles.expandDivider} />

            {/* Seksi ahli waris */}
            <Text style={styles.expandJudul}>👤 Ahli Waris</Text>
            <InfoBaris
              icon="👨‍👩‍👧"
              label="Nama Ahli Waris"
              value={item.heirName}
            />
            <InfoBaris icon="📧" label="Email" value={item.emailPelapor} />
            <InfoBaris icon="📝" label="Catatan" value={item.notes} />
            <InfoBaris
              icon="📅"
              label="Diajukan"
              value={formatWaktuLengkap(item.createdAt)}
            />

            <View style={styles.expandDivider} />

            {/* Dokumen */}
            <Text style={styles.expandJudul}>📁 Dokumen Pendukung</Text>
            <View style={styles.dokRow}>
              <DokumenBadge label="KTP" ada={!!dok.ktp} />
              <DokumenBadge label="KK" ada={!!dok.kk} />
              <DokumenBadge label="Srt Kematian" ada={!!dok.suratKematian} />
              <DokumenBadge label="Srt Medis" ada={!!dok.suratMedis} />
            </View>

            {/* Tombol aksi */}
            <View style={styles.aksiRow}>
              <TouchableOpacity
                style={[styles.tombolAksi, {backgroundColor: C.biru}]}
                onPress={() =>
                  navigation.navigate('BurialDetail', {id: item.id})
                }>
                <Text style={styles.tombolAksiTeks}>
                  🔍 Lihat Detail Lengkap
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tombolAksi, {backgroundColor: C.pending}]}
                onPress={() => goToAssign(item.id)}>
                <Text style={styles.tombolAksiTeks}>✅ Verifikasi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Render item terbaru ──────────────────────────────────────
  const renderRecentItem = ({item}) => {
    const {bg, teks} = warnaBadge(item.status);
    return (
      <TouchableOpacity
        style={styles.recentCard}
        onPress={() => navigation.navigate('BurialDetail', {id: item.id})}
        activeOpacity={0.75}>
        <View style={[styles.recentStrip, {backgroundColor: bg}]} />
        <View style={{flex: 1, paddingLeft: 10}}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentNama} numberOfLines={1}>
              {item.deceasedName || '(nama kosong)'}
            </Text>
            <View style={[styles.badge, {backgroundColor: bg}]}>
              <Text style={styles.badgeTeks}>{teks}</Text>
            </View>
          </View>
          <Text style={styles.recentSub}>
            {item.jenisKelamin || '-'} • {item.agama || '-'} • NIK:{' '}
            {item.nik ? item.nik.slice(0, 8) + '...' : '-'}
          </Text>
          <Text style={styles.recentSub}>
            Wafat: {item.tglWafat || item.burialDate || '-'} • Ahli waris:{' '}
            {item.heirName || '-'}
          </Text>
          {item.assignedBlock && (
            <Text style={styles.recentBlok}>
              🪦 Blok {item.assignedBlock} – No. {item.assignedGraveNumber}
            </Text>
          )}
          <Text style={styles.recentWaktu}>{formatWaktu(item.createdAt)}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  // ── Loading state ────────────────────────────────────────────
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

  // ── RENDER UTAMA ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{paddingBottom: 40}}
        showsVerticalScrollIndicator={false}>
        {/* ══ HERO HEADER ══════════════════════════════════════ */}
        <View style={styles.hero}>
          <View style={styles.heroKiri}>
            <Text style={styles.heroSalam}>Selamat datang 👋</Text>
            <Text style={styles.heroNama}>{adminNama}</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeTeks}>🛡️ Administrator</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutIkon}>🚪</Text>
            <Text style={styles.logoutTeks}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ══ STAT CARDS ═══════════════════════════════════════ */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>📊 Statistik</Text>

          <View style={styles.statBaris}>
            <StatCard
              icon="👥"
              label="Total Akun"
              value={totalUsers}
              warna={C.biru}
              sub={`${totalAdmins} Admin • ${totalUserBiasa} User`}
            />
            <StatCard
              icon="📋"
              label="Total Pemakaman"
              value={totalBurials}
              warna={C.hijauMuda}
            />
          </View>

          {/* Bar status pemakaman */}
          <View style={styles.statusBarContainer}>
            <View style={styles.statusBarJudul}>
              <Text style={styles.statusBarLabel}>Status Permohonan</Text>
            </View>
            <View style={styles.statusBarBaris}>
              <View style={styles.statusItem}>
                <View
                  style={[styles.statusDot, {backgroundColor: C.pending}]}
                />
                <Text style={styles.statusItemTeks}>Pending</Text>
                <Text style={[styles.statusAngka, {color: C.pending}]}>
                  {pendingCount}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <View
                  style={[styles.statusDot, {backgroundColor: C.verified}]}
                />
                <Text style={styles.statusItemTeks}>Diverifikasi</Text>
                <Text style={[styles.statusAngka, {color: C.verified}]}>
                  {verifiedCount}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <View
                  style={[styles.statusDot, {backgroundColor: C.rejected}]}
                />
                <Text style={styles.statusItemTeks}>Ditolak</Text>
                <Text style={[styles.statusAngka, {color: C.rejected}]}>
                  {rejectedCount}
                </Text>
              </View>
            </View>
            {/* Progress bar visual */}
            {totalBurials > 0 && (
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {flex: verifiedCount, backgroundColor: C.verified},
                  ]}
                />
                <View
                  style={[
                    styles.progressFill,
                    {flex: pendingCount, backgroundColor: C.pending},
                  ]}
                />
                <View
                  style={[
                    styles.progressFill,
                    {flex: rejectedCount, backgroundColor: C.rejected},
                  ]}
                />
              </View>
            )}
          </View>
        </View>

        {/* ══ TOMBOL AKSES CEPAT ═══════════════════════════════ */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>⚡ Akses Cepat</Text>
          <View style={styles.aksesCepatBaris}>
            <TouchableOpacity
              style={[styles.aksesCepatKartu, {backgroundColor: '#1a3a5c'}]}
              onPress={() => navigation.navigate('Data')}>
              <Text style={styles.aksesCepatIkon}>📋</Text>
              <Text style={styles.aksesCepatTeks}>Semua Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aksesCepatKartu, {backgroundColor: '#1a3a2c'}]}
              onPress={() =>
                navigation.navigate('Data', {filterStatus: 'pending'})
              }>
              <Text style={styles.aksesCepatIkon}>⏳</Text>
              <Text style={styles.aksesCepatTeks}>Pending</Text>
              {pendingCount > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifDotTeks}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aksesCepatKartu, {backgroundColor: '#2a1a1a'}]}
              onPress={() =>
                navigation.navigate('Data', {filterStatus: 'verified'})
              }>
              <Text style={styles.aksesCepatIkon}>✅</Text>
              <Text style={styles.aksesCepatTeks}>Diverifikasi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══ TAB: PENDING vs TERBARU ══════════════════════════ */}
        <View style={styles.seksiPadding}>
          <View style={styles.tabBaris}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabAktif === 'pending' && styles.tabBtnAktif,
              ]}
              onPress={() => setTabAktif('pending')}>
              <Text
                style={[
                  styles.tabTeks,
                  tabAktif === 'pending' && styles.tabTeksAktif,
                ]}>
                ⏳ Pending {pendingCount > 0 ? `(${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabAktif === 'terbaru' && styles.tabBtnAktif,
              ]}
              onPress={() => setTabAktif('terbaru')}>
              <Text
                style={[
                  styles.tabTeks,
                  tabAktif === 'terbaru' && styles.tabTeksAktif,
                ]}>
                🕐 Terbaru
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── TAB PENDING ─────────────────────────────────── */}
          {tabAktif === 'pending' && (
            <View>
              {pendingList.length === 0 ? (
                <View style={styles.kosongContainer}>
                  <Text style={styles.kosongIkon}>🎉</Text>
                  <Text style={styles.kosongTeks}>
                    Tidak ada permohonan pending!
                  </Text>
                  <Text style={styles.kosongSub}>
                    Semua permohonan sudah diverifikasi.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.keteranganTab}>
                    Tap kartu untuk lihat detail & verifikasi. Total:{' '}
                    {pendingList.length} permohonan.
                  </Text>
                  <FlatList
                    data={pendingList}
                    keyExtractor={i => i.id}
                    renderItem={renderPendingItem}
                    scrollEnabled={false}
                  />
                </>
              )}
            </View>
          )}

          {/* ── TAB TERBARU ─────────────────────────────────── */}
          {tabAktif === 'terbaru' && (
            <View>
              {recentBurials.length === 0 ? (
                <View style={styles.kosongContainer}>
                  <Text style={styles.kosongIkon}>📭</Text>
                  <Text style={styles.kosongTeks}>
                    Belum ada data pemakaman.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.keteranganTab}>
                    10 permohonan terbaru. Tap untuk detail lengkap.
                  </Text>
                  <FlatList
                    data={recentBurials}
                    keyExtractor={i => i.id}
                    renderItem={renderRecentItem}
                    scrollEnabled={false}
                  />
                </>
              )}
            </View>
          )}

          {/* Tombol lihat semua */}
          <TouchableOpacity
            style={styles.lihatSemuaBtn}
            onPress={() => navigation.navigate('Data')}>
            <Text style={styles.lihatSemuaTeks}>Lihat Semua Data →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================
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

  // ── Hero ──
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
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  heroKiri: {flex: 1},
  heroSalam: {color: C.abu, fontSize: 13},
  heroNama: {color: C.putih, fontSize: 22, fontWeight: 'bold', marginTop: 2},
  heroBadge: {
    backgroundColor: 'rgba(0,200,83,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
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
  logoutIkon: {fontSize: 20},
  logoutTeks: {color: C.merah, fontSize: 11, fontWeight: '600', marginTop: 2},

  // ── Stat cards ──
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {fontSize: 20},
  statValue: {fontSize: 22, fontWeight: 'bold', color: '#1a2535'},
  statLabel: {fontSize: 11, color: '#607d8b', marginTop: 1},
  statSub: {fontSize: 10, color: '#90a4ae', marginTop: 2},

  // ── Status bar ──
  statusBarContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statusBarJudul: {marginBottom: 10},
  statusBarLabel: {fontSize: 13, fontWeight: '600', color: '#37474f'},
  statusBarBaris: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statusItem: {alignItems: 'center', gap: 4},
  statusDot: {width: 10, height: 10, borderRadius: 5},
  statusItemTeks: {fontSize: 11, color: '#607d8b'},
  statusAngka: {fontSize: 18, fontWeight: 'bold'},
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#eceff1',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: {height: 8},

  // ── Akses cepat ──
  aksesCepatBaris: {flexDirection: 'row', gap: 10},
  aksesCepatKartu: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    position: 'relative',
  },
  aksesCepatIkon: {fontSize: 28, marginBottom: 6},
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

  // ── Tab ──
  tabBaris: {
    flexDirection: 'row',
    backgroundColor: '#e8ecef',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center'},
  tabBtnAktif: {backgroundColor: '#fff', elevation: 2},
  tabTeks: {fontSize: 13, color: '#90a4ae', fontWeight: '600'},
  tabTeksAktif: {color: '#1a2535'},
  keteranganTab: {
    fontSize: 12,
    color: '#90a4ae',
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // ── Burial card (pending) ──
  burialCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1a2535',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTeks: {color: '#fff', fontSize: 20, fontWeight: 'bold'},
  namaJenazah: {fontSize: 15, fontWeight: 'bold', color: '#1a2535', flex: 1},
  subJenazah: {fontSize: 12, color: '#607d8b', marginTop: 2},
  expandArrow: {color: '#90a4ae', fontSize: 12},

  // ── Expand area ──
  expandArea: {paddingHorizontal: 14, paddingBottom: 14},
  expandDivider: {height: 1, backgroundColor: '#f0f0f0', marginVertical: 10},
  expandJudul: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474f',
    marginBottom: 8,
  },
  infoBaris: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  infoIcon: {fontSize: 14, width: 22, marginTop: 1},
  infoLabel: {fontSize: 11, color: '#90a4ae'},
  infoValue: {
    fontSize: 13,
    color: '#263238',
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  dokRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10},
  dokBadge: {borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  dokBadgeTeks: {fontSize: 11, fontWeight: '600'},
  aksiRow: {flexDirection: 'row', gap: 8, marginTop: 4},
  tombolAksi: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  tombolAksiTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},

  // ── Recent card ──
  recentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 1,
  },
  recentStrip: {width: 4, alignSelf: 'stretch'},
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  recentNama: {fontSize: 14, fontWeight: 'bold', color: '#1a2535', flex: 1},
  recentSub: {fontSize: 11, color: '#607d8b', marginTop: 2},
  recentBlok: {fontSize: 11, color: C.hijau, marginTop: 3, fontWeight: '600'},
  recentWaktu: {fontSize: 10, color: '#b0bec5', marginTop: 4},
  chevron: {color: '#cfd8dc', fontSize: 22, paddingHorizontal: 10},

  // ── Badge ──
  badge: {borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3},
  badgeTeks: {color: '#fff', fontSize: 10, fontWeight: 'bold'},

  // ── Kosong ──
  kosongContainer: {alignItems: 'center', paddingVertical: 30},
  kosongIkon: {fontSize: 40, marginBottom: 10},
  kosongTeks: {fontSize: 15, color: '#37474f', fontWeight: '600'},
  kosongSub: {fontSize: 12, color: '#90a4ae', marginTop: 4},

  // ── Lihat semua ──
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
