import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBJK0TNs_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "interlink-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "interlink-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "interlink-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators if running locally
const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' ||
                     window.location.hostname === 'localhost';

if (USE_EMULATOR && typeof window !== 'undefined') {
  // Check if we haven't already connected to avoid errors
  if (!window._firebase_emulator_connected) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);

      window._firebase_emulator_connected = true;
      console.log('🔥 Connected to Firebase emulators');
    } catch (error) {
      console.warn('Failed to connect to Firebase emulators:', error);
    }
  }
}

// Declare the global variable type
declare global {
  interface Window {
    _firebase_emulator_connected?: boolean;
  }
}

export default app;