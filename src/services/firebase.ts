import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel, type Firestore } from 'firebase/firestore';

// Silence Firestore internal log warnings completely to prevent noisy connection error popups
try {
  setLogLevel('silent');
} catch {
  // ignore
}

export const firebaseConfig = {
  apiKey: "AIzaSyDCrjn1VPo692LRlwiAKbhStyCKFiPKlms",
  authDomain: "hr-new-fcfe9.firebaseapp.com",
  projectId: "hr-new-fcfe9",
  storageBucket: "hr-new-fcfe9.firebasestorage.app",
  messagingSenderId: "896908152784",
  appId: "1:896908152784:web:ee63c9d8643d055e0873d5",
  measurementId: "G-23EYTDDN2X"
};

// Cloud Firestore is disabled on project hr-new-fcfe9.
// The app relies on the robust full-stack Express server (SSE stream, REST API, db.json persistence, and BroadcastChannel).
export const IS_FIRESTORE_ENABLED = false;

// Initialize or reuse Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Target standard firestore instance only if enabled
export const db: Firestore | null = IS_FIRESTORE_ENABLED ? getFirestore(app) : null;


