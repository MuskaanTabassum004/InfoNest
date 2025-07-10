import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getUserProfile, UserProfile } from '../lib/auth';
import { auth } from '../lib/firebase'; // Make sure you import your firebase config

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      console.log('🔍 Auth state changed:', user ? `User logged in: ${user.email}` : 'User logged out');
      setUser(user);

      if (user) {
        await user.reload(); // ✅ Ensure we get updated email verification status
        const refreshedUser = auth.currentUser;

        if (refreshedUser) {
          setEmailVerified(refreshedUser.emailVerified);
          console.log('📩 Email Verified:', refreshedUser.emailVerified);
        }

        try {
          console.log('📋 Fetching user profile for UID:', user.uid);
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('🚨 Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
        setEmailVerified(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing Firebase user and Firestore profile');

      await user.reload(); // 🔄 Refresh email verification status
      const refreshedUser = auth.currentUser;
      if (refreshedUser) {
        setEmailVerified(refreshedUser.emailVerified);
        console.log('📩 Refreshed emailVerified:', refreshedUser.emailVerified);
      }

      const profile = await getUserProfile(user.uid);
      console.log('📄 Refreshed Firestore profile:', profile);
      setUserProfile(profile);
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const isInfoWriter = userProfile?.role === 'infowriter' || userProfile?.role === 'admin';
  const isUser = userProfile?.role === 'user';

  return {
    user,
    userProfile,
    loading,
    refreshProfile,
    isAuthenticated: !!user,
    isAdmin,
    isInfoWriter,
    isUser,
    emailVerified,        // ✅ New: Track if user has verified email
  };
};
