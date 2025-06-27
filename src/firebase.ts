import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4S0-yR2eCbSrjaj1DD0oTwAH31nCXJ4A",
  authDomain: "attendance-manager-9fd89.firebaseapp.com",
  projectId: "attendance-manager-9fd89",
  storageBucket: "attendance-manager-9fd89.firebasestorage.app",
  messagingSenderId: "282325629375",
  appId: "1:282325629375:web:39d1b7951674874242090a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app); 