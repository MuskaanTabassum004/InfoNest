// ✅ Updated auth.ts with email verification and Google sign-in support
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  applyActionCode,
  checkActionCode,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { auth, firestore } from "./firebase";

export type UserRole = "user" | "infowriter" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  profilePicture?: string;
  createdAt?: Date;
  updatedAt?: Date;
  requestedWriterAccess?: boolean;
  emailVerified: boolean;
}

// Enhanced permission interface for caching
export interface UserPermissions {
  canCreateArticles: boolean;
  canManageUsers: boolean;
  canEditAnyArticle: boolean;
  canAccessAdmin: boolean;
  canAccessInfoWriter: boolean;
  canDeleteOwnArticles: boolean;
  canDeleteInfowriterArticles: boolean; // Admin can delete infowriter articles
  canReadPublishedArticles: boolean;
  canReadOwnArticles: boolean;
  canReadAllArticles: boolean; // Admin can read all articles
  allowedRoutes: string[];
  dashboardRoute: string;
}

// Cached session interface
export interface CachedUserSession {
  userProfile: UserProfile;
  permissions: UserPermissions;
  lastUpdated: number;
  expiresAt: number;
}

// Cache manager class
class AuthCacheManager {
  private static instance: AuthCacheManager;
  private cache: Map<string, CachedUserSession> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly STORAGE_KEY = "infonest_auth_cache";

  static getInstance(): AuthCacheManager {
    if (!AuthCacheManager.instance) {
      AuthCacheManager.instance = new AuthCacheManager();
    }
    return AuthCacheManager.instance;
  }

  // Generate comprehensive permissions based on user role
  private generatePermissions(userProfile: UserProfile): UserPermissions {
    const { role } = userProfile;

    const basePermissions: UserPermissions = {
      canCreateArticles: false,
      canManageUsers: false,
      canEditAnyArticle: false,
      canAccessAdmin: false,
      canAccessInfoWriter: false,
      canDeleteOwnArticles: false,
      canDeleteInfowriterArticles: false,
      canReadPublishedArticles: true, // All authenticated users can read published articles
      canReadOwnArticles: true, // All users can read their own articles
      canReadAllArticles: false,
      allowedRoutes: ["/", "/dashboard", "/profile"],
      dashboardRoute: "/dashboard",
    };

    switch (role) {
      case "admin":
        return {
          ...basePermissions,
          canCreateArticles: true,
          canManageUsers: true,
          canEditAnyArticle: false, // Admins can only edit their own articles (updated security model)
          canAccessAdmin: true,
          canAccessInfoWriter: true,
          canDeleteOwnArticles: true, // Admins can hard delete their own articles
          canDeleteInfowriterArticles: true, // Admins can soft delete infowriter articles
          canReadAllArticles: true, // Admins can read all published articles
          allowedRoutes: [
            ...basePermissions.allowedRoutes,
            "/admin",
            "/admin/writer-requests",
            "/admin/active-writers",
            "/admin/removed-writers",
            "/admin/system",
            "/article/new",
            "/article/edit/:id",
            "/article/:id", // Allow viewing articles
            "/my-articles",
            "/search",
            "/writer-request",
            "/saved-articles",
          ],
        };

      case "infowriter":
        return {
          ...basePermissions,
          canCreateArticles: true,
          canAccessInfoWriter: true,
          canDeleteOwnArticles: true, // Infowriters can hard delete their own articles
          canDeleteInfowriterArticles: false, // Cannot delete other infowriters' articles
          allowedRoutes: [
            ...basePermissions.allowedRoutes,
            "/article/new",
            "/article/edit/:id",
            "/article/:id", // Allow viewing articles
            "/my-articles",
            "/search",
            "/writer-request",
            "/saved-articles",
          ],
        };

      case "user":
      default:
        return {
          ...basePermissions,
          allowedRoutes: [
            ...basePermissions.allowedRoutes,
            "/article/:id", // Allow users to view articles
            "/writer-request",
            "/saved-articles",
          ],
        };
    }
  }

  // Cache user session with permissions
  cacheUserSession(userProfile: UserProfile): CachedUserSession {
    const now = Date.now();
    const permissions = this.generatePermissions(userProfile);

    const session: CachedUserSession = {
      userProfile,
      permissions,
      lastUpdated: now,
      expiresAt: now + this.CACHE_DURATION,
    };

    this.cache.set(userProfile.uid, session);
    this.persistToStorage(userProfile.uid, session);

    return session;
  }

  // Get cached session
  getCachedSession(uid: string): CachedUserSession | null {
    let session = this.cache.get(uid);

    if (!session) {
      session = this.loadFromStorage(uid);
      if (session) {
        this.cache.set(uid, session);
      }
    }

    if (session && Date.now() < session.expiresAt) {
      return session;
    }

    if (session) {
      this.clearUserSession(uid);
    }

    return null;
  }

