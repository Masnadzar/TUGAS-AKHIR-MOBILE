// src/screens/UserProfileScreen.js
import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const ProfileUserScreen = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // ── Semua field dari Register ───────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nik, setNik] = useState(''); // 🔒 tidak bisa diubah
  const [tglLahir, setTglLahir] = useState(''); // 🔒 tidak bisa diubah
  const [alamat, setAlamat] = useState(''); // ✅ bisa diubah
  const [hubungan, setHubungan] = useState(''); // ✅ bisa diubah
  const [noTelepon, setNoTelepon] = useState(''); // ✅ bisa diubah

  // ── Load data dari Firestore ────────────────────────────────────
  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
      return;
    }
    setEmail(currentUser.email || '');

    const unsub = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(
        snap => {
          if (snap.exists) {
            const d = snap.data();
            setName(d.name || '');
            setNik(d.nik || '');
            setTglLahir(d.tglLahir || '');
            setAlamat(d.alamat || '');
            setHubungan(d.hubungan || '');
            setNoTelepon(d.noTelepon || d.phone || '');
          } else {
            setName(currentUser.displayName || '');
          }
          setLoading(false);
        },
        err => {
          console.log('[UserProfile] error:', err);
          Alert.alert('Error', 'Gagal memuat profil');
          setLoading(false);
        },
      );

    return () => unsub();
  }, [navigation]);

  // ── Simpan — hanya field yang boleh diubah ──────────────────────
  const handleSave = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    if (!name.trim()) {
      Alert.alert('Validasi', 'Nama tidak boleh kosong.');
      return;
    }
    if (noTelepon.trim() && !/^\d{10,13}$/.test(noTelepon.trim())) {
      Alert.alert(
        'Validasi',
        'No. telepon harus 10–13 digit angka.\nContoh: 08123456789',
      );
      return;
    }

    try {
      setSaving(true);
      // Hanya update field yang boleh diubah user
      // NIK, tglLahir, role, email TIDAK dikirim → tetap aman
      await firestore().collection('users').doc(currentUser.uid).set(
        {
          name: name.trim(), // String ✅
          noTelepon: noTelepon.trim(), // String ✅
          alamat: alamat.trim(), // String ✅
          hubungan: hubungan.trim(), // String ✅
          updatedAt: firestore.FieldValue.serverTimestamp(), // Timestamp
        },
        {merge: true},
      );
      setEditing(false);
      Alert.alert('Sukses', 'Profil berhasil disimpan.');
    } catch (err) {
      console.log('[UserProfile] save error:', err);
      Alert.alert('Error', 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  // ── Logout dengan konfirmasi ────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar dari akun?', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth().signOut();
            navigation.reset({index: 0, routes: [{name: 'Login'}]});
          } catch (err) {
            Alert.alert('Error', 'Gagal logout.');
          }
        },
      },
    ]);
  };

  // ── Loading screen ──────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#07575b" barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2ed573" />
          <Text style={{color: '#fff', marginTop: 10, fontSize: 14}}>
            Memuat profil...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const initial =
    (name && name.charAt(0).toUpperCase()) ||
    (email && email.charAt(0).toUpperCase()) ||
    'U';

  // ── Sub-komponen: baris info (view mode) ────────────────────────
  const InfoRow = ({icon, label, value, locked}) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
      {locked && <Text style={styles.lockBadge}>🔒</Text>}
    </View>
  );

  // ── Sub-komponen: input edit ────────────────────────────────────
  const EditRow = ({
    icon,
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    maxLength,
    multiline,
    locked,
  }) => (
    <View style={styles.editRowWrap}>
      <View style={styles.editLabelRow}>
        <Text style={styles.editIcon}>{icon}</Text>
        <Text style={styles.editLabel}>{label}</Text>
        {locked && (
          <View style={styles.lockedTag}>
            <Text style={styles.lockedTagTxt}>Tidak bisa diubah</Text>
          </View>
        )}
      </View>
      {locked ? (
        <View style={styles.lockedBox}>
          <Text style={styles.lockedBoxTxt}>{value || '-'}</Text>
        </View>
      ) : (
        <TextInput
          style={[
            styles.editInput,
            multiline && {height: 75, textAlignVertical: 'top'},
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          keyboardType={keyboardType || 'default'}
          maxLength={maxLength}
          multiline={multiline}
        />
      )}
    </View>
  );

  // ── Render utama ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#07575b" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 44}}>
        {/* ══════════════════════════════════════
            HERO HEADER — Avatar + Nama + Email
        ══════════════════════════════════════ */}
        <View style={styles.heroSection}>
          {/* Gelombang bawah hero */}
          <View style={styles.heroWave} />

          {/* Avatar */}
          <View style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          </View>

          {/* Badge Role */}
          <View style={styles.userRolePill}>
            <Text style={styles.userRoleTxt}>👤 Pengguna</Text>
          </View>

          <Text style={styles.heroName}>{name || 'Nama belum diisi'}</Text>
          <Text style={styles.heroEmail}>{email}</Text>

          {/* Statistik singkat */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🪪</Text>
              <Text style={styles.statLabel}>NIK</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {nik ? nik.slice(0, 6) + '••••••••••' : '-'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🎂</Text>
              <Text style={styles.statLabel}>Tgl Lahir</Text>
              <Text style={styles.statValue}>{tglLahir || '-'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🤝</Text>
              <Text style={styles.statLabel}>Hubungan</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {hubungan || '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════
            KARTU UTAMA — INFO / EDIT
        ══════════════════════════════════════ */}
        <View style={styles.mainCard}>
          {/* Header kartu */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTxt}>
              {editing ? '✏️  Edit Profil' : '📋  Detail Profil'}
            </Text>
            <View
              style={[
                styles.modePill,
                {backgroundColor: editing ? '#e8f4fd' : '#f0f0f0'},
              ]}>
              <Text
                style={[
                  styles.modePillTxt,
                  {color: editing ? '#1e90ff' : '#aaa'},
                ]}>
                {editing ? 'MODE EDIT' : 'READ ONLY'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── VIEW MODE ── */}
          {!editing ? (
            <>
              <Text style={styles.groupLabel}>DATA AKUN</Text>
              <InfoRow icon="👤" label="Nama Lengkap" value={name} />
              <InfoRow icon="📧" label="Email" value={email} locked />
              <InfoRow icon="🛡️" label="Role" value="Pengguna" locked />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>
                IDENTITAS (TIDAK BISA DIUBAH)
              </Text>
              <InfoRow icon="🪪" label="NIK" value={nik} locked />
              <InfoRow
                icon="🎂"
                label="Tanggal Lahir"
                value={tglLahir}
                locked
              />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>KONTAK & ALAMAT</Text>
              <InfoRow icon="📞" label="No. Telepon" value={noTelepon} />
              <InfoRow icon="🏠" label="Alamat" value={alamat} />
              <InfoRow
                icon="🤝"
                label="Hubungan dgn Jenazah"
                value={hubungan}
              />
            </>
          ) : (
            /* ── EDIT MODE ── */
            <>
              <Text style={styles.groupLabel}>DATA AKUN</Text>
              <EditRow
                icon="👤"
                label="Nama Lengkap"
                value={name}
                onChangeText={setName}
                placeholder="Nama lengkap kamu"
              />
              <EditRow icon="📧" label="Email" value={email} locked />
              <EditRow icon="🛡️" label="Role" value="Pengguna" locked />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>
                IDENTITAS (TIDAK BISA DIUBAH)
              </Text>
              <EditRow icon="🪪" label="NIK" value={nik} locked />
              <EditRow
                icon="🎂"
                label="Tanggal Lahir"
                value={tglLahir}
                locked
              />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>KONTAK & ALAMAT</Text>
              <EditRow
                icon="📞"
                label="No. Telepon"
                value={noTelepon}
                onChangeText={setNoTelepon}
                placeholder="08123456789"
                keyboardType="phone-pad"
                maxLength={13}
              />
              <EditRow
                icon="🏠"
                label="Alamat"
                value={alamat}
                onChangeText={setAlamat}
                placeholder="Alamat lengkap kamu"
                multiline
              />
              <EditRow
                icon="🤝"
                label="Hubungan dgn Jenazah"
                value={hubungan}
                onChangeText={setHubungan}
                placeholder="Anak, Suami, Istri, Saudara"
              />

              <View style={styles.hintBox}>
                <Text style={styles.hintTxt}>
                  🔒 NIK, Tanggal Lahir, Email, dan Role tidak bisa diubah
                  setelah registrasi.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ══════════════════════════════════════
            TOMBOL AKSI
        ══════════════════════════════════════ */}
        {!editing ? (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnEdit}
              onPress={() => setEditing(true)}>
              <Text style={styles.btnEditTxt}>✏️ Edit Profil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
              <Text style={styles.btnLogoutTxt}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btnSave, saving && {opacity: 0.7}]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.btnSaveTxt}>Menyimpan...</Text>
                </View>
              ) : (
                <Text style={styles.btnSaveTxt}>💾 Simpan Perubahan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={() => setEditing(false)}
              disabled={saving}>
              <Text style={styles.btnCancelTxt}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileUserScreen;

const TEAL = '#07575b';
const TEAL_LIGHT = '#0a7377';

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: TEAL},
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TEAL,
  },

  // ── Hero ──────────────────────────────────────────────────────────
  heroSection: {
    backgroundColor: TEAL,
    paddingTop: 20,
    paddingBottom: 50,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heroWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#f1f2f6',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  avatarOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: TEAL_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
  },
  avatarLetter: {color: '#fff', fontSize: 34, fontWeight: 'bold'},
  userRolePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  userRoleTxt: {color: '#fff', fontSize: 12, fontWeight: '600'},
  heroName: {color: '#fff', fontSize: 20, fontWeight: 'bold'},
  heroEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },

  // ── Stats row ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: '100%',
    marginBottom: 8,
  },
  statItem: {flex: 1, alignItems: 'center'},
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 4,
  },
  statIcon: {fontSize: 16, marginBottom: 2},
  statLabel: {color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '600'},
  statValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Main card ─────────────────────────────────────────────────────
  mainCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 18,
    padding: 16,
    elevation: 5,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTxt: {fontSize: 15, fontWeight: 'bold', color: TEAL},
  modePill: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10},
  modePillTxt: {fontSize: 10, fontWeight: 'bold'},
  groupLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: TEAL,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 8,
  },
  divider: {height: 1, backgroundColor: '#f0f0f0', marginVertical: 10},

  // ── Info row (view mode) ──────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  infoIconBox: {width: 30, alignItems: 'center'},
  infoIcon: {fontSize: 16},
  infoContent: {flex: 1, marginLeft: 10},
  infoLabel: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {fontSize: 13, color: '#303030', fontWeight: '600', marginTop: 2},
  lockBadge: {fontSize: 13, marginLeft: 6},

  // ── Edit row ─────────────────────────────────────────────────────
  editRowWrap: {marginBottom: 12},
  editLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 6,
  },
  editIcon: {fontSize: 15},
  editLabel: {fontSize: 12, color: '#555', fontWeight: '600', flex: 1},
  lockedTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lockedTagTxt: {fontSize: 9, color: '#aaa', fontWeight: '600'},
  lockedBox: {
    backgroundColor: '#f7f7f7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  lockedBoxTxt: {fontSize: 13, color: '#aaa'},
  editInput: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 13,
    color: '#303030',
  },
  hintBox: {
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  hintTxt: {color: '#6c87c7', fontSize: 11, lineHeight: 17},

  // ── Tombol ───────────────────────────────────────────────────────
  btnRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  btnEdit: {
    flex: 1,
    backgroundColor: TEAL,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  btnEditTxt: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  btnLogout: {
    flex: 1,
    backgroundColor: '#ff4757',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  btnLogoutTxt: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  btnSave: {
    flex: 2,
    backgroundColor: '#2ed573',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  btnSaveTxt: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  btnCancel: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  btnCancelTxt: {color: '#555', fontWeight: 'bold', fontSize: 14},
});
