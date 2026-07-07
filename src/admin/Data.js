// src/admin/Data.js
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function Data({navigation}) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firestore()
      .collection('burials')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        qs => {
          const arr = [];
          qs.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
          setPending(arr);
          setLoading(false);
        },
        err => {
          console.log(err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  // ── Komponen badge dokumen kecil ──────────────────────────────────
  // Tampilkan thumbnail mini dari setiap dokumen yang ada
  const MiniDoc = ({url, label}) => (
    <View style={styles.miniDocWrap}>
      {url ? (
        <Image
          source={{uri: url}}
          style={styles.miniDocImg}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.miniDocEmpty}>
          <Text style={styles.miniDocEmptyTxt}>-</Text>
        </View>
      )}
      <Text style={styles.miniDocLabel}>{label}</Text>
    </View>
  );

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Assign', {id: item.id})}
      activeOpacity={0.85}>
      {/* ── Header card: nama + status ── */}
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.title}>{item.deceasedName || '-'}</Text>
          <Text style={styles.meta}>Ahli Waris: {item.heirName || '-'}</Text>
          <Text style={styles.meta}>
            Tgl Pemakaman: {item.burialDate || '-'}
          </Text>
          <Text style={styles.metaSmall}>
            Hubungan: {item.hubungan || '-'} • {item.noTelepon || '-'}
          </Text>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeTxt}>PENDING</Text>
        </View>
      </View>

      {/* ── Thumbnail dokumen ── */}
      <View style={styles.docRow}>
        <MiniDoc url={item.dokKTP} label="KTP" />
        <MiniDoc url={item.dokKK} label="KK" />
        <MiniDoc url={item.dokSuratKematian} label="Srt Kematian" />
        <MiniDoc url={item.dokSuratMedis} label="Srt Medis" />
      </View>

      <Text style={styles.tapHint}>Ketuk untuk verifikasi lengkap →</Text>
    </TouchableOpacity>
  );

  if (loading)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );

  return (
    <View style={{flex: 1, backgroundColor: '#f1f2f6'}}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Verifikasi Data Pemakaman</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeTxt}>{pending.length} Pending</Text>
        </View>
      </View>

      {pending.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{fontSize: 40}}>✅</Text>
          <Text style={{color: '#888', marginTop: 8, fontSize: 15}}>
            Tidak ada entri pending
          </Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{padding: 14, paddingBottom: 30}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  pageTitle: {fontSize: 17, fontWeight: 'bold', color: '#1a3c5e'},
  countBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countBadgeTxt: {color: '#856404', fontWeight: 'bold', fontSize: 12},

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 10,
  },
  title: {fontWeight: 'bold', fontSize: 15, color: '#1a3c5e'},
  meta: {color: '#555', marginTop: 3, fontSize: 13},
  metaSmall: {color: '#888', marginTop: 3, fontSize: 12},
  pendingBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  pendingBadgeTxt: {color: '#856404', fontSize: 10, fontWeight: 'bold'},

  // ── Thumbnail row ──
  docRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  miniDocWrap: {flex: 1, alignItems: 'center'},
  miniDocImg: {
    width: '100%',
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dde',
  },
  miniDocEmpty: {
    width: '100%',
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  miniDocEmptyTxt: {color: '#ccc', fontSize: 18},
  miniDocLabel: {
    fontSize: 9,
    color: '#888',
    marginTop: 3,
    textAlign: 'center',
    fontWeight: '600',
  },

  tapHint: {
    textAlign: 'right',
    color: '#1e90ff',
    fontSize: 11,
    paddingRight: 14,
    paddingBottom: 10,
  },
});
