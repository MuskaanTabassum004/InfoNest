import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { UserProfile } from '../lib/auth';

interface ProfileContextType {
  profiles: Map<string, UserProfile>;
  getProfile: (uid: string) => UserProfile | null;
  subscribeToProfile: (uid: string) => void;
  unsubscribeFromProfile: (uid: string) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [subscriptions, setSubscriptions] = useState<Map<string, () => void>>(new Map());

  const getProfile = (uid: string): UserProfile | null => {
    return profiles.get(uid) || null;
  };

  const subscribeToProfile = (uid: string) => {
    // Don't create duplicate subscriptions
    if (subscriptions.has(uid)) {
      return;
    }

    console.log(`📡 Subscribing to profile updates for user: ${uid}`);

    const userRef = doc(firestore, 'users', uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const profile: UserProfile = {
          uid: uid,
          email: data.email || '',
          displayName: data.displayName || '',
          role: data.role || 'user',
          emailVerified: data.emailVerified || false,
          profilePicture: data.profilePicture || '',
          bio: data.bio || '',
          socialLinks: data.socialLinks || {},
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          requestedWriterAccess: data.requestedWriterAccess || false,
        };

        setProfiles(prev => {
          const newProfiles = new Map(prev);
          newProfiles.set(uid, profile);
          return newProfiles;
        });

        console.log(`📡 Profile updated for user: ${uid}`, profile.displayName);
      } else {
        // Remove profile if document doesn't exist
        setProfiles(prev => {
          const newProfiles = new Map(prev);
          newProfiles.delete(uid);
          return newProfiles;
        });
      }
    }, (error) => {
      console.error(`Error subscribing to profile ${uid}:`, error);
    });

    setSubscriptions(prev => {
      const newSubscriptions = new Map(prev);
      newSubscriptions.set(uid, unsubscribe);
      return newSubscriptions;
    });
  };

  const unsubscribeFromProfile = (uid: string) => {
    const unsubscribe = subscriptions.get(uid);
    if (unsubscribe) {
      console.log(`📡 Unsubscribing from profile updates for user: ${uid}`);
      unsubscribe();
      setSubscriptions(prev => {
        const newSubscriptions = new Map(prev);
        newSubscriptions.delete(uid);
        return newSubscriptions;
      });
    }
  };

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      console.log('📡 Cleaning up all profile subscriptions');
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const value: ProfileContextType = {
    profiles,
    getProfile,
    subscribeToProfile,
    unsubscribeFromProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};

// Custom hook for subscribing to a specific user's profile
export const useUserProfile = (uid: string | null | undefined) => {
  const { profiles, subscribeToProfile } = useProfileContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }

    // Subscribe to profile updates
    subscribeToProfile(uid);

    // Get current profile from the profiles map
    const currentProfile = profiles.get(uid) || null;
    setProfile(currentProfile);
  }, [uid, subscribeToProfile]);

  // Update profile when profiles map changes
  useEffect(() => {
    if (!uid) return;

    const updatedProfile = profiles.get(uid) || null;
    if (updatedProfile !== profile) {
      setProfile(updatedProfile);
    }
  }, [profiles, uid, profile]);

  return profile;
};
