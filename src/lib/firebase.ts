import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBktW6-GVYs7_Qqskwj1I_RO0KBsYiSGtU",
  authDomain: "infonest-m0707.firebaseapp.com",
  projectId: "infonest-m0707",
  storageBucket: "infonest-m0707.firebasestorage.app",
  messagingSenderId: "351328466797",
  appId: "1:351328466797:web:e4295d17db2451128b8c64",
  measurementId: "G-DYCBMWR5EG",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const firestore = getFirestore(app); // ✅ Exported as 'firestore'
export const storage = getStorage(app); // ✅ Exported as 'storage'

// Global error handler for Firestore permission errors
const handleFirestoreError = (error: any) => {
  if (error?.code === 'permission-denied') {
    // Silently handle permission denied errors during logout
    console.warn('Firestore permission denied - user may have logged out');
    return;
  }
  // Log other errors normally
  console.error('Firestore error:', error);
};

// Set up global error handling for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code === 'permission-denied') {
      handleFirestoreError(event.reason);
      event.preventDefault(); // Prevent the error from being logged to console
    }
  });
}

export default app;
