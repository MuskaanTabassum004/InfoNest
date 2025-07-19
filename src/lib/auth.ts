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
      allowedRoutes: ["/", "/dashboard", "/profile", "/settings", "/chats"],
      dashboardRoute: "/dashboard",
    };

    switch (role) {
      case "admin":
        return {
          ...basePermissions,
          canCreateArticles: true,
          canManageUsers: true,
          canEditAnyArticle: true,
          canAccessAdmin: true,
          canAccessInfoWriter: true,
          allowedRoutes: [
            ...basePermissions.allowedRoutes,
            "/admin",
            "/admin/writer-requests",
            "/admin/active-writers",
            "/admin/removed-writers",
            "/admin/system",
            "/personal-dashboard",
            "/article/new",
            "/article/edit/:id",
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
          allowedRoutes: [
            ...basePermissions.allowedRoutes,
            "/article/new",
            "/article/edit/:id",
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
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(this.STORAGE_KEY)) {
        localStorage.removeItem(key);
      }
    });
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
  // ✅ CRITICAL FIX: Create Firebase Auth user but immediately sign them out
  // This ensures email verification is enforced before any authentication state
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // Store display name in Firebase Auth profile for later use
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }

  // Send email verification
  await sendEmailVerification(result.user);

  // ✅ CRITICAL: Sign out immediately to prevent authenticated state
  // User will only be authenticated after email verification
  await firebaseSignOut(auth);

  // Return user info for verification page display
  return { user: result.user, email, displayName };
};

// ✅ NEW: Create user profile in Firestore after email verification
export const createUserProfileAfterVerification = async (
  firebaseUser: User
) => {
  // Check if profile already exists
  const profileRef = doc(firestore, "users", firebaseUser.uid);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      role: "user",
      displayName:
        firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      requestedWriterAccess: false,
    };

    await setDoc(profileRef, userProfile);
    console.log(
      "✅ User profile created after email verification:",
      firebaseUser.uid
    );
  }
};

export const signIn = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);

  // Check if email is verified
  if (!result.user.emailVerified) {
    throw new Error(
      "Please verify your email address before signing in. Check your inbox for the verification link."
    );
  }

  return result;
};

export const signOut = async () => {
  // Clear all cached sessions before signing out
  authCache.clearAllSessions();
  return await firebaseSignOut(auth);
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
      console.log(
        "✅ InfoWriter promotion notification created for user:",
        uid
      );
    } catch (error) {
      console.error(
        "❌ Error creating InfoWriter promotion notification:",
        error
      );
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
    console.log("✅ InfoWriter approval notification created for user:", uid);
  } catch (error) {
    console.error("❌ Error creating InfoWriter approval notification:", error);
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

  // If new user, create profile
  const docRef = doc(firestore, "users", result.user.uid);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    const newUserProfile: UserProfile = {
      uid: result.user.uid,
      email: result.user.email!,
      role: "user",
      displayName: result.user.displayName || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      requestedWriterAccess: false,
    };
    await setDoc(docRef, newUserProfile);
  }

  return result;
};
