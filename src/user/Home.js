// ================================================================
// FILE: screens/HomeUserScreen.js
// ================================================================
// Menggunakan @react-native-firebase/auth dan firestore
// — SAMA dengan import di file asli kamu
//
// Field baru yang ditampilkan dari collection "burials":
//   nik, tglWafat, tglLahir, binBinti, penyebabKematian,
//   jenisKelamin, agama, alamatJenazah, emailPelapor,
//   dokumen: { ktp, kk, suratKematian, suratMedis }
//
// Field baru dari collection "users":
//   name, nik, tglLahir, alamat, hubungan, noTelp
// ================================================================

import React, {useEffect, useState} from 'react';
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
  Dimensions,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const {width} = Dimensions.get('window');

// ─── Palet warna ──────────────────────────────────────────────
const C = {
  bg: '#0b1120',
  bgCard: '#151f30',
  hijau: '#00e676',
  hijauGelap: '#00c853',
  biru: '#448aff',
  ungu: '#7c4dff',
  kuning: '#ffd740',
  oranye: '#ff6d00',
  merah: '#ff5252',
  teal: '#1de9b6',
  putih: '#f5f5f5',
  abu: '#b0bec5',
  abuGelap: '#546e7a',
  card: '#ffffff',
};

// ─── Helper ───────────────────────────────────────────────────
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

const formatTglLengkap = val => {
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
    return String(val);
  }
};

const warnaBadge = status => {
  switch (status) {
    case 'verified':
      return {bg: C.hijauGelap, label: '✅ Diverifikasi'};
    case 'rejected':
      return {bg: C.merah, label: '❌ Ditolak'};
    default:
      return {bg: C.oranye, label: '⏳ Pending'};
  }
};

