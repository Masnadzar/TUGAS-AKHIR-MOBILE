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

  // field profil
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cemeteryName, setCemeteryName] = useState('');
  const [role, setRole] = useState('user');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const currentUser = auth().currentUser;

    if (!currentUser) {
      // kalau belum login, paksa kembali ke Login
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
      return;
    }

    setEmail(currentUser.email || '');

    const userDocRef = firestore().collection('users').doc(currentUser.uid);

    const unsubscribe = userDocRef.onSnapshot(
      docSnap => {
        if (docSnap.exists) {
          const data = docSnap.data();
          setName(data.name || '');
          setPhone(data.phone || '');
          setCemeteryName(data.cemeteryName || '');
          setRole(data.role || 'user');
        } else {
          // kalau dokumen belum ada, set nilai default
          setName(currentUser.displayName || '');
          setRole('user');
        }
        setLoading(false);
      },
      error => {
        console.log('[Profile] load error:', error);
        Alert.alert('Error', 'Gagal memuat data profil');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [navigation]);

  const handleSave = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    if (!name.trim()) {
      Alert.alert('Validasi', 'Nama tidak boleh kosong');
      return;
    }

    try {
      setSaving(true);
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set(
          {
            name: name.trim(),
            phone: phone.trim(),
            cemeteryName: cemeteryName.trim(),
            role: role.trim() || 'user',
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
      setEditing(false);
      Alert.alert('Sukses', 'Profil berhasil disimpan');
    } catch (error) {
      console.log('[Profile] save error:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      console.log('[Profile] logout error:', error);
      Alert.alert('Error', 'Gagal logout');
    }
  };

  const renderRowReadOnly = (label, value) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '-'}</Text>
    </View>
  );

  const renderRowInput = (label, value, onChangeText, placeholder) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a4b0be"
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#1e272e" barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2ed573" />
          <Text style={{color: '#f5f6fa', marginTop: 8}}>Memuat profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initialLetter =
    (name && name.charAt(0).toUpperCase()) ||
    (email && email.charAt(0).toUpperCase()) ||
    'U';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1e272e" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 24}}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>

        {/* CARD PROFIL */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialLetter}</Text>
          </View>
          <Text style={styles.nameText}>{name || 'Nama belum diisi'}</Text>
          <Text style={styles.roleText}>
            {role === 'admin' ? 'Administrator' : 'User'}
          </Text>
          <Text style={styles.emailText}>{email}</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {cemeteryName || 'Belum ada nama pemakaman'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            {!editing ? (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setEditing(true)}>
                  <Text style={styles.primaryButtonText}>Edit Profil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleLogout}>
                  <Text style={styles.secondaryButtonText}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSave}
                  disabled={saving}>
                  <Text style={styles.primaryButtonText}>
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setEditing(false)}
                  disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Batal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* DETAIL PROFIL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail Akun</Text>

          {editing
            ? renderRowInput(
                'Nama Lengkap',
                name,
                setName,
                'Masukkan nama lengkap',
              )
            : renderRowReadOnly('Nama Lengkap', name)}

          {renderRowReadOnly('Email', email)}

          {editing
            ? renderRowInput('No. HP', phone, setPhone, 'Masukkan nomor HP')
            : renderRowReadOnly('No. HP', phone)}

          {editing
            ? renderRowInput(
                'Nama Pemakaman',
                cemeteryName,
                setCemeteryName,
                'Contoh: TPU Kota Sejahtera',
              )
            : renderRowReadOnly('Nama Pemakaman', cemeteryName)}

          {editing
            ? renderRowInput('Peran / Role', role, setRole, 'admin atau user')
            : renderRowReadOnly('Peran / Role', role)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e272e',
  },
  container: {
    flex: 1,
    backgroundColor: '#E4EEF1FF',
  },
  center: {
    flex: 1,
    backgroundColor: '#1e272e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e272e',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
    elevation: 4,
  },
  headerTitle: {
    color: '#f5f6fa',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -36,
    borderRadius: 16,
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2f3542',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  avatarText: {
    color: '#f5f6fa',
    fontSize: 26,
    fontWeight: 'bold',
  },
  nameText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2f3542',
  },
  roleText: {
    fontSize: 13,
    color: '#57606f',
  },
  emailText: {
    fontSize: 12,
    color: '#747d8c',
    marginTop: 4,
  },
  badge: {
    marginTop: 10,
    backgroundColor: '#2ed57322',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    color: '#2ed573',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2ed573',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ff4757',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 6,
  },
  primaryButtonText: {
    color: '#f5f6fa',
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#f5f6fa',
    fontWeight: 'bold',
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2f3542',
    marginBottom: 6,
  },
  row: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#747d8c',
  },
  value: {
    fontSize: 14,
    color: '#2f3542',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    marginTop: 2,
    backgroundColor: '#ffffff',
    color: '#2f3542',
  },
});
