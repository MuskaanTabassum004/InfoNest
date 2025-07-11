// ✅ Updated auth.ts with email verification and Google sign-in support
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, firestore } from './firebase';

export type UserRole = 'user' | 'infowriter' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  requestedWriterAccess?: boolean;
}

export const signUp = async (email: string, password: string, displayName?: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // ✅ Send email verification
  await sendEmailVerification(result.user);

  const userProfile: UserProfile = {
    uid: result.user.uid,
    email: result.user.email!,
    role: 'user',
    displayName: displayName || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    requestedWriterAccess: false
  };

  await setDoc(doc(firestore, 'users', result.user.uid), userProfile);
  return result;
};

export const signIn = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  
  // Check if email is verified
  if (!result.user.emailVerified) {
    throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
  }
  
  return result;
};

export const signOut = async () => {
  return await firebaseSignOut(auth);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(firestore, 'users', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate() ?? new Date()
    } as UserProfile;
  }

  return null;
};

export const updateUserRole = async (uid: string, role: UserRole) => {
  const userRef = doc(firestore, 'users', uid);
  await updateDoc(userRef, {
    role,
    updatedAt: new Date()
  });
};

export const requestWriterAccess = async (uid: string) => {
  const userRef = doc(firestore, 'users', uid);
  await updateDoc(userRef, {
    requestedWriterAccess: true,
    updatedAt: new Date()
  });
};

export const getPendingWriterRequests = async () => {
  const q = query(
    collection(firestore, 'users'),
    where('requestedWriterAccess', '==', true),
    where('role', '==', 'user')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
    updatedAt: doc.data().updatedAt?.toDate() ?? new Date()
  })) as UserProfile[];
};

export const approveWriterRequest = async (uid: string) => {
  const userRef = doc(firestore, 'users', uid);
  await updateDoc(userRef, {
    role: 'infowriter',
    requestedWriterAccess: false,
    updatedAt: new Date()
  });
};

export const denyWriterRequest = async (uid: string) => {
  const userRef = doc(firestore, 'users', uid);
  await updateDoc(userRef, {
    requestedWriterAccess: false,
    updatedAt: new Date()
  });
};

export const getInfoWriters = async () => {
  const q = query(
    collection(firebase, 'users'),
    where('role', 'in', ['infowriter', 'admin'])
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
    updatedAt: doc.data().updatedAt?.toDate() ?? new Date()
  })) as UserProfile[];
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ✅ Google Sign-In
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  // If new user, create profile
  const docRef = doc(firestore, 'users', result.user.uid);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    const newUserProfile: UserProfile = {
      uid: result.user.uid,
      email: result.user.email!,
      role: 'user',
      displayName: result.user.displayName || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      requestedWriterAccess: false
    };
    await setDoc(docRef, newUserProfile);
  }

  return result;
};
