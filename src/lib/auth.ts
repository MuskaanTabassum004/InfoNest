import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
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
import { auth, db } from './firebase';

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
  
  // Create user profile in Firestore
  const userProfile: UserProfile = {
    uid: result.user.uid,
    email: result.user.email!,
    role: 'user',
    displayName: displayName || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    requestedWriterAccess: false
  };

  await setDoc(doc(db, 'users', result.user.uid), userProfile);
  return result;
};

export const signIn = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signOut = async () => {
  return await firebaseSignOut(auth);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
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
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role,
    updatedAt: new Date()
  });
};

export const requestWriterAccess = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    requestedWriterAccess: true,
    updatedAt: new Date()
  });
};

export const getPendingWriterRequests = async () => {
  const q = query(
    collection(db, 'users'),
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
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: 'infowriter',
    requestedWriterAccess: false,
    updatedAt: new Date()
  });
};

export const denyWriterRequest = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    requestedWriterAccess: false,
    updatedAt: new Date()
  });
};

export const getInfoWriters = async () => {
  const q = query(
    collection(db, 'users'),
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