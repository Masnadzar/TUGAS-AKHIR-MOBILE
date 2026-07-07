// ================================================================
// FILE: screens/UserBurialListScreen.js
// ================================================================
// Import tetap pakai @react-native-firebase — sama seperti aslinya
//
// Field baru yang ditampilkan:
//   nik, tglWafat, tglLahir, binBinti, penyebabKematian,
//   jenisKelamin, agama, alamatJenazah, emailPelapor,
//   dokumen: { ktp, kk, suratKematian, suratMedis }
// ================================================================

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ─── Palet warna ──────────────────────────────────────────────
const C = {
  bg: '#f0f2f5',
  card: '#ffffff',
  hijau: '#00c853',
  hijauMuda: '#e8f5e9',
  biru: '#2979ff',
  biru2: '#e3f2fd',
  oranye: '#ff6d00',
  oranye2: '#fff3e0',
  merah: '#f44336',
  merah2: '#ffebee',
  gelap: '#1a2535',
  abu: '#90a4ae',
  abuGelap: '#546e7a',
  teks: '#263238',
  border: '#e0e0e0',
};

// ─── Helper format tanggal ─────────────────────────────────────
const formatTgl = val => {
  if (!val) return '-';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
};

// ─── Konfigurasi status ────────────────────────────────────────
const STATUS_CONFIG = {
  verified: {
    label: '✅ Diverifikasi',
    bg: C.hijauMuda,
    teks: C.hijau,
    border: C.hijau,
  },
  pending: {
    label: '⏳ Pending',
    bg: C.oranye2,
    teks: C.oranye,
    border: C.oranye,
  },
  rejected: {label: '❌ Ditolak', bg: C.merah2, teks: C.merah, border: C.merah},
};
const getStatus = s => STATUS_CONFIG[s] || STATUS_CONFIG.pending;

// ─── Filter tab ────────────────────────────────────────────────
const FILTER = ['Semua', 'pending', 'verified', 'rejected'];
const labelFilter = f => {
  if (f === 'Semua') return 'Semua';
  if (f === 'pending') return '⏳ Pending';
  if (f === 'verified') return '✅ Terverifikasi';
  if (f === 'rejected') return '❌ Ditolak';
  return f;
};

// ─── Komponen Badge Dokumen ────────────────────────────────────
const DokBadge = ({label, ada}) => (
  <View
    style={[styles.dokBadge, {backgroundColor: ada ? C.hijauMuda : C.merah2}]}>
    <Text style={[styles.dokBadgeTeks, {color: ada ? C.hijau : C.merah}]}>
      {ada ? '✅' : '❌'} {label}
    </Text>
  </View>
);

// ─── Komponen baris info ───────────────────────────────────────
const InfoBaris = ({icon, label, value}) => {
  if (!value) return null;
  return (
    <View style={styles.infoBaris}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{flex: 1}}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
};

