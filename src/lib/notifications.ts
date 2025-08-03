import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "./firebase";

export interface AppNotification {
  id: string;
  userId: string;
  type: "role_approval" | "general" | "article_published" | "system" | "writer_privileges_removed" | "article_deleted";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
  metadata?: {
    previousRole?: string;
    newRole?: string;
    [key: string]: any;
  };
}

// Create a new notification
export const createNotification = async (
  userId: string,
  type: AppNotification["type"],
  title: string,
  message: string,
  metadata?: AppNotification["metadata"]
): Promise<void> => {
  try {
    const notificationRef = doc(collection(firestore, "notifications"));

    // Build notification object, excluding undefined fields
    const notification: any = {
      userId,
      type,
      title,
      message,
      isRead: false,
      createdAt: Timestamp.fromDate(new Date()),
    };

    // Only add metadata if it's defined and clean up undefined values
    if (metadata !== undefined) {
      // Remove undefined values from metadata
      const cleanMetadata: any = {};
      Object.keys(metadata).forEach(key => {
        if (metadata[key] !== undefined) {
          cleanMetadata[key] = metadata[key];
        }
      });

      // Only add metadata if it has valid properties
      if (Object.keys(cleanMetadata).length > 0) {
        notification.metadata = cleanMetadata;
      }
    }

    await setDoc(notificationRef, notification);

  } catch (error) {
    // Handle errors silently for notifications
    throw new Error("Failed to create notification");
  }
};

// Create InfoWriter approval notification
export const createInfoWriterApprovalNotification = async (
  userId: string,
  previousRole: string = "user"
): Promise<void> => {
  await createNotification(
    userId,
    "role_approval",
    "InfoWriter Request Approved!",
    "Your InfoWriter request has been approved! You can now create and manage articles.",
    {
      previousRole,
      newRole: "infowriter",
    }
  );
};

// Create InfoWriter rejection notification
export const createInfoWriterRejectionNotification = async (
  userId: string,
  adminNote?: string
): Promise<void> => {
  const message = adminNote
    ? `Your InfoWriter request has been rejected. Reason: ${adminNote}. You can submit a new request after addressing the feedback.`
    : "Your InfoWriter request has been rejected. You can submit a new request in the future.";

  // Build metadata without undefined values
  const metadata: any = {
    previousRole: "user",
    newRole: "user",
    status: "rejected",
  };

  // Only add adminNote if it has a value
  if (adminNote && adminNote.trim()) {
    metadata.adminNote = adminNote.trim();
  }

  await createNotification(
    userId,
    "role_approval",
    "InfoWriter Request Update",
    message,
    metadata
  );
};

// Create general InfoWriter status notification
export const createInfoWriterStatusNotification = async (
  userId: string,
  status: "approved" | "rejected",
  adminNote?: string,
  previousRole: string = "user"
): Promise<void> => {
  if (status === "approved") {
    await createInfoWriterApprovalNotification(userId, previousRole);
  } else {
    await createInfoWriterRejectionNotification(userId, adminNote);
  }
};

// Create article deletion notification
export const createArticleDeletionNotification = async (
  userId: string,
  articleTitle: string,
  deleteReason?: string
): Promise<void> => {
  const message = deleteReason
    ? `Your article "${articleTitle}" has been deleted by an administrator. Reason: ${deleteReason}. If you have questions about this action, please contact support.`
    : `Your article "${articleTitle}" has been deleted by an administrator. If you have questions about this action, please contact support.`;

  // Build metadata without undefined values
  const metadata: any = {
    articleTitle: articleTitle,
    deletedBy: "admin",
  };

  // Only add deleteReason if it has a value
  if (deleteReason && deleteReason.trim()) {
    metadata.deleteReason = deleteReason.trim();
  }

  await createNotification(
    userId,
    "article_deleted",
    "Article Deleted",
    message,
    metadata
  );
};
// Get user notifications
export const getUserNotifications = async (
  userId: string
): Promise<AppNotification[]> => {
  try {
    const q = query(
      collection(firestore, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        readAt: data.readAt?.toDate(),
      } as AppNotification;
    });
  } catch (error) {
    return [];
  }
};

// Subscribe to user notifications (real-time)
export const subscribeToUserNotifications = (
  userId: string,
  callback: (notifications: AppNotification[]) => void
): (() => void) => {

  const q = query(
    collection(firestore, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          readAt: data.readAt?.toDate(),
        } as AppNotification;
      });

      callback(notifications);
    },
    (error) => {
      // Handle permission errors silently
      if (error.code === "permission-denied") {
        // Silently handle permission denied errors
        callback([]);
        return;
      }
      console.error("Error in notifications subscription:", error);
      callback([]);
    }
  );
};

// Mark notification as read
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  try {
    const notificationRef = doc(firestore, "notifications", notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
      readAt: Timestamp.now(),
    });

  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw new Error("Failed to mark notification as read");
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
  userId: string
): Promise<void> => {
  try {
    const q = query(
      collection(firestore, "notifications"),
      where("userId", "==", userId),
      where("isRead", "==", false)
    );

    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map((doc) =>
      updateDoc(doc.ref, {
        isRead: true,
        readAt: Timestamp.now(),
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error("Failed to mark all notifications as read");
  }
};

// Delete notification
export const deleteNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    const notificationRef = doc(firestore, "notifications", notificationId);
    await deleteDoc(notificationRef);

  } catch (error) {
    throw new Error("Failed to delete notification");
  }
};

// Get unread notification count
export const getUnreadNotificationCount = (
  notifications: AppNotification[]
): number => {
  return notifications.filter((notification) => !notification.isRead).length;
};
