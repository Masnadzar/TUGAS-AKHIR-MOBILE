// ================================================================
// FILE: screens/HomeUserScreen.js
// ================================================================
// Menggunakan @react-native-firebase/auth dan firestore
//
// ASUMSI STRUKTUR DATA (silakan sesuaikan bila field asli beda):
// Collection "burials", field:
//   jenisPermohonan : 'baru' | 'perpanjangan' | 'tumpang'
//   deceasedName, nik, tglLahir, tglWafat, jenisKelamin, agama, status,
//   createdAt, createdBy
//   foto            : array of image URL string (foto2 yang diupload user)
//   data            : object bebas berisi field spesifik per jenis
//                      permohonan, contoh:
//                      - baru        -> { binBinti, penyebabKematian, alamatJenazah, ... }
//                      - perpanjangan-> { blokLama, noMakamLama, masaBerlakuLama,
//                                          masaBerlakuBaru, alasan, ... }
//                      - tumpang     -> { namaJenazahLama, hubungan, blok, noMakam, ... }
//
// PERUBAHAN pada versi ini (ditambah dari versi sebelumnya):
// - Tombol "Export Bukti PDF" di tiap kartu (saat expand), untuk
//   generate bukti pengajuan & kelengkapan berkas dalam bentuk PDF,
//   yang bisa diserahkan/ditunjukkan ke petugas TPU.
// - Badge kecil "Lengkap" / "Belum Lengkap" di kartu, dihitung dari
//   checklist persyaratan sesuai jenis permohonannya.
// - Loading indicator saat proses generate PDF berjalan.
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
  Image,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ─── Palet warna ──────────────────────────────────────────────
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

// ─── Definisi 3 jenis permohonan ──────────────────────────────
const JENIS = {
  baru: {key: 'baru', label: 'Makam Baru', warna: C.hijau},
  perpanjangan: {key: 'perpanjangan', label: 'Perpanjangan', warna: C.biru},
  tumpang: {key: 'tumpang', label: 'Ijin Tumpang', warna: C.ungu},
};

// ─── Nomor persyaratan yang berlaku per jenis (untuk hitung status lengkap) ──
const NOMOR_PER_JENIS = {
  baru: [1, 2, 3, 4, 5, 6, 7],
  perpanjangan: [1, 2, 3, 7, 8],
  tumpang: [1, 2, 3, 4, 5, 6, 7, 8],
};

// Cek cepat status kelengkapan berkas (dipakai utk badge di kartu).
// Memakai field item.dokumen (lihat catatan asumsi di utils/generateBuktiPdf.js)
const cekKelengkapan = (item, jenis) => {
  const dokumen = item?.dokumen || {};
  const nomorBerlaku = NOMOR_PER_JENIS[jenis] || NOMOR_PER_JENIS.baru;
  const keyPerNomor = {
    1: true, // formulir otomatis ada
    2: !!dokumen.ktpKkPemohon,
    3: item?.dikuasakan ? !!dokumen.suratKuasa : true, // syarat ini hanya berlaku jika dikuasakan
    4: !!dokumen.ktpKkJenazah,
    5: !!dokumen.suratKematian,
    6: !!dokumen.suratKelurahan,
    7: !!dokumen.suratPengantarTpu,
    8: !!dokumen.izinLama,
  };
  return nomorBerlaku.every(no => keyPerNomor[no] === true);
};

// ─── Helper tanggal ───────────────────────────────────────────
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

// ─── Helper label field generik → jadi "Judul Rapi" ──────────
const rapikanLabel = key =>
  key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());

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

// ================================================================
// IKON CUSTOM (View murni, tanpa emoji & tanpa library eksternal)
// ================================================================

// Ikon "+" untuk Makam Baru
const IconBaru = ({warna, aktif}) => (
  <View style={ikon.kotak}>
    <View style={[ikon.plusBar, {backgroundColor: aktif ? '#fff' : warna}]} />
    <View
      style={[
        ikon.plusBar,
        ikon.plusBarTegak,
        {backgroundColor: aktif ? '#fff' : warna},
      ]}
    />
  </View>
);

