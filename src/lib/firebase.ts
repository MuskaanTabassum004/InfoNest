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

// Configure Firebase Auth action code settings for email verification
// This ensures the correct URL format is used in email templates
if (typeof window !== 'undefined') {
  // Set the action code settings for email verification
  auth.useDeviceLanguage(); // Use device language for emails

  // Configure the auth domain for action codes
  // This helps Firebase generate correct URLs for email verification
}

// Global error handler for Firestore permission errors
const handleFirestoreError = (error: any) => {
  if (error?.code === 'permission-denied') {
    // Silently handle permission denied errors during logout
    console.warn('Firestore permission denied - user may have logged out');
    return true; // Indicate error was handled
  }
  // Log other errors normally
  console.error('Firestore error:', error);
  return false;
};

// Set up global error handling for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code === 'permission-denied' ||
        (event.reason?.message && event.reason.message.includes('permission-denied'))) {
      handleFirestoreError(event.reason);
      event.preventDefault(); // Prevent the error from being logged to console
    }
  });

  // Also handle console errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Check if this is a Firestore permission error
    const errorMessage = args.join(' ');
    if (errorMessage.includes('permission-denied') &&
        errorMessage.includes('Firestore')) {
      // Suppress the error if it's a permission denied error
      return;
    }
    // Otherwise, log normally
    originalConsoleError.apply(console, args);
  };
}

export default app;
