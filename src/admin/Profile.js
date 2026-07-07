// src/screens/ProfileScreen.js
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

const ProfileScreen = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // ── Data dari Firestore (semua field dari Register) ─────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user'); // tidak bisa diubah
  const [nik, setNik] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [hubungan, setHubungan] = useState('');
  const [noTelepon, setNoTelepon] = useState(''); // bisa diubah

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
            setRole(d.role || 'user');
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
          console.log('[Profile] load error:', err);
          Alert.alert('Error', 'Gagal memuat data profil');
          setLoading(false);
        },
      );

    return () => unsub();
  }, [navigation]);

  // ── Auto-format tanggal ─────────────────────────────────────────
  const formatTanggal = (text, setter) => {
    let val = text.replace(/[^0-9]/g, '');
    if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    setter(val.slice(0, 10));
  };

  // ── Simpan perubahan ────────────────────────────────────────────
  const handleSave = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    if (!name.trim()) {
      Alert.alert('Validasi', 'Nama tidak boleh kosong.');
      return;
    }
    if (noTelepon.trim() && !/^\d{10,13}$/.test(noTelepon.trim())) {
      Alert.alert('Validasi', 'No. telepon harus 10-13 digit angka.');
      return;
    }

    try {
      setSaving(true);
      await firestore().collection('users').doc(currentUser.uid).set(
        {
          name: name.trim(), // String — bisa diubah
          noTelepon: noTelepon.trim(), // String — bisa diubah
          alamat: alamat.trim(), // String — bisa diubah
          hubungan: hubungan.trim(), // String — bisa diubah
          // nik, tglLahir, role, email TIDAK diupdate (read-only)
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
      setEditing(false);
      Alert.alert('Sukses', 'Profil berhasil disimpan.');
    } catch (err) {
      console.log('[Profile] save error:', err);
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  // ── Logout ──────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
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

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#1a3c5e" barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e90ff" />
          <Text style={{color: '#fff', marginTop: 10}}>Memuat profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initialLetter =
    (name && name.charAt(0).toUpperCase()) ||
    (email && email.charAt(0).toUpperCase()) ||
    'U';

  const isAdmin = role === 'admin';
  const roleLabel = isAdmin ? '🛡️  Administrator' : '👤  User';
  const roleBg = isAdmin ? '#fff3cd' : '#e8f4fd';
  const roleTxt = isAdmin ? '#856404' : '#1e90ff';

  // ── Komponen baris tampilan (read-only) ─────────────────────────
  const InfoRow = ({icon, label, value, locked}) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
      {locked && <Text style={styles.lockIcon}>🔒</Text>}
    </View>
  );

  // ── Komponen input edit ─────────────────────────────────────────
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
    <View style={styles.editRow}>
      <Text style={styles.editLabel}>
        {icon} {label} {locked ? '🔒' : ''}
      </Text>
      {locked ? (
        <View style={styles.lockedInput}>
          <Text style={styles.lockedInputTxt}>{value || '-'}</Text>
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
          editable={!locked}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1a3c5e" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 40}}>
        {/* ══════════════════════════════════════
            HERO HEADER
        ══════════════════════════════════════ */}
        <View style={styles.heroHeader}>
          <View style={styles.heroBg} />
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{initialLetter}</Text>
            </View>
            <View style={[styles.rolePill, {backgroundColor: roleBg}]}>
              <Text style={[styles.rolePillTxt, {color: roleTxt}]}>
                {roleLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.heroName}>{name || 'Nama belum diisi'}</Text>
          <Text style={styles.heroEmail}>{email}</Text>
        </View>

        {/* ══════════════════════════════════════
            KARTU INFO / EDIT
        ══════════════════════════════════════ */}
        <View style={styles.mainCard}>
          {/* ── Sub-judul section ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {editing ? '✏️  Edit Profil' : '📋  Informasi Profil'}
            </Text>
            <View style={styles.editModeTag}>
              <Text
                style={{
                  color: editing ? '#1e90ff' : '#aaa',
                  fontSize: 11,
                  fontWeight: '600',
                }}>
                {editing ? 'MODE EDIT' : 'READ ONLY'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {!editing ? (
            /* ════ VIEW MODE ════ */
            <>
              <Text style={styles.groupLabel}>Data Akun</Text>
              <InfoRow icon="👤" label="Nama Lengkap" value={name} />
              <InfoRow icon="📧" label="Email" value={email} locked />
              <InfoRow icon="🛡️" label="Role" value={roleLabel} locked />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>Data Identitas</Text>
              <InfoRow icon="🪪" label="NIK" value={nik} locked />
              <InfoRow
                icon="🎂"
                label="Tanggal Lahir"
                value={tglLahir}
                locked
              />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>Data Kontak & Alamat</Text>
              <InfoRow icon="📞" label="No. Telepon" value={noTelepon} />
              <InfoRow icon="🏠" label="Alamat" value={alamat} />
              <InfoRow
                icon="🤝"
                label="Hubungan dgn Jenazah"
                value={hubungan}
              />
            </>
          ) : (
            /* ════ EDIT MODE ════ */
            <>
              <Text style={styles.groupLabel}>Data Akun</Text>
              <EditRow
                icon="👤"
                label="Nama Lengkap"
                value={name}
                onChangeText={setName}
                placeholder="Nama lengkap kamu"
              />
              <EditRow icon="📧" label="Email" value={email} locked />
              <EditRow
                icon="🛡️"
                label="Role"
                value={isAdmin ? 'Administrator' : 'User'}
                locked
              />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>
                Data Identitas (tidak bisa diubah)
              </Text>
              <EditRow icon="🪪" label="NIK" value={nik} locked />
              <EditRow
                icon="🎂"
                label="Tanggal Lahir"
                value={tglLahir}
                locked
              />

              <View style={styles.divider} />
              <Text style={styles.groupLabel}>Data Kontak & Alamat</Text>
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

              <Text style={styles.editHint}>
                🔒 = tidak bisa diubah setelah registrasi
              </Text>
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
                <Text style={styles.btnSaveTxt}>💾 Simpan</Text>
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

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#1a3c5e'},
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a3c5e',
  },

  // ── Hero Header ──
  heroHeader: {
    backgroundColor: '#1a3c5e',
    paddingTop: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  heroBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: '#f1f2f6',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  avatarWrapper: {alignItems: 'center', marginBottom: 10},
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2e6da4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 6,
  },
  avatarLetter: {color: '#fff', fontSize: 34, fontWeight: 'bold'},
  rolePill: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rolePillTxt: {fontSize: 12, fontWeight: 'bold'},
  heroName: {color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4},
  heroEmail: {color: '#a8c8e8', fontSize: 12, marginTop: 2, marginBottom: 16},

  // ── Main Card ──
  mainCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {fontSize: 15, fontWeight: 'bold', color: '#1a3c5e'},
  editModeTag: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e90ff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  divider: {height: 1, backgroundColor: '#f0f0f0', marginVertical: 10},
  editHint: {color: '#aaa', fontSize: 11, marginTop: 12, textAlign: 'center'},

  // ── Info Row (view mode) ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  infoIconBox: {width: 32, alignItems: 'center'},
  infoIcon: {fontSize: 16},
  infoContent: {flex: 1, marginLeft: 8},
  infoLabel: {fontSize: 11, color: '#aaa'},
  infoValue: {fontSize: 14, color: '#303030', fontWeight: '500', marginTop: 1},
  lockIcon: {fontSize: 13, marginLeft: 6},

  // ── Edit Row ──
  editRow: {marginBottom: 10},
  editLabel: {fontSize: 12, color: '#555', fontWeight: '600', marginBottom: 4},
  editInput: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 13,
    color: '#303030',
  },
  lockedInput: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  lockedInputTxt: {fontSize: 13, color: '#888'},

  // ── Tombol ──
  btnRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  btnEdit: {
    flex: 1,
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  btnEditTxt: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  btnLogout: {
    flex: 1,
    backgroundColor: '#ff4757',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  btnLogoutTxt: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  btnSave: {
    flex: 2,
    backgroundColor: '#2ed573',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  btnSaveTxt: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  btnCancel: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  btnCancelTxt: {color: '#555', fontWeight: 'bold', fontSize: 14},
});