// Ikon panah melingkar sederhana untuk Perpanjangan
const IconPerpanjangan = ({warna, aktif}) => (
  <View style={ikon.kotak}>
    <View
      style={[ikon.lingkaranSetengah, {borderColor: aktif ? '#fff' : warna}]}
    />
    <View
      style={[ikon.panahKecil, {borderBottomColor: aktif ? '#fff' : warna}]}
    />
  </View>
);

// Ikon kotak bertumpuk untuk Ijin Tumpang
const IconTumpang = ({warna, aktif}) => (
  <View style={ikon.kotak}>
    <View
      style={[
        ikon.tumpukKotak,
        ikon.tumpukKotakBelakang,
        {borderColor: aktif ? '#ffffffaa' : warna + '88'},
      ]}
    />
    <View
      style={[
        ikon.tumpukKotak,
        ikon.tumpukKotakDepan,
        {
          borderColor: aktif ? '#fff' : warna,
          backgroundColor: aktif ? '#ffffff22' : warna + '18',
        },
      ]}
    />
  </View>
);

// Ikon panah kanan kecil (chevron) untuk navigasi kartu
const IconChevron = ({warna = C.abu}) => (
  <View style={ikon.chevronWrap}>
    <View
      style={[ikon.chevronBar, ikon.chevronAtas, {backgroundColor: warna}]}
    />
    <View
      style={[ikon.chevronBar, ikon.chevronBawah, {backgroundColor: warna}]}
    />
  </View>
);

// Ikon kamera kecil, dipakai saat item tidak punya foto
const IconKamera = ({warna = C.abu}) => (
  <View style={ikon.kameraLuar}>
    <View style={[ikon.kameraLensa, {borderColor: warna}]} />
  </View>
);

// Ikon dokumen sederhana, dipakai di tombol Export PDF
const IconDokumen = ({warna = '#fff'}) => (
  <View style={ikon.dokumenLuar}>
    <View style={[ikon.dokumenGaris, {backgroundColor: warna}]} />
    <View
      style={[
        ikon.dokumenGaris,
        ikon.dokumenGarisTengah,
        {backgroundColor: warna},
      ]}
    />
    <View
      style={[
        ikon.dokumenGaris,
        ikon.dokumenGarisBawah,
        {backgroundColor: warna},
      ]}
    />
  </View>
);

const IKON_JENIS = {
  baru: IconBaru,
  perpanjangan: IconPerpanjangan,
  tumpang: IconTumpang,
};

// ─── Baris info label/value ────────────────────────────────────
const InfoBaris = ({label, value}) => (
  <View style={styles.infoBaris}>
    <Text style={styles.infoBarisLabel}>{rapikanLabel(label)}</Text>
    <Text style={styles.infoBarisValue} numberOfLines={3}>
      {value === undefined || value === null || value === ''
        ? '-'
        : String(value)}
    </Text>
  </View>
);

