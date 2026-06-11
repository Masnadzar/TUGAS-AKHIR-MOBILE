import {firebase} from '@react-native-firebase/app';

firebase
  .app()
  .then(() => console.log('Firebase berhasil terhubung!'))
  .catch(err => console.log(err));
