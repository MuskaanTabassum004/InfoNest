// useAuth.ts - Enhanced with proper async loading and email verification flow
import { useEffect, useState, useCallback, useMemo } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, firestore } from "../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import {
  createUserProfileAfterVerification,
  authCache,
  UserPermissions,
} from "../lib/auth";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: "user" | "infowriter" | "admin";
  emailVerified: boolean;
  profilePicture?: string;
  createdAt?: Date;
  updatedAt?: Date;
  requestedWriterAccess?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = async (): Promise<void> => {
    if (!auth.currentUser) return;

    setProfileLoading(true);
    try {
      await auth.currentUser.reload();
      const currentUser = auth.currentUser;
      const profileRef = doc(firestore, "users", currentUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();

        setUserProfile({
          uid: currentUser.uid,
          email: currentUser.email || "",
          // Prioritize Firestore displayName over Firebase Auth displayName
          displayName:
            data.displayName ||
            currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "",
          role: data.role || "user",
          emailVerified: currentUser.emailVerified,
          profilePicture: data.profilePicture || "",
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          requestedWriterAccess: data.requestedWriterAccess,
        });
      }
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadUserProfile = useCallback(
    async (firebaseUser: User): Promise<void> => {
      if (!firebaseUser.emailVerified) return;

      setProfileLoading(true);

      try {
        // Check cache first
        const cachedSession = authCache.getCachedSession(firebaseUser.uid);

        if (
          cachedSession &&
          Date.now() - cachedSession.lastUpdated < 5 * 60 * 1000
        ) {
          console.log("✅ Using cached session");
          setUserProfile(cachedSession.userProfile);
          setPermissions(cachedSession.permissions);
          setProfileLoading(false);
          return;
        }

        console.log("🔄 Loading fresh profile");

        // Load from Firestore if cache miss or needs refresh
        const profileRef = doc(firestore, "users", firebaseUser.uid);
        onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName:
                data.displayName ||
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "",
              role: data.role || "user",
              emailVerified: firebaseUser.emailVerified,
              profilePicture: data.profilePicture || "",
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate(),
              requestedWriterAccess: data.requestedWriterAccess,
            };

            // Cache the session with permissions
            const session = authCache.cacheUserSession(profile);

            setUserProfile(profile);
            setPermissions(session.permissions);
            setProfileLoading(false);
          } else {
            if (firebaseUser.emailVerified) {
              console.log("⚠️ Verified user without profile");
            }
            setUserProfile(null);
            setPermissions(null);
            setProfileLoading(false);
          }
        });
      } catch (error) {
        console.error("Error loading user profile:", error);
        setUserProfile(null);
        setPermissions(null);
        setProfileLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        console.log("🔍 Auth state changed");

        // STRICT VERIFICATION CHECK: Only process verified users
        if (firebaseUser.emailVerified) {
          console.log("✅ Processing verified user");
          await createUserProfileAfterVerification(firebaseUser);
          await loadUserProfile(firebaseUser);
        } else {
          console.log("❌ Unverified user: Clearing data and signing out");
          
          // CRITICAL: Sign out unverified users immediately
          try {
            await firebaseSignOut(auth);
            console.log("✅ Unverified user signed out");
          } catch (signOutError) {
            console.error("❌ Failed to sign out unverified user");
          }
          
          // Clear all user data for unverified users
          setUserProfile(null);
          setPermissions(null);
          authCache.clearAllSessions();
        }
      } else {
        console.log("👤 No authenticated user");
        setUser(null);
        setUserProfile(null);
        setPermissions(null);
        authCache.clearAllSessions();
        
        // Clear any remaining storage
        try {
          localStorage.removeItem('infonest_auth_cache');
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('infonest_')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn("Failed to clear auth storage:", error);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time profile updates - always call useEffect but conditionally set up listener
  useEffect(() => {
    if (!user) return;

    const profileRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();

        setUserProfile({
          uid: user.uid,
          email: user.email || "",
          // Prioritize Firestore displayName over Firebase Auth displayName
          displayName:
            data.displayName ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "",
          role: data.role || "user",
          emailVerified: user.emailVerified,
          profilePicture: data.profilePicture || "",
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          requestedWriterAccess: data.requestedWriterAccess,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Optimized role checking functions using cached permissions
  const hasRole = useCallback(
    (role: "user" | "infowriter" | "admin"): boolean => {
      return userProfile?.role === role;
    },
    [userProfile]
  );

  const hasAnyRole = useCallback(
    (roles: ("user" | "infowriter" | "admin")[]): boolean => {
      return userProfile ? roles.includes(userProfile.role) : false;
    },
    [userProfile]
  );

  const canCreateArticles = useMemo((): boolean => {
    return permissions?.canCreateArticles || false;
  }, [permissions]);

  const canManageUsers = useMemo((): boolean => {
    return permissions?.canManageUsers || false;
  }, [permissions]);

  const canEditArticle = useCallback(
    (authorId: string): boolean => {
      if (!userProfile) return false;
      return userProfile.uid === authorId || userProfile.role === "admin";
    },
    [userProfile]
  );

  const hasRoutePermission = useCallback(
    (route: string): boolean => {
      if (!user) return false;
      return authCache.hasRoutePermission(user.uid, route);
    },
    [user]
  );

  const getDashboardRoute = useCallback((): string => {
    return permissions?.dashboardRoute || "/dashboard";
  }, [permissions]);

  // Enhanced role checking with better performance
  const isUserRole = (role: "user" | "infowriter" | "admin"): boolean => {
    return userProfile?.role === role;
  };

  const hasMinimumRole = (
    minimumRole: "user" | "infowriter" | "admin"
  ): boolean => {
    if (!userProfile) return false;

    const roleHierarchy = { user: 1, infowriter: 2, admin: 3 };
    const userRoleLevel = roleHierarchy[userProfile.role];
    const requiredLevel = roleHierarchy[minimumRole];

    return userRoleLevel >= requiredLevel;
  };

  return {
    user,
    userProfile,
    permissions,
    isAuthenticated: !!user && !!userProfile,
    emailVerified: user?.emailVerified || false,
    loading: loading || profileLoading,
    profileLoading,
    // Memoized role checks for performance
    isAdmin: userProfile?.role === "admin",
    isInfoWriter:
      userProfile?.role === "infowriter" || userProfile?.role === "admin",
    isUser: userProfile?.role === "user",
    // Optimized permission functions using cached data
    hasRole,
    hasAnyRole,
    canCreateArticles,
    canManageUsers,
    canEditArticle,
    hasRoutePermission,
    getDashboardRoute,
    refreshProfile,
    // Legacy functions for backward compatibility
    isUserRole,
    hasMinimumRole,
  };
};
