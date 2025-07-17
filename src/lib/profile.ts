import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'infowriter' | 'admin';
  profilePicture?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
  recentSearches: string[];
  requestedWriterAccess?: boolean;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(firestore, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
        lastActive: data.lastActive?.toDate() ?? new Date(),
        recentSearches: data.recentSearches || []
      } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(firestore, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Timestamp.now(),
      lastActive: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const uploadProfilePicture = async (
  uid: string, 
  file: File
): Promise<string> => {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image must be less than 5MB');
    }

    // Delete existing profile picture if it exists
    const currentProfile = await getUserProfile(uid);
    if (currentProfile?.profilePicture) {
      try {
        const oldImageRef = ref(storage, `profiles/${uid}/profile-picture`);
        await deleteObject(oldImageRef);
      } catch (error) {
        // Ignore if file doesn't exist
        console.log('Old profile picture not found, continuing...');
      }
    }

    // Upload new image
    const imageRef = ref(storage, `profiles/${uid}/profile-picture`);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update user profile with new image URL
    await updateUserProfile(uid, { profilePicture: downloadURL });

    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

export const updateLastActive = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(firestore, 'users', uid);
    await updateDoc(userRef, {
      lastActive: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating last active:', error);
    // Don't throw error for this non-critical update
  }
};