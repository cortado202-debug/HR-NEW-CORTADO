import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDCrjn1VPo692LRlwiAKbhStyCKFiPKlms",
  authDomain: "hr-new-fcfe9.firebaseapp.com",
  projectId: "hr-new-fcfe9",
  storageBucket: "hr-new-fcfe9.firebasestorage.app",
  messagingSenderId: "896908152784",
  appId: "1:896908152784:web:ee63c9d8643d055e0873d5",
  measurementId: "G-23EYTDDN2X"
};

// Initialize or reuse Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Target standard firestore instance
export const db = getFirestore(app);

