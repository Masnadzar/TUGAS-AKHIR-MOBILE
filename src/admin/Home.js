import React, {useEffect, useState, useMemo} from 'react';
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

const StatCard = ({label, value, color}) => (
  <View style={[styles.statCard, {backgroundColor: color || '#333'}]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>
      {typeof value === 'number' ? value : value}
    </Text>
  </View>
);

export default function HomeAdminScreen({navigation}) {
  const [loading, setLoading] = useState(true);

  // stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalNormalUsers, setTotalNormalUsers] = useState(0);
  const [totalBurials, setTotalBurials] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // lists
  const [recentBurials, setRecentBurials] = useState([]);
  const [pendingList, setPendingList] = useState([]);

  useEffect(() => {
    let unsubUsers = () => {};
    let unsubBurials = () => {};

    const load = async () => {
      try {
        setLoading(true);

        // users snapshot (listen realtime)
        unsubUsers = firestore()
          .collection('users')
          .onSnapshot(
            snapshot => {
              const total = snapshot.size;
              let a = 0,
                u = 0;
              snapshot.forEach(doc => {
                const d = doc.data() || {};
                if (d.role === 'admin') a += 1;
                else u += 1;
              });
              setTotalUsers(total);
              setTotalAdmins(a);
              setTotalNormalUsers(u);
            },
            err => {
              console.log('[HomeAdmin] users onSnapshot err', err);
            },
          );

        // burials snapshot: all count & pending count
        unsubBurials = firestore()
          .collection('burials')
          .onSnapshot(
            snapshot => {
              setTotalBurials(snapshot.size);

              // build recent list and pending list locally (limit client-side)
              const arr = [];
              const pendingArr = [];
              snapshot.forEach(doc => {
                const d = doc.data() || {};
                arr.push({id: doc.id, ...d});
                if (d.status === 'pending') pendingArr.push({id: doc.id, ...d});
              });

              // sort arr by createdAt desc (some docs may not have createdAt)
              arr.sort((x, y) => {
                const xa = x.createdAt
                  ? x.createdAt.toMillis
                    ? x.createdAt.toMillis()
                    : new Date(x.createdAt).getTime()
                  : 0;
                const ya = y.createdAt
                  ? y.createdAt.toMillis
                    ? y.createdAt.toMillis()
                    : new Date(y.createdAt).getTime()
                  : 0;
                return ya - xa;
              });

              setRecentBurials(arr.slice(0, 5));
              setPendingList(
                pendingArr.sort((x, y) => {
                  const xa = x.createdAt
                    ? x.createdAt.toMillis
                      ? x.createdAt.toMillis()
                      : new Date(x.createdAt).getTime()
                    : 0;
                  const ya = y.createdAt
                    ? y.createdAt.toMillis
                      ? y.createdAt.toMillis()
                      : new Date(y.createdAt).getTime()
                    : 0;
                  return xa - ya; // oldest pending first
                }),
              );
              setPendingCount(pendingArr.length);
            },
            err => {
              console.log('[HomeAdmin] burials onSnapshot err', err);
            },
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

  const goToAssign = id => {
    if (!id) return Alert.alert('Error', 'ID tidak valid');
    // navigate to AdminAssign screen (pastikan terdaftar di navigator)
    navigation.navigate('Assign', {id});
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    } catch (err) {
      console.log('[HomeAdmin] logout err', err);
      Alert.alert('Error', 'Gagal logout');
    }
  };

  const renderRecentItem = ({item}) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('BurialDetail', {id: item.id})}>
      <View style={{flex: 1}}>
        <Text style={styles.itemTitle}>
          {item.deceasedName || '— (nama kosong)'}
        </Text>
        <Text style={styles.itemSub}>
          {item.burialDate || '-'} • {item.createdBy || '-'}
        </Text>
        <Text style={styles.itemSmall}>{item.notes || ''}</Text>
      </View>
      <View style={{justifyContent: 'center', alignItems: 'flex-end'}}>
        <Text style={styles.itemBadge}>{item.status || '—'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPendingItem = ({item}) => (
    <TouchableOpacity
      style={styles.pendingCard}
      onPress={() => goToAssign(item.id)}>
      <View style={{flex: 1}}>
        <Text style={styles.itemTitle}>{item.deceasedName || '(no name)'}</Text>
        <Text style={styles.itemSub}>Ahli waris: {item.heirName || '-'}</Text>
        <Text style={styles.itemSmall}>Tanggal: {item.burialDate || '-'}</Text>
      </View>
      <View style={{justifyContent: 'center'}}>
        <Text style={styles.assignText}>Verifikasi</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#1e272e" barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2ed573" />
          <Text style={{color: '#fff', marginTop: 8}}>Memuat dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1e272e" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 32}}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard Admin</Text>
          <Text style={styles.headerSubtitle}>
            Ringkasan data & verifikasi pemakaman
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Total Akun" value={totalUsers} color="#3742fa" />
          <StatCard label="Admin" value={totalAdmins} color="#2ed573" />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="User Biasa"
            value={totalNormalUsers}
            color="#ffa502"
          />
          <StatCard
            label="Total Pemakaman"
            value={totalBurials}
            color="#ff4757"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Entri Pending ({pendingCount})
          </Text>
          {pendingList.length === 0 ? (
            <Text style={styles.emptyText}>
              Tidak ada entri pending saat ini.
            </Text>
          ) : (
            <FlatList
              data={pendingList.slice(0, 6)}
              keyExtractor={i => i.id}
              renderItem={renderPendingItem}
              scrollEnabled={false}
            />
          )}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Data')}>
            <Text style={styles.linkButtonText}>Lihat semua pending →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Laporan Terbaru</Text>
          {recentBurials.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada laporan.</Text>
          ) : (
            <FlatList
              data={recentBurials}
              keyExtractor={i => i.id}
              renderItem={renderRecentItem}
              scrollEnabled={false}
            />
          )}
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
  headerSubtitle: {color: '#dcdde1', fontSize: 13, marginTop: 4},

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
  emptyText: {color: '#747d8c', marginTop: 8},

  pendingCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: 'row',
    elevation: 1,
  },
  itemTitle: {fontSize: 14, fontWeight: 'bold', color: '#2f3542'},
  itemSub: {fontSize: 12, color: '#57606f', marginTop: 4},
  itemSmall: {fontSize: 12, color: '#747d8c', marginTop: 4},
  itemBadge: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#1e272e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  linkButton: {marginTop: 10, alignItems: 'flex-end'},
  linkButtonText: {color: '#1e90ff', fontWeight: '600'},

  footerActions: {
    marginTop: 18,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 3,
  },
  footerButtonText: {color: '#f5f6fa', fontWeight: 'bold'},

  assignText: {color: '#1e90ff', fontWeight: '700'},
});
