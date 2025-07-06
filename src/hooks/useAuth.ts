import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getUserProfile, UserProfile } from '../lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      console.log('🔍 Auth state changed:', user ? `User logged in: ${user.email}` : 'User logged out');
      setUser(user);
      
      if (user) {
        try {
          console.log('📋 Fetching user profile for UID:', user.uid);
          const profile = await getUserProfile(user.uid);
          console.log('📄 Raw profile data from Firestore:', profile);
          
          if (profile) {
            console.log('✅ Profile found:');
            console.log('  - Email:', profile.email);
            console.log('  - Role:', profile.role);
            console.log('  - Display Name:', profile.displayName);
            console.log('  - UID:', profile.uid);
          } else {
            console.log('❌ No profile found in Firestore for this user');
          }
          
          setUserProfile(profile);
        } catch (error) {
          console.error('🚨 Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing profile for user:', user.uid);
      const profile = await getUserProfile(user.uid);
      console.log('🔄 Refreshed profile data:', profile);
      setUserProfile(profile);
    }
  };

  // Log the computed role-based flags
  const isAdmin = userProfile?.role === 'admin';
  const isInfoWriter = userProfile?.role === 'infowriter' || userProfile?.role === 'admin';
  const isUser = userProfile?.role === 'user';

  console.log('🎭 Role-based flags:');
  console.log('  - isAdmin:', isAdmin);
  console.log('  - isInfoWriter:', isInfoWriter);
  console.log('  - isUser:', isUser);
  console.log('  - Current role:', userProfile?.role);

  return {
    user,
    userProfile,
    loading,
    refreshProfile,
    isAuthenticated: !!user,
    isAdmin,
    isInfoWriter,
    isUser
  };
};