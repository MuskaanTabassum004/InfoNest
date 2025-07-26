import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface VerificationDetectionResult {
  isVerified: boolean;
  user: User | null;
  loading: boolean;
}

export const useEmailVerificationDetection = (email?: string): VerificationDetectionResult => {
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Set up real-time auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Force reload to get latest verification status
        await currentUser.reload();
        
        // Check if this is the user we're waiting for (if email provided)
        const isTargetUser = !email || currentUser.email === email;
        
        if (isTargetUser && currentUser.emailVerified) {
          setIsVerified(true);
          setUser(currentUser);
          setLoading(false);
          return;
        }
        
        setUser(currentUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Set up periodic check for verification status
    // This helps catch verification that happens in other browsers/devices
    intervalId = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        
        const isTargetUser = !email || auth.currentUser.email === email;
        
        if (isTargetUser && auth.currentUser.emailVerified && !isVerified) {
          setIsVerified(true);
          setUser(auth.currentUser);
        }
      }
    }, 3000); // Check every 3 seconds

    return () => {
      unsubscribe();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [email, isVerified]);

  return { isVerified, user, loading };
};
