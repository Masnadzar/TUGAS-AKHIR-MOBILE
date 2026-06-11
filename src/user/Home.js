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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const StatCard = ({label, value, color}) => (
  <View style={[styles.statCard, {backgroundColor: color || '#3742fa'}]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>
      {typeof value === 'number' ? value : value}
    </Text>
  </View>
);

export default function HomeUserScreen({navigation}) {
  const [loading, setLoading] = useState(true);

  // global stats (public)
  const [totalBurials, setTotalBurials] = useState(0);

  // user-specific stats
  const [myTotal, setMyTotal] = useState(0);
  const [myVerified, setMyVerified] = useState(0);
  const [myPending, setMyPending] = useState(0);

  // lists
  const [recentBurials, setRecentBurials] = useState([]);
  const [myBurials, setMyBurials] = useState([]);

  const user = auth().currentUser;

  useEffect(() => {
    if (!user) {
      // jika user belum login
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
      return;
    }

    setLoading(true);

    // listener untuk semua burials (kita ambil count + recent)
    const unsubAll = firestore()
      .collection('burials')
      .orderBy('createdAt', 'desc')
      .limit(50) // batasi client side
      .onSnapshot(
        snap => {
          const arr = [];
          snap.forEach(doc => {
            const d = doc.data() || {};
            arr.push({id: doc.id, ...d});
          });
          setTotalBurials(arr.length ? arr.length : 0); // jika mau total seluruh koleksi besar, ganti dengan query count di server
          setRecentBurials(arr.slice(0, 5));
        },
        err => {
          console.log('[HomeUser] all onSnapshot err', err);
        },
      );

    // listener untuk entri milik user
    const unsubMine = firestore()
      .collection('burials')
      .where('createdBy', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          const arr = [];
          let verified = 0;
          let pending = 0;
          snap.forEach(doc => {
            const d = doc.data() || {};
            arr.push({id: doc.id, ...d});
            if (d.status === 'verified') verified += 1;
            else if (d.status === 'pending') pending += 1;
          });
          setMyBurials(arr.slice(0, 5));
          setMyTotal(arr.length);
          setMyVerified(verified);
          setMyPending(pending);
        },
        err => {
          console.log('[HomeUser] mine onSnapshot err', err);
        },
      );

    setLoading(false);

    return () => {
      try {
        unsubAll();
      } catch (e) {}
      try {
        unsubMine();
      } catch (e) {}
    };
  }, [navigation, user]);

  const openDetail = id => {
    if (!id) return;
    navigation.navigate('BurialDetail', {id});
  };

  const goToForm = () => navigation.navigate('UserBurialForm');
  const goToList = () => navigation.navigate('UserBurialList');
  const goToSearch = () => navigation.navigate('SearchBurial');
  const goToProfile = () => navigation.navigate('UserProfile');

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    } catch (err) {
      console.log('[HomeUser] logout err', err);
      Alert.alert('Error', 'Gagal logout');
    }
  };

  const renderRecent = ({item}) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => openDetail(item.id)}>
      <View style={{flex: 1}}>
        <Text style={styles.itemTitle}>
          {item.deceasedName || '(Nama kosong)'}
        </Text>
        <Text style={styles.itemSub}>
          {item.burialDate || '-'} • {item.createdBy ? 'oleh user' : ''}
        </Text>
        <Text style={styles.itemSmall}>
          {item.notes ? item.notes.slice(0, 80) : '-'}
        </Text>
      </View>
      <View style={{justifyContent: 'center', alignItems: 'flex-end'}}>
        <Text
          style={[
            styles.statusBadge,
            item.status === 'verified'
              ? {backgroundColor: '#2ed573'}
              : {backgroundColor: '#ffa502'},
          ]}>
          {item.status || '-'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMine = ({item}) => (
    <TouchableOpacity
      style={styles.mineCard}
      onPress={() => openDetail(item.id)}>
      <View style={{flex: 1}}>
        <Text style={styles.itemTitle}>
          {item.deceasedName || '(Nama kosong)'}
        </Text>
        <Text style={styles.itemSub}>Status: {item.status}</Text>
        <Text style={styles.itemSmall}>Tanggal: {item.burialDate || '-'}</Text>
      </View>
      <View style={{justifyContent: 'center'}}>
        <Text style={styles.viewText}>Lihat</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#1e272e" barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2ed573" />
          <Text style={{color: '#fff', marginTop: 8}}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1e272e" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 28}}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Halo, {user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.headerSubtitle}>Ringkasan data pemakaman</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Total Laporan"
            value={totalBurials}
            color="#3742fa"
          />
          <StatCard label="Entri Saya" value={myTotal} color="#2ed573" />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Terverifikasi" value={myVerified} color="#ffa502" />
          <StatCard label="Pending" value={myPending} color="#ff4757" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entri Terbaru</Text>
          {recentBurials.length === 0 ? (
            <Text style={styles.empty}>Belum ada laporan</Text>
          ) : (
            <FlatList
              data={recentBurials}
              keyExtractor={i => i.id}
              renderItem={renderRecent}
              scrollEnabled={false}
            />
          )}
          <TouchableOpacity style={styles.linkBtn} onPress={goToList}>
            <Text style={styles.linkText}>Lihat semua laporan →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entri Saya</Text>
          {myBurials.length === 0 ? (
            <Text style={styles.empty}>Kamu belum mengirimkan entri</Text>
          ) : (
            <FlatList
              data={myBurials}
              keyExtractor={i => i.id}
              renderItem={renderMine}
              scrollEnabled={false}
            />
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, {marginTop: 8}]}
            onPress={goToForm}>
            <Text style={styles.primaryBtnText}>Tambah Entri Baru</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#1e272e'},
  container: {flex: 1, backgroundColor: '#f1f2f6'},
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e272e',
  },

  header: {
    backgroundColor: '#1e272e',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
    elevation: 6,
  },
  headerTitle: {color: '#f5f6fa', fontSize: 20, fontWeight: 'bold'},
  headerSubtitle: {color: '#dcdde1', marginTop: 4},

  statsRow: {flexDirection: 'row', marginHorizontal: 16, marginTop: 12},
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 6,
    elevation: 3,
  },
  statLabel: {color: '#fff', fontSize: 13},
  statValue: {color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 6},

  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  sectionTitle: {fontSize: 15, fontWeight: 'bold', color: '#2f3542'},
  empty: {color: '#747d8c', marginTop: 8},

  itemCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    flexDirection: 'row',
    elevation: 1,
  },
  mineCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    flexDirection: 'row',
    elevation: 1,
  },

  itemTitle: {fontSize: 14, fontWeight: 'bold', color: '#2f3542'},
  itemSub: {fontSize: 12, color: '#57606f', marginTop: 4},
  itemSmall: {fontSize: 12, color: '#747d8c', marginTop: 4},

  statusBadge: {
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '700',
  },

  linkBtn: {marginTop: 8, alignItems: 'flex-end'},
  linkText: {color: '#1e90ff', fontWeight: '600'},

  primaryBtn: {
    backgroundColor: '#2ed573',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {color: '#fff', fontWeight: 'bold'},

  quickRow: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#3742fa',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickText: {color: '#fff', fontWeight: '700'},

  viewText: {color: '#1e90ff', fontWeight: '700'},
});
