import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  TextInput,
  StatusBar,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';

const ForgotPassword = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function lupaPassword() {
    auth()
      .sendPasswordResetEmail(email)
      .then(() => {
        console.log('Password berhasil di reset');
      })
      .catch(error => {
        if (error.code === 'auth/invalid-email') {
          console.log('That email address is invalid!');
          console.log('email salah');
        }

        console.error(error);
      });
  }

  return (
    <ScrollView style={{backgroundColor: '#f7f6fd'}}>
      <View style={{flex: 1, backgroundColor: '#f7f6fd'}}>
        <StatusBar backgroundColor={'#f7f6fd'} barStyle="dark-content" />
        <View style={{marginHorizontal: 40, marginTop: 100}}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              textAlign: 'center',
              color: '#373248',
            }}>
            Lupa Password
          </Text>
          <Text
            style={{textAlign: 'center', marginBottom: 20, color: '#868293'}}>
            Masukkan Email untuk reset password
          </Text>
          <TextInput
            value={email}
            onChangeText={text => setEmail(text)}
            style={{
              backgroundColor: '#ffffff',
              elevation: 2,
              borderRadius: 6,
              paddingLeft: 10,
            }}
            placeholder="Masukkan Email Anda"
            keyboardType="email-address"
          />

          <TouchableOpacity
            onPress={() => lupaPassword()}
            style={{
              backgroundColor: '#303030',
              paddingVertical: 14,
              borderRadius: 6,
              marginTop: 10,
              elevation: 2,
            }}>
            <Text
              style={{
                color: '#ffffff',
                textAlign: 'center',
                fontWeight: 'bold',
              }}>
              Lupa Password
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
export default ForgotPassword;
const styles = StyleSheet.create({});
