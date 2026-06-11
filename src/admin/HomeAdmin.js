// src/screens/HomeAdminScreen.js
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import auth from '@react-native-firebase/auth';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from './Home';
import DataScreen from './Data';
import InformasiScreen from './Informasi';
import ProfileScreen from './Profile';
import LoginScreen from '../Login';
import RegisterScreen from '../Register';
import ForgotPasswordScreen from '../ForgotPassword';
import Icon from 'react-native-vector-icons/FontAwesome6';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Home from './Home';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
function HomeAdmin() {
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

const logout = async () => {
  await auth().signOut();
  navigation.reset({
    index: 0,
    routes: [{name: 'Login'}],
  });
};

export function Tab1() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Data') {
            iconName = focused ? 'reader' : 'reader-outline';
          } else if (route.name === 'Informasi') {
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
        name="Data"
        component={DataScreen}
        options={{headerShown: false}}
      />
      <Tab.Screen
        name="Informasi"
        component={InformasiScreen}
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

export default HomeAdmin;

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