  // Check if user has permission for route
  hasRoutePermission(uid: string, route: string): boolean {
    const session = this.getCachedSession(uid);
    if (!session) return false;

    return session.permissions.allowedRoutes.some((allowedRoute) => {
      if (allowedRoute.includes(":")) {
        const pattern = allowedRoute.replace(/:[^/]+/g, "[^/]+");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(route);
      }
      return route === allowedRoute || route.startsWith(allowedRoute + "/");
    });
  }

  // Clear user session
  clearUserSession(uid: string): void {
    this.cache.delete(uid);
    localStorage.removeItem(`${this.STORAGE_KEY}_${uid}`);
  }

  // Clear all sessions
  clearAllSessions(): void {
    this.cache.clear();
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(this.STORAGE_KEY) || key.startsWith("infonest_")) {
          localStorage.removeItem(key);
        }
      });

      // Also clear session storage
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith(this.STORAGE_KEY) || key.startsWith("infonest_")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear storage:", error);
    }
  }

  // Persist to localStorage
  private persistToStorage(uid: string, session: CachedUserSession): void {
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY}_${uid}`,
        JSON.stringify({
          ...session,
          userProfile: {
            ...session.userProfile,
            createdAt: session.userProfile.createdAt?.getTime(),
            updatedAt: session.userProfile.updatedAt?.getTime(),
          },
        })
      );
    } catch (error) {
      console.warn("Failed to persist auth cache:", error);
    }
  }

  // Load from localStorage
  private loadFromStorage(uid: string): CachedUserSession | null {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${uid}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        userProfile: {
          ...parsed.userProfile,
          createdAt: parsed.userProfile.createdAt
            ? new Date(parsed.userProfile.createdAt)
            : undefined,
          updatedAt: parsed.userProfile.updatedAt
            ? new Date(parsed.userProfile.updatedAt)
            : undefined,
        },
      };
    } catch (error) {
      return null;
    }
  }
}

export const authCache = AuthCacheManager.getInstance();

export const signUp = async (
  email: string,
  password: string,
  displayName?: string
) => {
  try {
    // Create Firebase Auth user but DO NOT create Firestore profile yet
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update Firebase Auth profile with display name
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }

    // Send email verification immediately
    await sendEmailVerification(result.user, {
      url: `${window.location.origin}/verify-email`,
      handleCodeInApp: true,
    });

    // Keep user signed in but they won't have Firestore profile until verified
    console.log("✅ User created successfully, verification email sent");

    // Return user info for verification page display
    return { user: result.user, email, displayName };
  } catch (error: any) {
    console.error("Signup error:", error);

    // Handle email already in use error
    if (error.code === 'auth/email-already-in-use') {
      // Check if user exists but is unverified
      try {
        const signInResult = await signInWithEmailAndPassword(auth, email, password);
        if (!signInResult.user.emailVerified) {
          // Resend verification email
          await sendEmailVerification(signInResult.user, {
            url: `${window.location.origin}/verify-email`,
            handleCodeInApp: true,
          });
          return { user: signInResult.user, email, displayName };
        } else {
          throw new Error("An account with this email already exists and is verified. Please sign in instead.");
        }
      } catch (signInError) {
        throw new Error("An account with this email already exists. Please sign in instead.");
      }
    }

    throw error;
  }
};

// Update user profile verification status after email verification
export const updateUserProfileAfterVerification = async (
  firebaseUser: User
) => {
  // Only create/update profile for verified users
  if (!firebaseUser.emailVerified) {
    return;
  }

  // Check if profile exists, if not create it (this is the first time after verification)
  const profileRef = doc(firestore, "users", firebaseUser.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    // Update existing profile with verification status (shouldn't happen in new flow)
    await updateDoc(profileRef, {
      emailVerified: true,
      updatedAt: new Date(),
    });
  } else {
    // Create profile for the first time after email verification
    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      role: "user",
      displayName:
        firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      requestedWriterAccess: false,
      emailVerified: true,
    };

    await setDoc(profileRef, {
      ...userProfile,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log("✅ User profile created after email verification");
  }
};

export const signIn = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);

  // Allow sign in but redirect unverified users to verification page
  if (!result.user.emailVerified) {
    // Don't sign out, just let the app handle the redirect
    console.log("User signed in but not verified, will redirect to verification page");
  }

  return result;
};

export const signOut = async () => {
  // Clear all cached sessions before signing out
  authCache.clearAllSessions();

  // Clear all local storage
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    console.warn("Failed to clear storage:", error);
  }

  // Clear any cookies (if using them)
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });

  await firebaseSignOut(auth);

  // Navigate to homepage after logout
  window.location.href = "/";
};

export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  const docRef = doc(firestore, "users", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
    } as UserProfile;
  }

  return null;
};

export const updateUserRole = async (uid: string, role: UserRole) => {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    role,
    updatedAt: new Date(),
  });
};

// Enhanced role management with validation
export const promoteToInfoWriter = async (uid: string) => {
  const userProfile = await getUserProfile(uid);
  if (!userProfile) {
    throw new Error("User not found");
  }

  if (userProfile.role === "admin") {
    throw new Error("Cannot change admin role");
  }

  const previousRole = userProfile.role;
  await updateUserRole(uid, "infowriter");

  // Create notification for the promoted user
  if (previousRole === "user") {
    try {
      const { createInfoWriterApprovalNotification } = await import(
        "./notifications"
      );
      await createInfoWriterApprovalNotification(uid, previousRole);
    } catch (error) {
      console.error("Error creating InfoWriter promotion notification:", error);
      // Don't throw error to avoid breaking the promotion process
    }
  }
};

export const promoteToAdmin = async (
  uid: string,
  currentUserRole: UserRole
) => {
  if (currentUserRole !== "admin") {
    throw new Error("Only admins can promote users to admin");
  }

  await updateUserRole(uid, "admin");
};

export const demoteUser = async (uid: string, currentUserRole: UserRole) => {
  if (currentUserRole !== "admin") {
    throw new Error("Only admins can demote users");
  }

  const userProfile = await getUserProfile(uid);
  if (!userProfile) {
    throw new Error("User not found");
  }

  // Prevent demoting the last admin
  if (userProfile.role === "admin") {
    const allAdmins = await getAdminUsers();
    if (allAdmins.length <= 1) {
      throw new Error("Cannot demote the last admin");
    }
  }

  await updateUserRole(uid, "user");
};

export const requestWriterAccess = async (uid: string) => {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    requestedWriterAccess: true,
    updatedAt: new Date(),
  });
};

export const getPendingWriterRequests = async () => {
  const q = query(
    collection(firestore, "users"),
    where("requestedWriterAccess", "==", true),
    where("role", "==", "user")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
    updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
  })) as UserProfile[];
};

export const approveWriterRequest = async (uid: string) => {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    role: "infowriter",
    requestedWriterAccess: false,
    updatedAt: new Date(),
  });

  // Create notification for the approved user
  try {
    const { createInfoWriterApprovalNotification } = await import(
      "./notifications"
    );
    await createInfoWriterApprovalNotification(uid);
  } catch (error) {
    console.error("Error creating InfoWriter approval notification:", error);
    // Don't throw error to avoid breaking the approval process
  }
};

export const denyWriterRequest = async (uid: string) => {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    requestedWriterAccess: false,
    updatedAt: new Date(),
  });
};

export const getInfoWriters = async () => {
  const q = query(
    collection(firestore, "users"),
    where("role", "==", "infowriter")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
    updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
  })) as UserProfile[];
};

export const getAdminUsers = async () => {
  const q = query(collection(firestore, "users"), where("role", "==", "admin"));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
    updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
  })) as UserProfile[];
};

export const getUsersByRole = async (role: UserRole) => {
  const q = query(collection(firestore, "users"), where("role", "==", role));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
    updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
  })) as UserProfile[];
};

export const getAllUsers = async () => {
  const q = query(collection(firestore, "users"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
    updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
  })) as UserProfile[];
};

export const removeInfoWriterStatus = async (uid: string) => {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    role: "user",
    updatedAt: new Date(),
  });
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ✅ Google Sign-In
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  // Google users are automatically verified, so we can create profile
  const docRef = doc(firestore, "users", result.user.uid);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
      email: result.user.email!,
      role: "user",
      displayName: result.user.displayName || "",
      emailVerified: true, // Google users are automatically verified
      createdAt: new Date(),
      updatedAt: new Date(),
      requestedWriterAccess: false,
    };

    await setDoc(docRef, {
      ...newUserProfile,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Google user profile created");
  }

  return result;
};

// Handle email verification from link
export const handleEmailVerification = async (
  actionCode: string
): Promise<boolean> => {
  try {
    // Verify the action code
    await applyActionCode(auth, actionCode);

    // Force refresh the current user to get updated emailVerified status
    if (auth.currentUser) {
      await auth.currentUser.reload();

      // Update user profile verification status
      if (auth.currentUser.emailVerified) {
        await updateUserProfileAfterVerification(auth.currentUser);
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } catch (error) {
    console.error("Email verification failed:", error);

    // Provide more specific error messages
    if (error.code === "auth/invalid-action-code") {
      throw new Error(
        "This verification link has expired or has already been used. Please request a new verification email."
      );
    } else if (error.code === "auth/user-disabled") {
      throw new Error(
        "This account has been disabled. Please contact support."
      );
    } else if (error.code === "auth/user-not-found") {
      throw new Error(
        "No account found for this verification link. Please sign up again."
      );
    }

    throw error;
  }
};

// Check if action code is valid without applying it
export const checkEmailVerificationCode = async (
  actionCode: string
): Promise<boolean> => {
  try {
    await checkActionCode(auth, actionCode);
    return true;
  } catch (error) {
    console.error("Invalid verification code:", error);
    return false;
  }
};
