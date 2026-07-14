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

// ── Konfigurasi 3 kategori pengajuan ──────────────────────────────
const CATEGORIES = [
  {key: 'burials', label: 'Makam Baru', color: '#1e90ff', target: 'Assign'},
  {
    key: 'perpanjangan',
    label: 'Perpanjangan',
    color: '#ff9f1a',
    target: 'AssignExtra',
  },
  {
    key: 'tumpangan',
    label: 'Ijin Tumpang',
    color: '#2ed573',
    target: 'AssignExtra',
  },
];

export default function Data({navigation}) {
  const [activeTab, setActiveTab] = useState('burials');
  const [pending, setPending] = useState({
    burials: [],
    perpanjangan: [],
    tumpangan: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dengarkan 3 collection sekaligus secara realtime. Query hanya pakai
    // where('status','==','pending') TANPA orderBy, supaya tidak butuh
    // composite index (lalu diurutkan manual di JS). Ini konsisten dengan
    // perbaikan yang sudah diterapkan di CreateMenu.js sisi user.
    const unsubs = CATEGORIES.map(cat =>
      firestore()
        .collection(cat.key)
        .where('status', '==', 'pending')
        .onSnapshot(
          qs => {
            const arr = [];
            qs.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
            arr.sort((a, b) => {
              const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
              const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
              return ta - tb; // terlama dulu, sama seperti sebelumnya (asc)
            });
            setPending(prev => ({...prev, [cat.key]: arr}));
            setLoading(false);
          },
          err => {
            console.log(`[Data] ${cat.key} error:`, err);
            setLoading(false);
          },
        ),
    );
    return () => unsubs.forEach(u => u());
  }, []);

  const activeCat = CATEGORIES.find(c => c.key === activeTab);
  const activeList = pending[activeTab] || [];

  // ── Komponen badge dokumen kecil ──────────────────────────────────
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

  // ── Dokumen yang ditampilkan berbeda per kategori ─────────────────
  const renderDocRow = item => {
    if (activeTab === 'burials') {
      return (
        <View style={styles.docRow}>
          <MiniDoc url={item.dokKTP} label="KTP Waris" />
          <MiniDoc url={item.dokKK} label="KK Waris" />
          <MiniDoc url={item.dokKTPJenazah} label="KTP Jnz" />
          <MiniDoc url={item.dokKKJenazah} label="KK Jnz" />
        </View>
      );
    }
    if (activeTab === 'perpanjangan') {
      return (
        <View style={styles.docRow}>
          <MiniDoc url={item.dokIPTM} label="IPTM" />
          <MiniDoc url={item.dokKTPWaris} label="KTP Waris" />
        </View>
      );
    }
    // tumpangan
    return (
      <View style={styles.docRow}>
        <MiniDoc url={item.dokKTP} label="KTP Waris" />
        <MiniDoc url={item.dokKK} label="KK Waris" />
        <MiniDoc url={item.dokKTPJenazah} label="KTP Jnz" />
        <MiniDoc url={item.dokKKJenazah} label="KK Jnz" />
        <MiniDoc url={item.dokIPTMLama} label="IPTM Lama" />
      </View>
    );
  };

  const renderMeta = item => {
    if (activeTab === 'burials') {
      return (
        <>
          <Text style={styles.meta}>Ahli Waris: {item.heirName || '-'}</Text>
          <Text style={styles.meta}>
            Tgl Pemakaman: {item.burialDate || '-'}
          </Text>
          <Text style={styles.metaSmall}>
            Hubungan: {item.hubungan || '-'} • {item.noTelepon || '-'}
          </Text>
        </>
      );
    }
    if (activeTab === 'perpanjangan') {
      return (
        <>
          <Text style={styles.meta}>Ahli Waris: {item.heirName || '-'}</Text>
          <Text style={styles.meta}>
            Blok Lama: {item.assignedBlock || '-'} / No.{' '}
            {item.assignedGraveNumber || '-'}
          </Text>
          <Text style={styles.metaSmall}>{item.noTelepon || '-'}</Text>
        </>
      );
    }
    return (
      <>
        <Text style={styles.meta}>Ahli Waris: {item.heirName || '-'}</Text>
        <Text style={styles.meta}>
          Tumpang di Blok: {item.assignedBlockLama || '-'} / No.{' '}
          {item.assignedGraveNumberLama || '-'}
        </Text>
        <Text style={styles.metaSmall}>{item.noTelepon || '-'}</Text>
      </>
    );
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate(
          activeCat.target,
          activeCat.target === 'AssignExtra'
            ? {id: item.id, collection: activeTab}
            : {id: item.id},
        )
      }
      activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.title}>{item.deceasedName || '-'}</Text>
          {renderMeta(item)}
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeTxt}>PENDING</Text>
        </View>
      </View>

      {renderDocRow(item)}

      <Text style={[styles.tapHint, {color: activeCat.color}]}>
        Ketuk untuk verifikasi lengkap →
      </Text>
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
        <Text style={styles.pageTitle}>Verifikasi Pengajuan</Text>
      </View>

      {/* ── Tab Kategori ── */}
      <View style={styles.tabRow}>
        {CATEGORIES.map(cat => {
          const count = pending[cat.key]?.length || 0;
          const active = activeTab === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.tabBtn,
                active && {backgroundColor: cat.color, borderColor: cat.color},
              ]}
              onPress={() => setActiveTab(cat.key)}>
              <Text style={[styles.tabTxt, active && {color: '#fff'}]}>
                {cat.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    active && {backgroundColor: '#fff'},
                  ]}>
                  <Text
                    style={[styles.tabBadgeTxt, active && {color: cat.color}]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeList.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{fontSize: 40}}>✅</Text>
          <Text style={{color: '#888', marginTop: 8, fontSize: 15}}>
            Tidak ada entri pending di kategori ini
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeList}
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

  // ── Tab kategori ──
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  tabTxt: {fontSize: 12, fontWeight: '600', color: '#555'},
  tabBadge: {
    marginLeft: 6,
    backgroundColor: '#eee',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeTxt: {fontSize: 10, fontWeight: 'bold', color: '#555'},

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
    fontSize: 11,
    paddingRight: 14,
    paddingBottom: 10,
  },
});