// ─── Komponen kartu burial ─────────────────────────────────────
const BurialCard = ({item, onPress, onEdit, onDelete, isExpand, onToggle}) => {
  const cfg = getStatus(item.status);
  const dok = item.dokumen || {};
  const adaDokumen = dok.ktp || dok.kk || dok.suratKematian || dok.suratMedis;

  return (
    <View
      style={[styles.card, {borderLeftColor: cfg.border, borderLeftWidth: 4}]}>
      {/* ── Header kartu ──────────────────────────────────── */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.8}>
        {/* Avatar huruf pertama */}
        <View
          style={[
            styles.avatar,
            {backgroundColor: cfg.bg, borderColor: cfg.border},
          ]}>
          <Text style={[styles.avatarTeks, {color: cfg.teks}]}>
            {(item.deceasedName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info utama */}
        <View style={{flex: 1}}>
          <Text style={styles.cardNama} numberOfLines={1}>
            {item.deceasedName || '(nama kosong)'}
          </Text>
          <Text style={styles.cardSub}>
            {item.jenisKelamin || '-'} • {item.agama || '-'}
          </Text>
          <Text style={styles.cardSub}>
            Wafat: {item.tglWafat || item.burialDate || '-'}
          </Text>
          <Text style={styles.cardSub}>Ahli waris: {item.heirName || '-'}</Text>
        </View>

        {/* Status badge + expand arrow */}
        <View style={{alignItems: 'flex-end', gap: 6}}>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: cfg.bg, borderColor: cfg.border},
            ]}>
            <Text style={[styles.statusBadgeTeks, {color: cfg.teks}]}>
              {cfg.label}
            </Text>
          </View>
          <Text style={styles.expandArrow}>{isExpand ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* ── Area expand detail ────────────────────────────── */}
      {isExpand && (
        <View style={styles.expandArea}>
          <View style={styles.garis} />

          {/* Data jenazah */}
          <Text style={styles.expandJudul}>📋 Data Jenazah</Text>
          <InfoBaris icon="🪪" label="NIK" value={item.nik} />
          <InfoBaris icon="📛" label="Bin / Binti" value={item.binBinti} />
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
          <InfoBaris icon="📝" label="Catatan" value={item.notes} />
          <InfoBaris
            icon="📅"
            label="Diajukan"
            value={formatTgl(item.createdAt)}
          />

          {/* Data makam — hanya tampil jika sudah verified */}
          {item.status === 'verified' && (
            <>
              <View style={styles.garis} />
              <Text style={styles.expandJudul}>🪦 Lokasi Makam</Text>
              <View style={styles.makamBox}>
                <View style={styles.makamItem}>
                  <Text style={styles.makamLabel}>Blok</Text>
                  <Text style={styles.makamValue}>
                    {item.assignedBlock || '-'}
                  </Text>
                </View>
                <View style={styles.makamDivider} />
                <View style={styles.makamItem}>
                  <Text style={styles.makamLabel}>No. Makam</Text>
                  <Text style={styles.makamValue}>
                    {item.assignedGraveNumber || '-'}
                  </Text>
                </View>
              </View>
              {item.adminNote ? (
                <View style={styles.adminNoteBox}>
                  <Text style={styles.adminNoteLabel}>📋 Catatan Admin:</Text>
                  <Text style={styles.adminNoteTeks}>{item.adminNote}</Text>
                </View>
              ) : null}
            </>
          )}

          {/* Dokumen pendukung */}
          <View style={styles.garis} />
          <Text style={styles.expandJudul}>📁 Dokumen Pendukung</Text>
          {adaDokumen ? (
            <View style={styles.dokRow}>
              <DokBadge label="KTP" ada={!!dok.ktp} />
              <DokBadge label="KK" ada={!!dok.kk} />
              <DokBadge label="Srt. Kematian" ada={!!dok.suratKematian} />
              <DokBadge label="Srt. Medis" ada={!!dok.suratMedis} />
            </View>
          ) : (
            <Text style={styles.dokKosong}>Tidak ada dokumen terupload</Text>
          )}

          {/* Tombol aksi */}
          <View style={styles.garis} />
          <View style={styles.aksiRow}>
            <TouchableOpacity
              style={[styles.tombolAksi, {backgroundColor: C.biru}]}
              onPress={onPress}>
              <Text style={styles.tombolAksiTeks}>🔍 Detail</Text>
            </TouchableOpacity>

            {item.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.tombolAksi, {backgroundColor: C.oranye}]}
                  onPress={onEdit}>
                  <Text style={styles.tombolAksiTeks}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tombolAksi, {backgroundColor: C.merah}]}
                  onPress={onDelete}>
                  <Text style={styles.tombolAksiTeks}>🗑️ Hapus</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// ================================================================
