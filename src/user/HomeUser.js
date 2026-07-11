import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import auth from '@react-native-firebase/auth';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from './Home';
import UserBurialFormScreen from './UserBurialForm';
import UserBurialListScreen from './UserBurialList';
import UserInformasiScreen from './InformasiUser';
import CreateMenuScreen, {PilihDataLamaScreen} from './CreateMenu';
import PerpanjanganFormScreen from './PerpanjanganForm';
import TumpanganFormScreen from './TumpanganForm';
import ProfileScreen from './ProfileUser';
import LoginScreen from '../Login';
import RegisterScreen from '../Register';
import ForgotPasswordScreen from '../ForgotPassword';
import Icon from 'react-native-vector-icons/FontAwesome6';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Home from './Home';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const CreateStack = createNativeStackNavigator();

// Stack khusus untuk tab "Create": menu pilihan -> form terkait
function CreateStackNavigator() {
  return (
    <CreateStack.Navigator>
      <CreateStack.Screen
        name="CreateMenu"
        component={CreateMenuScreen}
        options={{title: 'Pengajuan Pemakaman'}}
      />
      <CreateStack.Screen
        name="PilihDataLama"
        component={PilihDataLamaScreen}
        options={{title: 'Pilih Data Lama'}}
      />
      <CreateStack.Screen
        name="UserBurialForm"
        component={UserBurialFormScreen}
        options={{title: 'Pendaftaran Makam Baru'}}
      />
      <CreateStack.Screen
        name="PerpanjanganForm"
        component={PerpanjanganFormScreen}
        options={{title: 'Perpanjangan Sewa'}}
      />
      <CreateStack.Screen
        name="TumpanganForm"
        component={TumpanganFormScreen}
        options={{title: 'Ijin Tumpang'}}
      />
      <CreateStack.Screen
        name="RiwayatPengajuan"
        component={UserBurialListScreen}
        options={{title: 'Riwayat Pengajuan'}}
      />
    </CreateStack.Navigator>
  );
}
function HomeUser() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTab"
        component={Tab1}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}

export function Tab1() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Create') {
            iconName = focused ? 'create' : 'create-outline';
          } else if (route.name === 'Information') {
            iconName = focused ? 'information' : 'information-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-circle-outline';
          }

          // You can return any component that you like here!
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <Tab.Screen
        name="Create"
        component={CreateStackNavigator}
        options={{headerShown: false}}
      />
      <Tab.Screen
        name="Information"
        component={UserInformasiScreen}
        options={{headerShown: false}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{headerShown: false}}
      />
    </Tab.Navigator>
  );
}

export default HomeUser;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e272e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f5f6fa',
    marginBottom: 10,
  },
  text: {
    textAlign: 'center',
    color: '#dcdde1',
    marginBottom: 4,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#ff4757',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 6,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