// ─── Komponen kartu statistik ─────────────────────────────────
const StatCard = ({icon, label, value, warna, lebar}) => (
  <View
    style={[
      styles.statCard,
      {borderTopColor: warna, width: lebar || width / 2 - 22},
    ]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statAngka, {color: warna}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Komponen tombol aksi cepat ───────────────────────────────
const AksiBtn = ({icon, label, warna, onPress, notif}) => (
  <TouchableOpacity
    style={[
      styles.aksiBtn,
      {backgroundColor: warna + '22', borderColor: warna + '55'},
    ]}
    onPress={onPress}
    activeOpacity={0.75}>
    {notif > 0 && (
      <View style={styles.notifBulat}>
        <Text style={styles.notifTeks}>{notif}</Text>
      </View>
    )}
    <Text style={styles.aksiBtnIkon}>{icon}</Text>
    <Text style={[styles.aksiBtnLabel, {color: warna}]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Baris info dalam kartu ───────────────────────────────────
const InfoBaris = ({icon, label, value}) => (
  <View style={styles.infoBaris}>
    <Text style={styles.infoBarisIkon}>{icon}</Text>
    <View style={{flex: 1}}>
      <Text style={styles.infoBarisLabel}>{label}</Text>
      <Text style={styles.infoBarisValue} numberOfLines={2}>
        {value || '-'}
      </Text>
    </View>
  </View>
);

// ─── Badge dokumen ────────────────────────────────────────────
const DokBadge = ({label, ada}) => (
  <View
    style={[styles.dokBadge, {backgroundColor: ada ? '#e8f5e9' : '#fce4ec'}]}>
    <Text style={[styles.dokBadgeTeks, {color: ada ? '#2e7d32' : '#b71c1c'}]}>
      {ada ? '✅' : '❌'} {label}
    </Text>
  </View>
);

// ================================================================
// MAIN SCREEN
// ================================================================
export default function HomeUserScreen({navigation}) {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null); // data user dari Firestore

  // Stats global
  const [totalBurials, setTotalBurials] = useState(0);

  // Stats milik user
  const [myTotal, setMyTotal] = useState(0);
  const [myVerified, setMyVerified] = useState(0);
  const [myPending, setMyPending] = useState(0);
  const [myRejected, setMyRejected] = useState(0);

  // Lists
  const [recentBurials, setRecentBurials] = useState([]); // 5 terbaru semua user
  const [myBurials, setMyBurials] = useState([]); // milik user ini

  // UI state
  const [tabAktif, setTabAktif] = useState('saya'); // 'saya' | 'semua'
  const [expandId, setExpandId] = useState(null);

  const user = auth().currentUser;

  // ── Ambil profil user dari Firestore ──────────────────────
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

  // ── Listener Firestore ────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Semua burials (5 terbaru + total)
    const unsubAll = firestore()
      .collection('burials')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        snap => {
          const arr = [];
          snap.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
          setTotalBurials(snap.size);
          setRecentBurials(arr.slice(0, 5));
          setLoading(false);
        },
        err => {
          console.log('[HomeUser] all err', err);
          setLoading(false);
        },
      );

    // Burials milik user ini
    const unsubMine = firestore()
      .collection('burials')
      .where('createdBy', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          const arr = [];
          let v = 0,
            p = 0,
            r = 0;
          snap.forEach(doc => {
            const d = {id: doc.id, ...doc.data()};
            arr.push(d);
            if (d.status === 'verified') v++;
            else if (d.status === 'pending') p++;
            else if (d.status === 'rejected') r++;
          });
          setMyBurials(arr);
          setMyTotal(arr.length);
          setMyVerified(v);
          setMyPending(p);
          setMyRejected(r);
        },
        err => console.log('[HomeUser] mine err', err),
      );

    return () => {
      try {
        unsubAll();
      } catch (_) {}
      try {
        unsubMine();
      } catch (_) {}
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

  const toggleExpand = id => setExpandId(prev => (prev === id ? null : id));

  // ── Render kartu burial (expand detail) ───────────────────
  const renderBurialCard = ({item}) => {
    const isExpand = expandId === item.id;
    const {bg, label} = warnaBadge(item.status);
    const dok = item.dokumen || {};

    return (
      <View style={styles.burialCard}>
        {/* Strip warna status di kiri */}
        <View style={[styles.burialStrip, {backgroundColor: bg}]} />

        <View style={{flex: 1}}>
          {/* Header bisa di-tap untuk expand */}
          <TouchableOpacity
            style={styles.burialHeader}
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.8}>
            <View style={styles.burialHeaderKiri}>
              {/* Avatar huruf pertama */}
              <View
                style={[
                  styles.avatar,
                  {backgroundColor: bg + '33', borderColor: bg},
                ]}>
                <Text style={[styles.avatarTeks, {color: bg}]}>
                  {(item.deceasedName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.burialNama} numberOfLines={1}>
                  {item.deceasedName || '(nama kosong)'}
                </Text>
                <Text style={styles.burialSub}>
                  {item.jenisKelamin || '-'} • {item.agama || '-'}
                </Text>
                <Text style={styles.burialSub}>
                  Wafat: {item.tglWafat || item.burialDate || '-'}
                </Text>
              </View>
            </View>
            <View style={{alignItems: 'flex-end', gap: 4}}>
              <View style={[styles.badge, {backgroundColor: bg}]}>
                <Text style={styles.badgeTeks}>{label}</Text>
              </View>
              <Text style={styles.expandArrow}>{isExpand ? '▲' : '▼'}</Text>
            </View>
          </TouchableOpacity>

          {/* DETAIL EXPAND */}
          {isExpand && (
            <View style={styles.expandBox}>
              <View style={styles.garis} />

              {/* Data jenazah */}
              <Text style={styles.expandJudul}>📋 Data Jenazah</Text>
              <InfoBaris icon="🪪" label="NIK" value={item.nik} />
              <InfoBaris icon="📛" label="Bin / Binti" value={item.binBinti} />
              <InfoBaris
                icon="🎂"
                label="Tanggal Lahir"
                value={item.tglLahir}
              />
              <InfoBaris
                icon="💀"
                label="Tanggal Wafat"
                value={item.tglWafat}
              />
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
              <InfoBaris
                icon="🏠"
                label="Alamat Jenazah"
                value={item.alamatJenazah}
              />

              <View style={styles.garis} />

              {/* Data makam (jika sudah diverifikasi) */}
              {item.status === 'verified' && (
                <>
                  <Text style={styles.expandJudul}>🪦 Data Makam</Text>
                  <InfoBaris
                    icon="📍"
                    label="Blok Makam"
                    value={item.assignedBlock}
                  />
                  <InfoBaris
                    icon="🔢"
                    label="No. Makam"
                    value={item.assignedGraveNumber}
                  />
                  <InfoBaris
                    icon="📝"
                    label="Catatan Admin"
                    value={item.adminNote}
                  />
                  <InfoBaris
                    icon="📅"
                    label="Diverifikasi"
                    value={formatTglLengkap(item.verifiedAt)}
                  />
                  <View style={styles.garis} />
                </>
              )}

              {/* Dokumen */}
              <Text style={styles.expandJudul}>📁 Dokumen</Text>
              <View style={styles.dokRow}>
                <DokBadge label="KTP" ada={!!dok.ktp} />
                <DokBadge label="KK" ada={!!dok.kk} />
                <DokBadge label="Srt Kematian" ada={!!dok.suratKematian} />
                <DokBadge label="Srt Medis" ada={!!dok.suratMedis} />
              </View>

              <View style={styles.garis} />
              <Text style={styles.diajukanTeks}>
                📅 Diajukan: {formatTglLengkap(item.createdAt)}
              </Text>

              {/* Tombol lihat detail */}
              <TouchableOpacity
                style={styles.tombolDetail}
                onPress={() =>
                  navigation.navigate('BurialDetail', {id: item.id})
                }>
                <Text style={styles.tombolDetailTeks}>
                  🔍 Lihat Detail Lengkap
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Render kartu recent (tab "semua") ─────────────────────
  const renderRecentCard = ({item}) => {
    const {bg, label} = warnaBadge(item.status);
    return (
      <TouchableOpacity
        style={styles.recentCard}
        onPress={() => navigation.navigate('BurialDetail', {id: item.id})}
        activeOpacity={0.78}>
        <View style={[styles.recentStrip, {backgroundColor: bg}]} />
        <View style={{flex: 1, paddingLeft: 10}}>
          <View style={styles.recentHeaderBaris}>
            <Text style={styles.recentNama} numberOfLines={1}>
              {item.deceasedName || '(nama kosong)'}
            </Text>
            <View style={[styles.badge, {backgroundColor: bg}]}>
              <Text style={styles.badgeTeks}>{label}</Text>
            </View>
          </View>
          <Text style={styles.recentSub}>
            {item.jenisKelamin || '-'} • {item.agama || '-'}
          </Text>
          <Text style={styles.recentSub}>
            Wafat: {item.tglWafat || item.burialDate || '-'}
          </Text>
          {item.assignedBlock ? (
            <Text style={styles.blokInfo}>
              🪦 Blok {item.assignedBlock} – No. {item.assignedGraveNumber}
            </Text>
          ) : null}
          <Text style={styles.recentWaktu}>{formatTgl(item.createdAt)}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  // ── Loading ───────────────────────────────────────────────
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

  const namaUser = profil?.name || user?.email?.split('@')[0] || 'User';

  // ────────────────────────────────────────────────────────────
  // RENDER UTAMA
  // ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{paddingBottom: 40}}
        showsVerticalScrollIndicator={false}>
        {/* ════════════════════════════════════════════════════ */}
        {/* HERO HEADER                                         */}
        {/* ════════════════════════════════════════════════════ */}
        <View style={styles.hero}>
          {/* Kartu profil */}
          <View style={styles.profilKartu}>
            <View style={styles.profilAvatar}>
              <Text style={styles.profilAvatarTeks}>
                {namaUser.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.profilSalam}>Selamat datang 👋</Text>
              <Text style={styles.profilNama} numberOfLines={1}>
                {namaUser}
              </Text>
              {/* Data profil singkat */}
              {profil?.nik ? (
                <Text style={styles.profilDetail}>
                  🪪 NIK: {profil.nik.slice(0, 8)}••••••••
                </Text>
              ) : null}
              {profil?.hubungan ? (
                <Text style={styles.profilDetail}>🤝 {profil.hubungan}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutIkon}>🚪</Text>
              <Text style={styles.logoutTeks}>Keluar</Text>
            </TouchableOpacity>
          </View>

          {/* Progress bar status permohonan user */}
          {myTotal > 0 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Status Permohonan Saya</Text>
              <View style={styles.progressBg}>
                {myVerified > 0 && (
                  <View
                    style={[
                      styles.progressFill,
                      {
                        flex: myVerified,
                        backgroundColor: C.hijauGelap,
                      },
                    ]}
                  />
                )}
                {myPending > 0 && (
                  <View
                    style={[
                      styles.progressFill,
                      {
                        flex: myPending,
                        backgroundColor: C.oranye,
                      },
                    ]}
                  />
                )}
                {myRejected > 0 && (
                  <View
                    style={[
                      styles.progressFill,
                      {
                        flex: myRejected,
                        backgroundColor: C.merah,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.progressLegenda}>
                <Text style={[styles.legendaTeks, {color: C.hijauGelap}]}>
                  ✅ {myVerified} Terverifikasi
                </Text>
                <Text style={[styles.legendaTeks, {color: C.oranye}]}>
                  ⏳ {myPending} Pending
                </Text>
                {myRejected > 0 && (
                  <Text style={[styles.legendaTeks, {color: C.merah}]}>
                    ❌ {myRejected} Ditolak
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ════════════════════════════════════════════════════ */}
        {/* STATISTIK KARTU                                     */}
        {/* ════════════════════════════════════════════════════ */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>📊 Statistik</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <StatCard
              icon="📋"
              label="Total Pemakaman"
              value={totalBurials}
              warna={C.biru}
            />
            <StatCard
              icon="🗂️"
              label="Permohonan Saya"
              value={myTotal}
              warna={C.ungu}
            />
            <StatCard
              icon="✅"
              label="Diverifikasi"
              value={myVerified}
              warna={C.hijauGelap}
            />
            <StatCard
              icon="⏳"
              label="Pending"
              value={myPending}
              warna={C.oranye}
            />
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════════ */}
        {/* AKSI CEPAT                                          */}
        {/* ════════════════════════════════════════════════════ */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>⚡ Aksi Cepat</Text>
          <View style={styles.aksiBaris}>
            <AksiBtn
              icon="➕"
              label="Ajukan Baru"
              warna={C.hijau}
              onPress={() => navigation.navigate('UserBurialForm')}
            />
            <AksiBtn
              icon="📋"
              label="Permohonan Saya"
              warna={C.biru}
              notif={myPending}
              onPress={() => navigation.navigate('UserBurialList')}
            />
            <AksiBtn
              icon="🔍"
              label="Cari Data"
              warna={C.ungu}
              onPress={() => navigation.navigate('UserBurialList')}
            />
            <AksiBtn
              icon="👤"
              label="Profil Saya"
              warna={C.teal}
              onPress={() => navigation.navigate('ProfileUser')}
            />
          </View>
        </View>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB: PERMOHONAN SAYA vs SEMUA                       */}
        {/* ════════════════════════════════════════════════════ */}
        <View style={styles.seksiPadding}>
          {/* Tab selector */}
          <View style={styles.tabBaris}>
            <TouchableOpacity
              style={[styles.tabBtn, tabAktif === 'saya' && styles.tabBtnAktif]}
              onPress={() => setTabAktif('saya')}>
              <Text
                style={[
                  styles.tabTeks,
                  tabAktif === 'saya' && styles.tabTeksAktif,
                ]}>
                🗂️ Permohonan Saya {myTotal > 0 ? `(${myTotal})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tabAktif === 'semua' && styles.tabBtnAktif,
              ]}
              onPress={() => setTabAktif('semua')}>
              <Text
                style={[
                  styles.tabTeks,
                  tabAktif === 'semua' && styles.tabTeksAktif,
                ]}>
                🌐 Terbaru
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── TAB: PERMOHONAN SAYA ─────────────────────── */}
          {tabAktif === 'saya' && (
            <View>
              {myBurials.length === 0 ? (
                <View style={styles.kosongBox}>
                  <Text style={styles.kosongIkon}>📭</Text>
                  <Text style={styles.kosongTeks}>Belum ada permohonan</Text>
                  <Text style={styles.kosongSub}>
                    Tap "Ajukan Baru" untuk mengajukan permohonan pemakaman.
                  </Text>
                  <TouchableOpacity
                    style={styles.tombolAjukan}
                    onPress={() => navigation.navigate('UserBurialForm')}>
                    <Text style={styles.tombolAjukanTeks}>
                      ➕ Ajukan Permohonan Baru
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.keteranganTab}>
                    Tap kartu untuk lihat detail & status dokumen.
                  </Text>
                  <FlatList
                    data={myBurials}
                    keyExtractor={i => i.id}
                    renderItem={renderBurialCard}
                    scrollEnabled={false}
                  />
                  <TouchableOpacity
                    style={styles.tombolAjukan}
                    onPress={() => navigation.navigate('UserBurialForm')}>
                    <Text style={styles.tombolAjukanTeks}>
                      ➕ Ajukan Permohonan Baru
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ── TAB: TERBARU (SEMUA) ─────────────────────── */}
          {tabAktif === 'semua' && (
            <View>
              {recentBurials.length === 0 ? (
                <View style={styles.kosongBox}>
                  <Text style={styles.kosongIkon}>📭</Text>
                  <Text style={styles.kosongTeks}>
                    Belum ada data pemakaman.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.keteranganTab}>
                    5 permohonan terbaru. Tap untuk detail.
                  </Text>
                  <FlatList
                    data={recentBurials}
                    keyExtractor={i => i.id}
                    renderItem={renderRecentCard}
                    scrollEnabled={false}
                  />
                </>
              )}
              <TouchableOpacity
                style={[styles.tombolLihatSemua, {marginTop: 10}]}
                onPress={() => navigation.navigate('UserBurialList')}>
                <Text style={styles.tombolLihatSemuaTeks}>
                  Lihat Semua Permohonan →
                </Text>
              </TouchableOpacity>
            </View>
          )}
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

  // ── Hero ──────────────────────────────────────────────────
  hero: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    marginBottom: 6,
  },
  profilKartu: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  profilAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.hijauGelap + '33',
    borderWidth: 2,
    borderColor: C.hijauGelap,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilAvatarTeks: {color: C.hijau, fontSize: 22, fontWeight: 'bold'},
  profilSalam: {color: C.abu, fontSize: 12},
  profilNama: {color: C.putih, fontSize: 18, fontWeight: 'bold', marginTop: 2},
  profilDetail: {color: C.abu, fontSize: 11, marginTop: 3},
  logoutBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,82,82,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.3)',
  },
  logoutIkon: {fontSize: 18},
  logoutTeks: {color: C.merah, fontSize: 10, fontWeight: '600', marginTop: 2},

  // ── Progress bar ──────────────────────────────────────────
  progressContainer: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 12,
  },
  progressLabel: {color: C.abu, fontSize: 12, marginBottom: 8},
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {height: 8},
  progressLegenda: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  legendaTeks: {fontSize: 11, fontWeight: '600'},

  // ── Seksi ─────────────────────────────────────────────────
  seksiPadding: {paddingHorizontal: 14, marginTop: 14},
  judulSeksi: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a2535',
    marginBottom: 10,
  },

  // ── Stat cards ────────────────────────────────────────────
  statCard: {
    borderRadius: 14,
    padding: 14,
    marginRight: 10,
    backgroundColor: '#fff',
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    alignItems: 'center',
    minWidth: 110,
  },
  statIcon: {fontSize: 24, marginBottom: 6},
  statAngka: {fontSize: 26, fontWeight: 'bold'},
  statLabel: {
    fontSize: 11,
    color: C.abuGelap,
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Aksi cepat ────────────────────────────────────────────
  aksiBaris: {flexDirection: 'row', gap: 8},
  aksiBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  aksiBtnIkon: {fontSize: 24, marginBottom: 5},
  aksiBtnLabel: {fontSize: 10, fontWeight: '700', textAlign: 'center'},
  notifBulat: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: C.merah,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTeks: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 3,
  },

  // ── Tab ───────────────────────────────────────────────────
  tabBaris: {
    flexDirection: 'row',
    backgroundColor: '#e8ecef',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center'},
  tabBtnAktif: {backgroundColor: '#fff', elevation: 2},
  tabTeks: {fontSize: 12, color: '#90a4ae', fontWeight: '600'},
  tabTeksAktif: {color: '#1a2535'},
  keteranganTab: {
    fontSize: 11,
    color: '#90a4ae',
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // ── Burial card (detail expand) ───────────────────────────
  burialCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  burialStrip: {width: 4},
  burialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  burialHeaderKiri: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarTeks: {fontSize: 18, fontWeight: 'bold'},
  burialNama: {fontSize: 14, fontWeight: 'bold', color: '#1a2535', flex: 1},
  burialSub: {fontSize: 11, color: '#607d8b', marginTop: 2},
  expandArrow: {color: '#b0bec5', fontSize: 11, marginTop: 4},

  // ── Expand box ────────────────────────────────────────────
  expandBox: {paddingHorizontal: 12, paddingBottom: 12},
  garis: {height: 1, backgroundColor: '#f0f0f0', marginVertical: 10},
  expandJudul: {
    fontSize: 12,
    fontWeight: '700',
    color: '#37474f',
    marginBottom: 8,
  },
  infoBaris: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 6,
  },
  infoBarisIkon: {fontSize: 13, width: 20},
  infoBarisLabel: {fontSize: 10, color: '#90a4ae'},
  infoBarisValue: {fontSize: 12, color: '#263238', fontWeight: '500'},
  dokRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4},
  dokBadge: {borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3},
  dokBadgeTeks: {fontSize: 10, fontWeight: '600'},
  diajukanTeks: {fontSize: 11, color: '#b0bec5', marginBottom: 8},
  tombolDetail: {
    backgroundColor: '#1a2535',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tombolDetailTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},

  // ── Recent card ───────────────────────────────────────────
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
  recentHeaderBaris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  recentNama: {fontSize: 13, fontWeight: 'bold', color: '#1a2535', flex: 1},
  recentSub: {fontSize: 11, color: '#607d8b', marginTop: 1},
  blokInfo: {
    fontSize: 11,
    color: C.hijauGelap,
    marginTop: 3,
    fontWeight: '600',
  },
  recentWaktu: {fontSize: 10, color: '#b0bec5', marginTop: 3},
  chevron: {color: '#cfd8dc', fontSize: 22, paddingHorizontal: 10},

  // ── Badge ─────────────────────────────────────────────────
  badge: {borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3},
  badgeTeks: {color: '#fff', fontSize: 9, fontWeight: 'bold'},

  // ── Kosong ────────────────────────────────────────────────
  kosongBox: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
  },
  kosongIkon: {fontSize: 38, marginBottom: 10},
  kosongTeks: {fontSize: 15, color: '#37474f', fontWeight: '600'},
  kosongSub: {
    fontSize: 12,
    color: '#90a4ae',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ── Tombol ────────────────────────────────────────────────
  tombolAjukan: {
    backgroundColor: C.hijauGelap,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  tombolAjukanTeks: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  tombolLihatSemua: {
    backgroundColor: '#1a2535',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    elevation: 2,
  },
  tombolLihatSemuaTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},
});
