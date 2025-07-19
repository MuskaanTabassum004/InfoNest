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
export default app;