// ─── Galeri foto horizontal ────────────────────────────────────
const GaleriFoto = ({foto}) => {
  if (!foto || foto.length === 0) {
    return (
      <View style={styles.fotoKosong}>
        <IconKamera warna={C.abu} />
        <Text style={styles.fotoKosongTeks}>Belum ada foto</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {foto.map((url, idx) => (
        <Image
          key={idx}
          source={{uri: url}}
          style={styles.fotoThumb}
          resizeMode="cover"
        />
      ))}
    </ScrollView>
  );
};

// ─── Kartu statistik ringkas ────────────────────────────────────
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

  const [semuaPermohonan, setSemuaPermohonan] = useState([]); // milik user, semua jenis
  const [jenisAktif, setJenisAktif] = useState('baru');
  const [expandId, setExpandId] = useState(null);
  const [exportingId, setExportingId] = useState(null); // id kartu yg sedang diexport PDF

  const user = auth().currentUser;

  // ── Ambil profil user ─────────────────────────────────────
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

  // ── Ambil semua permohonan milik user (3 jenis sekaligus) ──
  useEffect(() => {
    if (!user) return;

    const unsub = firestore()
      .collection('burials')
      .where('createdBy', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          const arr = [];
          snap.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
          setSemuaPermohonan(arr);
          setLoading(false);
        },
        err => {
          console.log('[HomeUser] err', err);
          setLoading(false);
        },
      );

    return () => {
      try {
        unsub();
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

  // ── Export PDF bukti pengajuan & kelengkapan berkas ────────
  const namaUserSaatIni = profil?.name || user?.email?.split('@')[0] || 'User';

  const handleExportPdf = async item => {
    if (exportingId) return; // cegah double-tap saat masih proses
    setExportingId(item.id);
    try {
      const {lengkap} = await generateBuktiPdf({
        item,
        jenis: item.jenisPermohonan || 'baru',
        namaUser: namaUserSaatIni,
      });
      Alert.alert(
        lengkap ? 'Berkas Lengkap' : 'Berkas Belum Lengkap',
        lengkap
          ? 'PDF bukti pengajuan berhasil dibuat. Seluruh dokumen yang disyaratkan sudah terisi, silakan serahkan ke petugas TPU.'
          : 'PDF bukti pengajuan berhasil dibuat, namun masih ada dokumen yang belum terisi. Silakan lengkapi terlebih dahulu.',
      );
    } catch (err) {
      console.log('[ExportPdf] err', err);
      Alert.alert('Gagal', 'Terjadi kesalahan saat membuat PDF. Coba lagi.');
    } finally {
      setExportingId(null);
    }
  };

  // Hitung jumlah per jenis, untuk stat card
  const hitungJenis = key =>
    semuaPermohonan.filter(p => (p.jenisPermohonan || 'baru') === key).length;

  const daftarTampil = semuaPermohonan.filter(
    p => (p.jenisPermohonan || 'baru') === jenisAktif,
  );

  // ── Render satu kartu permohonan ───────────────────────────
  const renderKartu = ({item}) => {
    const isExpand = expandId === item.id;
    const {bg, label} = warnaBadge(item.status);
    const dataTambahan = item.data || {};
    const foto = item.foto || [];
    const jenisItem = item.jenisPermohonan || 'baru';
    const lengkap = cekKelengkapan(item, jenisItem);
    const sedangExport = exportingId === item.id;

    return (
      <View style={styles.kartu}>
        <TouchableOpacity
          style={styles.kartuHeader}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}>
          {/* Thumbnail foto pertama, atau ikon kamera bila kosong */}
          {foto.length > 0 ? (
            <Image source={{uri: foto[0]}} style={styles.kartuThumb} />
          ) : (
            <View style={[styles.kartuThumb, styles.kartuThumbKosong]}>
              <IconKamera warna={C.abu} />
            </View>
          )}

          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={styles.kartuNama} numberOfLines={1}>
              {item.deceasedName || '(nama kosong)'}
            </Text>
            <Text style={styles.kartuSub}>
              {item.jenisKelamin || '-'} • {item.agama || '-'}
            </Text>
            <Text style={styles.kartuSub}>Wafat: {item.tglWafat || '-'}</Text>
          </View>

          <View style={{alignItems: 'flex-end'}}>
            <View style={[styles.badge, {backgroundColor: bg}]}>
              <Text style={styles.badgeTeks}>{label}</Text>
            </View>
            <View
              style={[
                styles.badgeKecil,
                {backgroundColor: lengkap ? C.hijau : C.merah, marginTop: 6},
              ]}>
              <Text style={styles.badgeKecilTeks}>
                {lengkap ? 'Berkas Lengkap' : 'Berkas Kurang'}
              </Text>
            </View>
            <View style={{marginTop: 8}}>
              <IconChevron warna={isExpand ? C.teksUtama : C.abu} />
            </View>
          </View>
        </TouchableOpacity>

        {isExpand && (
          <View style={styles.expandBox}>
            <View style={styles.garis} />

            <Text style={styles.expandJudul}>Foto</Text>
            <GaleriFoto foto={foto} />

            <View style={styles.garis} />

            <Text style={styles.expandJudul}>Data Jenazah</Text>
            <InfoBaris label="NIK" value={item.nik} />
            <InfoBaris label="Tanggal Lahir" value={item.tglLahir} />
            <InfoBaris label="Tanggal Wafat" value={item.tglWafat} />
            <InfoBaris label="Jenis Kelamin" value={item.jenisKelamin} />
            <InfoBaris label="Agama" value={item.agama} />

            {/* Field tambahan spesifik per jenis permohonan */}
            {Object.keys(dataTambahan).length > 0 && (
              <>
                <View style={styles.garis} />
                <Text style={styles.expandJudul}>
                  Detail {JENIS[jenisAktif]?.label}
                </Text>
                {Object.entries(dataTambahan).map(([k, v]) => (
                  <InfoBaris key={k} label={k} value={v} />
                ))}
              </>
            )}

            {item.status === 'verified' && (
              <>
                <View style={styles.garis} />
                <Text style={styles.expandJudul}>Data Makam</Text>
                <InfoBaris label="Blok Makam" value={item.assignedBlock} />
                <InfoBaris label="No. Makam" value={item.assignedGraveNumber} />
                <InfoBaris label="Catatan Admin" value={item.adminNote} />
                <InfoBaris
                  label="Diverifikasi"
                  value={formatTglLengkap(item.verifiedAt)}
                />
              </>
            )}

            <View style={styles.garis} />
            <Text style={styles.diajukanTeks}>
              Diajukan: {formatTglLengkap(item.createdAt)}
            </Text>

            <TouchableOpacity
              style={styles.tombolDetail}
              onPress={() =>
                navigation.navigate('BurialDetail', {id: item.id})
              }>
              <Text style={styles.tombolDetailTeks}>Lihat Detail Lengkap</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tombolExport, sedangExport && {opacity: 0.6}]}
              disabled={sedangExport}
              onPress={() => handleExportPdf(item)}>
              {sedangExport ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconDokumen warna="#fff" />
              )}
              <Text style={styles.tombolExportTeks}>
                {sedangExport ? 'Membuat PDF...' : 'Export Bukti PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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

  const namaUser = namaUserSaatIni;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{paddingBottom: 40}}
        showsVerticalScrollIndicator={false}>
        {/* ── HEADER ──────────────────────────────────────── */}
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

        {/* ── STATISTIK RINGKAS PER JENIS ─────────────────── */}
        <View style={styles.seksiPadding}>
          <View style={styles.statBaris}>
            <StatCard
              label="Makam Baru"
              value={hitungJenis('baru')}
              warna={JENIS.baru.warna}
            />
            <StatCard
              label="Perpanjangan"
              value={hitungJenis('perpanjangan')}
              warna={JENIS.perpanjangan.warna}
            />
            <StatCard
              label="Ijin Tumpang"
              value={hitungJenis('tumpang')}
              warna={JENIS.tumpang.warna}
            />
          </View>
        </View>

        {/* ── SELECTOR 3 JENIS PERMOHONAN ─────────────────── */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>Jenis Permohonan</Text>
          <View style={styles.jenisGrid}>
            {Object.values(JENIS).map(j => {
              const Ikon = IKON_JENIS[j.key];
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
                  <Ikon warna={j.warna} aktif={aktif} />
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

        {/* ── TOMBOL AJUKAN BARU (sesuai jenis aktif) ─────── */}
        <View style={styles.seksiPadding}>
          <TouchableOpacity
            style={[
              styles.tombolAjukan,
              {backgroundColor: JENIS[jenisAktif].warna},
            ]}
            onPress={() =>
              navigation.navigate('UserBurialForm', {jenis: jenisAktif})
            }>
            <Text style={styles.tombolAjukanTeks}>
              + Ajukan {JENIS[jenisAktif].label}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── DAFTAR DATA SESUAI JENIS AKTIF ──────────────── */}
        <View style={styles.seksiPadding}>
          <Text style={styles.judulSeksi}>
            Data {JENIS[jenisAktif].label} Saya ({daftarTampil.length})
          </Text>

          {daftarTampil.length === 0 ? (
            <View style={styles.kosongBox}>
              <Text style={styles.kosongTeks}>Belum ada data</Text>
              <Text style={styles.kosongSub}>
                Data {JENIS[jenisAktif].label.toLowerCase()} yang kamu ajukan
                akan muncul di sini.
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

// ================================================================
// STYLES
// ================================================================
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

  // ── Hero ──────────────────────────────────────────────────
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

  // ── Seksi umum ────────────────────────────────────────────
  seksiPadding: {paddingHorizontal: 14, marginTop: 14},
  judulSeksi: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.teksUtama,
    marginBottom: 10,
  },

  // ── Stat cards ────────────────────────────────────────────
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

  // ── Selector jenis ────────────────────────────────────────
  jenisGrid: {flexDirection: 'row', gap: 10},
  jenisBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  jenisBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Tombol ajukan ─────────────────────────────────────────
  tombolAjukan: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  tombolAjukanTeks: {color: '#fff', fontWeight: 'bold', fontSize: 14},

  // ── Kartu permohonan ──────────────────────────────────────
  kartu: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
  },
  kartuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  kartuThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#eceff1',
  },
  kartuThumbKosong: {justifyContent: 'center', alignItems: 'center'},
  kartuNama: {fontSize: 14, fontWeight: 'bold', color: C.teksUtama},
  kartuSub: {fontSize: 11, color: C.abuGelap, marginTop: 2},

  // ── Expand box ────────────────────────────────────────────
  expandBox: {paddingHorizontal: 12, paddingBottom: 14},
  garis: {height: 1, backgroundColor: C.garis, marginVertical: 10},
  expandJudul: {
    fontSize: 12,
    fontWeight: '700',
    color: '#37474f',
    marginBottom: 8,
  },
  infoBaris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 8,
  },
  infoBarisLabel: {fontSize: 10, color: C.abu, flexShrink: 0},
  infoBarisValue: {
    fontSize: 12,
    color: '#263238',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  diajukanTeks: {fontSize: 11, color: C.abu, marginBottom: 8},
  tombolDetail: {
    backgroundColor: C.teksUtama,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tombolDetailTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},

  // ── Tombol export PDF ─────────────────────────────────────
  tombolExport: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: C.oranye,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  tombolExportTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},

  // ── Foto ──────────────────────────────────────────────────
  fotoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#eceff1',
  },
  fotoKosong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  fotoKosongTeks: {fontSize: 11, color: C.abu},

  // ── Badge ─────────────────────────────────────────────────
  badge: {borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3},
  badgeTeks: {color: '#fff', fontSize: 9, fontWeight: 'bold'},
  badgeKecil: {borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2},
  badgeKecilTeks: {color: '#fff', fontSize: 8, fontWeight: 'bold'},

  // ── Kosong ────────────────────────────────────────────────
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

// ================================================================
// STYLE KHUSUS IKON (semua dibuat dari View, tanpa emoji/library)
// ================================================================
const ikon = StyleSheet.create({
  kotak: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Plus (+)
  plusBar: {position: 'absolute', width: 16, height: 3, borderRadius: 2},
  plusBarTegak: {transform: [{rotate: '90deg'}]},

  // Perpanjangan: setengah lingkaran + panah kecil = kesan "refresh"
  lingkaranSetengah: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderLeftColor: 'transparent',
    transform: [{rotate: '45deg'}],
  },
  panahKecil: {
    position: 'absolute',
    top: 1,
    right: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{rotate: '120deg'}],
  },

  // Tumpang: dua kotak bertumpuk
  tumpukKotak: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 3,
    borderWidth: 2,
  },
  tumpukKotakBelakang: {top: 1, left: 5},
  tumpukKotakDepan: {bottom: 1, left: 1},

  // Chevron kanan (untuk kartu)
  chevronWrap: {width: 10, height: 14, justifyContent: 'center'},
  chevronBar: {
    position: 'absolute',
    width: 8,
    height: 2,
    borderRadius: 1,
    right: 0,
  },
  chevronAtas: {top: 3, transform: [{rotate: '45deg'}]},
  chevronBawah: {bottom: 3, transform: [{rotate: '-45deg'}]},

  // Kamera sederhana (untuk placeholder foto kosong)
  kameraLuar: {
    width: 20,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#90a4ae',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kameraLensa: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },

  // Ikon dokumen sederhana (untuk tombol Export PDF)
  dokumenLuar: {
    width: 16,
    height: 18,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 2,
    gap: 3,
  },
  dokumenGaris: {width: 10, height: 2, borderRadius: 1},
  dokumenGarisTengah: {width: 12},
  dokumenGarisBawah: {width: 7},
});
