// useAuth.ts
import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'infowriter' | 'admin';
  emailVerified: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    const currentUser = auth.currentUser;
    const profileRef = doc(db, 'users', currentUser.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      setUserProfile({
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || data.displayName || '',
        role: data.role || 'user',
        emailVerified: currentUser.emailVerified,
      });
    }
  };
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await firebaseUser.reload();
          const profileRef = doc(db, 'users', firebaseUser.uid);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || data.displayName || '',
              role: data.role || 'user',
              emailVerified: firebaseUser.emailVerified,
            });
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    userProfile,
    isAuthenticated: !!user,
    emailVerified: user?.emailVerified || false,
    isAdmin: userProfile?.role === 'admin',
    isInfoWriter: userProfile?.role === 'infowriter',
    isUser: userProfile?.role === 'user',
    loading,
    refreshProfile,
  };
};