// MAIN SCREEN
// ================================================================
export default function UserBurialListScreen({navigation}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Semua');
  const [cari, setCari] = useState('');
  const [expandId, setExpandId] = useState(null);

  // Statistik
  const [statPending, setStatPending] = useState(0);
  const [statVerified, setStatVerified] = useState(0);
  const [statRejected, setStatRejected] = useState(0);

  const uid = auth().currentUser?.uid;

  // ── Firestore listener ──────────────────────────────────────
  useEffect(() => {
    if (!uid) {
      navigation.navigate('Login');
      return;
    }

    const unsub = firestore()
      .collection('burials')
      .where('createdBy', '==', uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        qs => {
          let p = 0,
            v = 0,
            r = 0;
          const arr = [];
          qs.forEach(doc => {
            const d = {id: doc.id, ...doc.data()};
            arr.push(d);
            if (d.status === 'pending') p++;
            if (d.status === 'verified') v++;
            if (d.status === 'rejected') r++;
          });
          setItems(arr);
          setStatPending(p);
          setStatVerified(v);
          setStatRejected(r);
          setLoading(false);
        },
        err => {
          console.log('[UserBurialList] err', err);
          setLoading(false);
        },
      );

    return () => unsub();
  }, [uid, navigation]);

  // ── Hapus item ───────────────────────────────────────────────
  const handleDelete = (id, status) => {
    if (status !== 'pending') {
      Alert.alert(
        'Tidak Bisa Dihapus',
        'Hanya permohonan berstatus Pending yang dapat dihapus.',
      );
      return;
    }
    Alert.alert(
      '🗑️ Hapus Permohonan',
      'Yakin ingin menghapus permohonan ini? Tindakan ini tidak bisa dibatalkan.',
      [
        {text: 'Batal', style: 'cancel'},
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('burials').doc(id).delete();
              setExpandId(null);
              Alert.alert('✅ Berhasil', 'Permohonan berhasil dihapus.');
            } catch (err) {
              console.log(err);
              Alert.alert('Error', 'Gagal menghapus. Coba lagi.');
            }
          },
        },
      ],
    );
  };

  // ── Filter + pencarian ───────────────────────────────────────
  const dataFiltered = items
    .filter(i => filter === 'Semua' || i.status === filter)
    .filter(i => {
      if (!cari.trim()) return true;
      const q = cari.toLowerCase();
      return (
        (i.deceasedName || '').toLowerCase().includes(q) ||
        (i.heirName || '').toLowerCase().includes(q) ||
        (i.nik || '').toLowerCase().includes(q) ||
        (i.agama || '').toLowerCase().includes(q)
      );
    });

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={C.gelap} barStyle="light-content" />
        <View style={styles.pusatLayar}>
          <ActivityIndicator size="large" color={C.hijau} />
          <Text style={styles.loadingTeks}>Memuat permohonan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── RENDER UTAMA ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.gelap} barStyle="light-content" />

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerJudul}>📋 Permohonan Saya</Text>
          <Text style={styles.headerSub}>Total {items.length} permohonan</Text>
        </View>
        <TouchableOpacity
          style={styles.tombolTambah}
          onPress={() => navigation.navigate('UserBurialForm')}
          activeOpacity={0.85}>
          <Text style={styles.tombolTambahTeks}>➕ Ajukan Baru</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dataFiltered}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ══ STAT RINGKASAN ═══════════════════════════ */}
            <View style={styles.statRow}>
              <View style={[styles.statKartu, {borderTopColor: C.oranye}]}>
                <Text style={[styles.statAngka, {color: C.oranye}]}>
                  {statPending}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statKartu, {borderTopColor: C.hijau}]}>
                <Text style={[styles.statAngka, {color: C.hijau}]}>
                  {statVerified}
                </Text>
                <Text style={styles.statLabel}>Diverifikasi</Text>
              </View>
              <View style={[styles.statKartu, {borderTopColor: C.merah}]}>
                <Text style={[styles.statAngka, {color: C.merah}]}>
                  {statRejected}
                </Text>
                <Text style={styles.statLabel}>Ditolak</Text>
              </View>
            </View>

            {/* ══ SEARCH ═══════════════════════════════════ */}
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama, NIK, ahli waris, agama..."
                placeholderTextColor={C.abu}
                value={cari}
                onChangeText={setCari}
                returnKeyType="search"
              />
              {cari.length > 0 && (
                <TouchableOpacity onPress={() => setCari('')}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ══ FILTER TAB ═══════════════════════════════ */}
            <View style={styles.filterScroll}>
              {FILTER.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterBtn,
                    filter === f && styles.filterBtnAktif,
                  ]}
                  onPress={() => {
                    setFilter(f);
                    setExpandId(null);
                  }}>
                  <Text
                    style={[
                      styles.filterTeks,
                      filter === f && styles.filterTeksAktif,
                    ]}>
                    {labelFilter(f)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info hasil filter */}
            {(cari || filter !== 'Semua') && (
              <Text style={styles.infoFilter}>
                Menampilkan {dataFiltered.length} hasil
                {filter !== 'Semua' ? ` • ${labelFilter(filter)}` : ''}
                {cari ? ` • "${cari}"` : ''}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.kosongBox}>
            <Text style={styles.kosongIkon}>
              {items.length === 0 ? '📭' : '🔍'}
            </Text>
            <Text style={styles.kosongTeks}>
              {items.length === 0
                ? 'Belum ada permohonan'
                : 'Tidak ada hasil yang cocok'}
            </Text>
            <Text style={styles.kosongSub}>
              {items.length === 0
                ? 'Tap "Ajukan Baru" untuk membuat permohonan pemakaman pertamamu.'
                : 'Coba ubah kata kunci pencarian atau filter status.'}
            </Text>
            {items.length === 0 && (
              <TouchableOpacity
                style={styles.tombolKosong}
                onPress={() => navigation.navigate('UserBurialForm')}>
                <Text style={styles.tombolKosongTeks}>
                  ➕ Ajukan Permohonan Baru
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({item}) => (
          <BurialCard
            item={item}
            isExpand={expandId === item.id}
            onToggle={() =>
              setExpandId(prev => (prev === item.id ? null : item.id))
            }
            onPress={() => navigation.navigate('BurialDetail', {id: item.id})}
            onEdit={() =>
              navigation.navigate('BurialDetail', {id: item.id, edit: true})
            }
            onDelete={() => handleDelete(item.id, item.status)}
          />
        )}
        ListFooterComponent={
          dataFiltered.length > 0 ? (
            <Text style={styles.footer}>
              {dataFiltered.length} data ditampilkan
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: C.gelap},
  pusatLayar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.gelap,
  },
  loadingTeks: {color: '#fff', marginTop: 12, fontSize: 14},

  // ── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: C.gelap,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 6,
  },
  headerJudul: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
  headerSub: {color: C.abu, fontSize: 12, marginTop: 3},
  tombolTambah: {
    backgroundColor: C.hijau,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 3,
  },
  tombolTambahTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},

  // ── List content ─────────────────────────────────────────────
  listContent: {padding: 14, paddingTop: 12, backgroundColor: C.bg},

  // ── Stat ringkasan ───────────────────────────────────────────
  statRow: {flexDirection: 'row', gap: 10, marginBottom: 14},
  statKartu: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statAngka: {fontSize: 24, fontWeight: 'bold'},
  statLabel: {fontSize: 11, color: C.abuGelap, marginTop: 3},

  // ── Search ───────────────────────────────────────────────────
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 1,
  },
  searchIcon: {fontSize: 16, marginRight: 8},
  searchInput: {flex: 1, paddingVertical: 12, fontSize: 14, color: C.teks},
  searchClear: {fontSize: 14, color: C.abu, padding: 4},

  // ── Filter ───────────────────────────────────────────────────
  filterScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterBtnAktif: {backgroundColor: C.gelap, borderColor: C.gelap},
  filterTeks: {fontSize: 12, color: C.abuGelap, fontWeight: '600'},
  filterTeksAktif: {color: '#fff'},
  infoFilter: {
    fontSize: 11,
    color: C.abu,
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // ── Card ─────────────────────────────────────────────────────
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarTeks: {fontSize: 20, fontWeight: 'bold'},
  cardNama: {fontSize: 15, fontWeight: 'bold', color: C.teks, flex: 1},
  cardSub: {fontSize: 12, color: C.abuGelap, marginTop: 2},
  expandArrow: {color: C.abu, fontSize: 11, marginTop: 4},

  // ── Status badge ─────────────────────────────────────────────
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeTeks: {fontSize: 11, fontWeight: 'bold'},

  // ── Expand area ──────────────────────────────────────────────
  expandArea: {paddingHorizontal: 14, paddingBottom: 14},
  garis: {height: 1, backgroundColor: '#f0f0f0', marginVertical: 10},
  expandJudul: {
    fontSize: 12,
    fontWeight: '700',
    color: C.abuGelap,
    marginBottom: 8,
  },

  // ── Info baris ───────────────────────────────────────────────
  infoBaris: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  infoIcon: {fontSize: 13, width: 20},
  infoLabel: {fontSize: 10, color: C.abu},
  infoValue: {fontSize: 13, color: C.teks, fontWeight: '500', flexWrap: 'wrap'},

  // ── Makam box ────────────────────────────────────────────────
  makamBox: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  makamItem: {flex: 1, padding: 14, alignItems: 'center'},
  makamDivider: {width: 1, backgroundColor: '#c8e6c9'},
  makamLabel: {fontSize: 11, color: '#4caf50'},
  makamValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginTop: 4,
  },
  adminNoteBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.oranye,
  },
  adminNoteLabel: {
    fontSize: 11,
    color: C.oranye,
    fontWeight: '700',
    marginBottom: 3,
  },
  adminNoteTeks: {fontSize: 13, color: '#bf360c'},

  // ── Dokumen ──────────────────────────────────────────────────
  dokRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4},
  dokBadge: {borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  dokBadgeTeks: {fontSize: 11, fontWeight: '600'},
  dokKosong: {fontSize: 12, color: C.abu, fontStyle: 'italic'},

  // ── Tombol aksi ──────────────────────────────────────────────
  aksiRow: {flexDirection: 'row', gap: 8, marginTop: 4},
  tombolAksi: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 1,
  },
  tombolAksiTeks: {color: '#fff', fontWeight: 'bold', fontSize: 13},

  // ── Kosong ───────────────────────────────────────────────────
  kosongBox: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: C.card,
    borderRadius: 14,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  kosongIkon: {fontSize: 48, marginBottom: 12},
  kosongTeks: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.teks,
    textAlign: 'center',
  },
  kosongSub: {
    fontSize: 13,
    color: C.abu,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  tombolKosong: {
    backgroundColor: C.hijau,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
    elevation: 2,
  },
  tombolKosongTeks: {color: '#fff', fontWeight: 'bold', fontSize: 14},

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    textAlign: 'center',
    color: C.abu,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 4,
  },
});
