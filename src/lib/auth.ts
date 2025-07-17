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
  createdAt: Date;
  updatedAt: Date;
  requestedWriterAccess?: boolean;
}

export const signUp = async (
  email: string,
  password: string,
  displayName?: string
) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // ✅ Send email verification
  await sendEmailVerification(result.user);

  const userProfile: UserProfile = {
    uid: result.user.uid,
    email: result.user.email!,
    role: "user",
    displayName: displayName || "",
    createdAt: new Date(),
    updatedAt: new Date(),
    requestedWriterAccess: false,
  };

  await setDoc(doc(firestore, "users", result.user.uid), userProfile);
  return result;
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

  await updateUserRole(uid, "infowriter");
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
