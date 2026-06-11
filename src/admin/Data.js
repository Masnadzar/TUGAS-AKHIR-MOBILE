import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function Data({navigation}) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ambil entri pending
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

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Assign', {id: item.id})}>
      <Text style={styles.title}>{item.deceasedName}</Text>
      <Text style={styles.meta}>Ahli waris: {item.heirName}</Text>
      <Text style={styles.meta}>Tanggal: {item.burialDate}</Text>
      <Text style={styles.metaSmall}>Pengirim: {item.createdBy}</Text>
    </TouchableOpacity>
  );

  if (loading)
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator />
      </View>
    );

  return (
    <View style={{flex: 1, padding: 12, backgroundColor: '#f1f2f6'}}>
      <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 10}}>
        Verifikasi Entri (Pending)
      </Text>
      <FlatList
        data={pending}
        keyExtractor={i => i.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
  },
  title: {fontWeight: 'bold', fontSize: 15},
  meta: {color: '#555', marginTop: 4},
  metaSmall: {color: '#777', marginTop: 4, fontSize: 12},
});
