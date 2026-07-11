// In App.js in a new project

import * as React from 'react';
import {View, Text} from 'react-native';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigationContainer} from '@react-navigation/native';
import HomeScreen from './src/admin/Home';
import DataScreen from './src/admin/Data';
import InformasiScreen from './src/admin/Informasi';
import ProfileScreen from './src/admin/Profile';
import ProfileUserScreen from './src/user/ProfileUser';
import SplashScreen from './src/Splash';
import LoginScreen from './src/Login';
import RegisterScreen from './src/Register';
import ForgotPasswordScreen from './src/ForgotPassword';
import HomeAdminScreen from './src/admin/HomeAdmin';
import HomeUserScreen from './src/user/HomeUser';
import AssignScreen from './src/admin/Assign';
import AssignExtraScreen from './src/admin/AssignExtra';
import UserBurialListScreen from './src/user/UserBurialList';
import UserBurialFormScreen from './src/user/UserBurialForm';
import BurialDetailScreen from './src/user/BurialDetail';
import InformasiUserScreen from './src/user/InformasiUser';
import Icon from 'react-native-vector-icons/FontAwesome6';
import Ionicons from 'react-native-vector-icons/Ionicons';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTab"
          component={SplashScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Assign" component={AssignScreen} />
        <Stack.Screen name="AssignExtra" component={AssignExtraScreen} />
        <Stack.Screen name="Data" component={DataScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="HomeAdmin" component={HomeAdminScreen} />
        <Stack.Screen name="Informasi" component={InformasiScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="BurialDetail" component={BurialDetailScreen} />
        <Stack.Screen name="HomeUser" component={HomeUserScreen} />
        <Stack.Screen name="UserBurialForm" component={UserBurialFormScreen} />
        <Stack.Screen name="InformasiUser" component={InformasiUserScreen} />
        <Stack.Screen name="UserBurialList" component={UserBurialListScreen} />
        <Stack.Screen name="ProfileUser" component={ProfileUserScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
