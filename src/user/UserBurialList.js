import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function UserBurialListScreen({navigation}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const uid = auth().currentUser?.uid;

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
          const arr = [];
          qs.forEach(doc => arr.push({id: doc.id, ...doc.data()}));
          setItems(arr);
          setLoading(false);
        },
        err => {
          console.log('[UserBurialList] err', err);
          setLoading(false);
        },
      );

    return () => unsub();
  }, [uid, navigation]);

  const handleDelete = (id, status) => {
    if (status !== 'pending') {
      Alert.alert(
        'Tidak bisa',
        'Hanya entri berstatus pending yang bisa dihapus.',
      );
      return;
    }
    Alert.alert('Hapus', 'Yakin ingin menghapus entri ini?', [
      {text: 'Batal', style: 'cancel'},
      {
        text: 'Hapus',
        onPress: async () => {
          try {
            await firestore().collection('burials').doc(id).delete();
          } catch (err) {
            console.log(err);
            Alert.alert('Error', 'Gagal menghapus');
          }
        },
      },
    ]);
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BurialDetail', {id: item.id})}>
      <Text style={styles.title}>{item.deceasedName}</Text>
      <Text style={styles.meta}>
        Tanggal: {item.burialDate} • Status: {item.status}
      </Text>
      <Text style={styles.metaSmall}>Ahli waris: {item.heirName}</Text>

      <View style={{flexDirection: 'row', marginTop: 8}}>
        {item.status === 'pending' ? (
          <>
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() =>
                navigation.navigate('BurialDetail', {id: item.id, edit: true})
              }>
              <Text style={styles.smallBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, {backgroundColor: '#ff6b6b'}]}
              onPress={() => handleDelete(item.id, item.status)}>
              <Text style={styles.smallBtnText}>Hapus</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{color: '#555'}}>
            Lokasi: {item.assignedBlock || '-'} /{' '}
            {item.assignedGraveNumber || '-'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={{flex: 1, backgroundColor: '#f1f2f6', padding: 12}}>
      <TouchableOpacity
        style={{
          marginBottom: 10,
          backgroundColor: '#2ed573',
          padding: 12,
          borderRadius: 8,
        }}
        onPress={() => navigation.navigate('UserBurialForm')}>
        <Text style={{color: '#fff', textAlign: 'center', fontWeight: 'bold'}}>
          Tambah Entri Baru
        </Text>
      </TouchableOpacity>

      <FlatList data={items} keyExtractor={i => i.id} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  title: {fontSize: 16, fontWeight: 'bold'},
  meta: {color: '#666', marginTop: 4},
  metaSmall: {color: '#444', marginTop: 2},
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1e90ff',
    borderRadius: 6,
    marginRight: 8,
  },
  smallBtnText: {color: '#fff'},
});
