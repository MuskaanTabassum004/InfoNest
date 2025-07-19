import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "./firebase";

export type RequestStatus = "pending" | "approved" | "rejected";
export type TargetAudience =
  | "beginners"
  | "intermediate"
  | "advanced"
  | "all-levels";

export interface WriterRequest {
  id: string;
  userId: string;
  fullName: string; // Immutable - automatically populated from authenticated user profile
  email: string; // Immutable - automatically populated from authenticated user profile
  qualifications: string;
  areasOfInterest: string[];
  proposedTitle: string;
  briefDescription: string;
  targetAudience: TargetAudience;
  status: RequestStatus;
  submittedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  adminNotes?: string;
  requestId: string; // Unique tracking ID
}

// Generate unique request ID
const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `WR-${timestamp}-${randomStr}`.toUpperCase();
};

// Sanitize input data
const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
};

export const submitWriterRequest = async (
  requestData: Omit<
    WriterRequest,
    "id" | "submittedAt" | "status" | "requestId"
  >
): Promise<string> => {
  // Check if user already has a pending request
  const existingRequestQuery = query(
    collection(firestore, "writerRequests"),
    where("userId", "==", requestData.userId),
    where("status", "==", "pending")
  );

  const existingRequests = await getDocs(existingRequestQuery);
  if (!existingRequests.empty) {
    throw new Error(
      "You already have a pending InfoWriter request. Please wait for admin review."
    );
  }

  const docRef = doc(collection(firestore, "writerRequests"));
  const requestId = generateRequestId();

  const sanitizedRequest: WriterRequest = {
    ...requestData,
    id: docRef.id,
    fullName: sanitizeInput(requestData.fullName),
    qualifications: sanitizeInput(requestData.qualifications),
    proposedTitle: sanitizeInput(requestData.proposedTitle),
    briefDescription: sanitizeInput(requestData.briefDescription),
    status: "pending",
    submittedAt: new Date(),
    requestId,
  };

  await setDoc(docRef, {
    ...sanitizedRequest,
    submittedAt: Timestamp.fromDate(sanitizedRequest.submittedAt),
  });

  return requestId;
};

export const getWriterRequests = async (
  status?: RequestStatus
): Promise<WriterRequest[]> => {
  let q = query(collection(firestore, "writerRequests"));

  if (status) {
    q = query(q, where("status", "==", status));
    // Don't add orderBy for filtered queries to avoid composite index requirement
    // We'll sort in memory instead
  } else {
    // Only add orderBy when not filtering by status
    q = query(q, orderBy("submittedAt", "desc"));
  }

  const querySnapshot = await getDocs(q);
  let requests = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      submittedAt: data.submittedAt.toDate(),
      processedAt: data.processedAt?.toDate(),
    } as WriterRequest;
  });

  // Sort in memory if we filtered by status
  if (status) {
    requests = requests.sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()
    );
  }

  return requests;
};

export const getWriterRequest = async (
  id: string
): Promise<WriterRequest | null> => {
  const docRef = doc(firestore, "writerRequests", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      submittedAt: data.submittedAt.toDate(),
      processedAt: data.processedAt?.toDate(),
    } as WriterRequest;
  }

  return null;
};

export const processWriterRequest = async (
  id: string,
  status: "approved" | "rejected",
  adminId: string,
  adminNotes?: string
): Promise<void> => {
  const requestRef = doc(firestore, "writerRequests", id);

  await updateDoc(requestRef, {
    status,
    processedAt: Timestamp.fromDate(new Date()),
    processedBy: adminId,
    adminNotes: adminNotes || "",
  });
};

export const getUserWriterRequest = async (
  userId: string
): Promise<WriterRequest | null> => {
  // Modified query to avoid composite index requirement
  const q = query(
    collection(firestore, "writerRequests"),
    where("userId", "==", userId)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    // Sort the results in memory to get the most recent
    const requests = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        submittedAt: data.submittedAt.toDate(),
        processedAt: data.processedAt?.toDate(),
      } as WriterRequest;
    });

    // Sort by submittedAt in descending order and return the first (most recent)
    requests.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    return requests[0];
  }

  return null;
};
