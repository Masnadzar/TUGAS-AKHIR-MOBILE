// src/user/CreateMenu.js
// Menu pilihan di tab "Create": Makam Baru / Perpanjangan Sewa / Ijin Tumpang
import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CreateMenuScreen({navigation}) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [myBurials, setMyBurials] = useState([]); // burial milik user ini

  const loadMyBurials = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      // PENTING: jangan gabung where() + orderBy() field berbeda di query yang sama,
      // karena butuh composite index di Firestore dan kalau index belum dibuat,
      // query akan gagal (dan sebelumnya error ini "ditelan" sehingga kelihatan
      // seperti "tidak ada data" padahal datanya ada). Solusi: ambil semua data
      // milik user tanpa orderBy, lalu urutkan manual di JS.
      const snap = await firestore()
        .collection('burials')
        .where('createdBy', '==', user.uid)
        .get();

      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));

      // urutkan manual berdasarkan createdAt (terbaru dulu), aman untuk
      // Timestamp Firestore maupun jika field belum ada
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });

      setMyBurials(list);
    } catch (e) {
      console.log('[CreateMenu] load error:', e);
      setErrorMsg(
        e?.message || 'Gagal memuat data pemakaman Anda. Silakan coba lagi.',
      );
      setMyBurials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMyBurials();
    }, [loadMyBurials]),
  );

  // Saat pilih Perpanjangan / Tumpangan, jika user sudah punya data pemakaman
  // sebelumnya, kirim ID-nya saja (bukan snapshot statis) supaya form terkait
  // selalu mengambil data TERBARU langsung dari Firestore (poin: harus ter-update).
  const goWithLinkedData = target => {
    if (myBurials.length === 0) {
      navigation.navigate(target, {linkedBurialId: null});
      return;
    }
    if (myBurials.length === 1) {
      navigation.navigate(target, {linkedBurialId: myBurials[0].id});
      return;
    }
    navigation.navigate('PilihDataLama', {
      target,
      burials: myBurials,
    });
  };

  const MenuCard = ({icon, title, desc, onPress, color}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={[styles.iconWrap, {backgroundColor: color}]}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color="#c1c7d0" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{marginTop: 30}} color="#2f6fed" />
      ) : (
        <>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTxt}>{errorMsg}</Text>
              <TouchableOpacity onPress={loadMyBurials} style={styles.retryBtn}>
                <Text style={styles.retryTxt}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          )}

          <MenuCard
            icon="add-circle"
            title="Makam Baru"
            desc="Pendaftaran pemakaman baru dari awal"
            color="#2f6fed"
            onPress={() => navigation.navigate('UserBurialForm')}
          />
          <MenuCard
            icon="refresh-circle"
            title="Perpanjangan Sewa"
            desc="Perpanjang sewa makam yang sudah terdaftar"
            color="#f59f00"
            onPress={() => goWithLinkedData('PerpanjanganForm')}
          />
          <MenuCard
            icon="people-circle"
            title="Ijin Tumpang"
            desc="Pendaftaran pemakaman tumpang di makam yang sudah ada"
            color="#12b886"
            onPress={() => goWithLinkedData('TumpanganForm')}
          />

          {!errorMsg && myBurials.length === 0 && (
            <View style={styles.hintBox}>
              <Text style={styles.hintTxt}>
                Anda belum memiliki data pemakaman terdaftar, jadi
                Perpanjangan/Tumpangan akan meminta Anda mengisi data dari awal.
              </Text>
            </View>
          )}

          {!errorMsg && myBurials.length > 0 && (
            <View style={styles.hintBox}>
              <Text style={styles.hintTxt}>
                Ditemukan {myBurials.length} data pemakaman milik Anda yang bisa
                dihubungkan ke Perpanjangan/Tumpangan.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// Layar bantu ketika user punya lebih dari 1 data pemakaman lama
export function PilihDataLamaScreen({route, navigation}) {
  const {target, burials} = route.params;
  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.header}>Pilih Data Pemakaman</Text>
        <Text style={styles.subheader}>
          Data mana yang ingin dihubungkan ke pengajuan ini?
        </Text>
      </View>
      <FlatList
        data={burials}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.listItem}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate(target, {linkedBurialId: item.id})
            }>
            <View style={{flex: 1}}>
              <Text style={styles.listName}>{item.deceasedName}</Text>
              <Text style={styles.listSub}>
                Blok {item.assignedBlock || '-'} / No.{' '}
                {item.assignedGraveNumber || '-'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#c1c7d0" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f4f6fb', padding: 16},
  headerBlock: {marginTop: 8, marginBottom: 20},
  header: {fontSize: 21, fontWeight: '700', color: '#1b1f27'},
  subheader: {color: '#6b7280', fontSize: 13, marginTop: 4},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {fontSize: 14.5, fontWeight: '700', color: '#1b1f27'},
  cardDesc: {fontSize: 12, color: '#8a92a2', marginTop: 2},
  hintBox: {
    marginTop: 6,
    backgroundColor: '#eef2fb',
    borderRadius: 10,
    padding: 12,
  },
  hintTxt: {color: '#5b6472', fontSize: 12, lineHeight: 17},
  errorBox: {
    backgroundColor: '#fdedec',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorTxt: {color: '#c0392b', fontSize: 12, marginBottom: 8},
  retryBtn: {
    backgroundColor: '#e03131',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  retryTxt: {color: '#fff', fontWeight: '700', fontSize: 12},
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  listName: {fontWeight: '700', color: '#1b1f27', fontSize: 14},
  listSub: {color: '#8a92a2', fontSize: 12, marginTop: 2},
});
