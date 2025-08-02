// useAuth.ts - Enhanced with proper async loading and email verification flow
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
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
  bio?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
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
          bio: data.bio || "",
          socialLinks: data.socialLinks || {},
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
          setUserProfile(cachedSession.userProfile);
          setPermissions(cachedSession.permissions);
          setProfileLoading(false);
          return;
        }

        // Load from Firestore if cache miss or needs refresh
        const profileRef = doc(firestore, "users", firebaseUser.uid);
        onSnapshot(
          profileRef,
          (doc) => {
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
                bio: data.bio || "",
                socialLinks: data.socialLinks || {},
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
              setUserProfile(null);
              setPermissions(null);
              setProfileLoading(false);
            }
          },
          (error) => {
            // Handle Firestore permission errors silently
            if (error.code === "permission-denied") {
              // Silently handle permission errors for unverified users
              setUserProfile(null);
              setPermissions(null);
              setProfileLoading(false);
              return;
            }
            console.error("Error in profile snapshot:", error);
            setUserProfile(null);
            setPermissions(null);
            setProfileLoading(false);
          }
        );
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
        // STRICT VERIFICATION CHECK: Only process verified users
        if (firebaseUser.emailVerified) {
          try {
            await createUserProfileAfterVerification(firebaseUser);
            await loadUserProfile(firebaseUser);
          } catch (error: any) {
            // Silently handle permission errors for unverified users
            if (error.code === "permission-denied") {
              setUserProfile(null);
              setPermissions(null);
              authCache.clearAllSessions();
            } else {
              console.error("Error creating/loading user profile:", error);
            }
          }
        } else {
          // For unverified users, clear user data but don't sign them out
          // This allows the verification flow to work properly
          setUserProfile(null);
          setPermissions(null);
          authCache.clearAllSessions();
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setPermissions(null);
        authCache.clearAllSessions();

        // Clear any remaining storage
        try {
          localStorage.removeItem("infonest_auth_cache");
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("infonest_")) {
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
    if (!user || !user.emailVerified) return;

    const profileRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      profileRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();

          const updatedProfile = {
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
            bio: data.bio || "",
            socialLinks: data.socialLinks || {},
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            requestedWriterAccess: data.requestedWriterAccess,
          };

          setUserProfile(updatedProfile);

          // Update cached permissions when profile changes
          if (updatedProfile) {
            authCache.cacheUserSession(updatedProfile);
          }
        }
      },
      (error) => {
        // Handle permission errors silently
        if (error.code === "permission-denied") {
          console.warn("Permission denied for user profile subscription - user may not be authenticated or verified");
          return;
        }
        console.error("Error in user profile subscription:", error);
      }
    );

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
    (authorId: string, articleStatus?: string): boolean => {
      if (!userProfile) return false;

      // Archived articles cannot be edited by anyone
      if (articleStatus === "archive") return false;

      // Only authors can edit their own articles (including admins editing their own articles)
      // This matches the updated Firebase security rules
      return userProfile.uid === authorId;
    },
    [userProfile]
  );

  const canDeleteArticle = useCallback(
    (authorId: string, authorRole?: string): boolean => {
      if (!userProfile || !permissions) return false;

      // Users can delete their own articles
      if (userProfile.uid === authorId) {
        return permissions.canDeleteOwnArticles;
      }

      // Admins can delete any article (infowriter or other admin articles)
      if (userProfile.role === "admin") {
        return permissions.canDeleteInfowriterArticles; // This permission covers all deletions for admins
      }

      return false;
    },
    [userProfile, permissions]
  );

  const canReadArticle = useCallback(
    (articleStatus: string, authorId: string): boolean => {
      // Anyone can read published articles (matches Firebase rules)
      if (articleStatus === "published") {
        return true;
      }

      // Archived articles can only be read by author or admin
      if (articleStatus === "archive") {
        if (!userProfile) return false;
        // Authors can read their own archived articles
        if (userProfile.uid === authorId) return true;
        // Admins can read all archived articles
        if (userProfile.role === "admin") return true;
        return false;
      }

      // Must be authenticated to read non-published articles
      if (!userProfile) return false;

      // Can read own articles (any status)
      if (userProfile.uid === authorId) {
        return true;
      }

      // No other access allowed (admins cannot read other users' private articles)
      return false;
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
    canDeleteArticle,
    canReadArticle,
    hasRoutePermission,
    getDashboardRoute,
    refreshProfile,
    // Legacy functions for backward compatibility
    isUserRole,
    hasMinimumRole,
  };
};
