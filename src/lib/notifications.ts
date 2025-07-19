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
  type: "role_approval" | "general" | "article_published" | "system";
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
    const notification: Omit<AppNotification, "id"> = {
      userId,
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date(),
      metadata,
    };

    await setDoc(notificationRef, {
      ...notification,
      createdAt: Timestamp.fromDate(notification.createdAt),
    });

  } catch (error) {
    console.error("Error creating notification:", error);
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
    console.error("❌ Error fetching notifications:", error);
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
    console.error("Error deleting notification:", error);
    throw new Error("Failed to delete notification");
  }
};

// Get unread notification count
export const getUnreadNotificationCount = (
  notifications: AppNotification[]
): number => {
  return notifications.filter((notification) => !notification.isRead).length;
};
