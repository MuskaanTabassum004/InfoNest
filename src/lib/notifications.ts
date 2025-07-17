import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  onSnapshot,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { firestore } from './firebase';

export interface Notification {
  id: string;
  userId: string;
  type: 'infowriter_approved' | 'infowriter_rejected' | 'message' | 'article_deleted' | 'general';
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  data?: {
    articleId?: string;
    fromUserId?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export const createNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  data?: Notification['data']
): Promise<void> => {
  try {
    const notificationRef = doc(collection(firestore, 'notifications'));
    await setDoc(notificationRef, {
      userId,
      type,
      title,
      message,
      read: false,
      timestamp: Timestamp.now(),
      data: data || {}
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (
  userId: string,
  limitCount: number = 20
): Promise<Notification[]> => {
  try {
    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as Notification;
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const unreadQuery = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(unreadQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount: number = 20
): (() => void) => {
  const notificationsQuery = query(
    collection(firestore, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as Notification;
    });

    callback(notifications);
  });
};

export const subscribeToUnreadNotificationCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  const unreadQuery = query(
    collection(firestore, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(unreadQuery, (snapshot) => {
    callback(snapshot.size);
  });
};

// Helper functions for specific notification types
export const notifyInfoWriterApproval = async (userId: string): Promise<void> => {
  await createNotification(
    userId,
    'infowriter_approved',
    'InfoWriter Access Approved!',
    'Congratulations! Your InfoWriter request has been approved. You can now create and manage articles.',
    { approved: true }
  );
};

export const notifyInfoWriterRejection = async (
  userId: string,
  reason?: string
): Promise<void> => {
  await createNotification(
    userId,
    'infowriter_rejected',
    'InfoWriter Request Not Approved',
    reason || 'Your InfoWriter request was not approved at this time. You can reapply later.',
    { rejected: true, reason }
  );
};

export const notifyNewMessage = async (
  userId: string,
  fromUserName: string,
  articleTitle?: string
): Promise<void> => {
  const message = articleTitle 
    ? `${fromUserName} sent you a message about "${articleTitle}"`
    : `${fromUserName} sent you a message`;

  await createNotification(
    userId,
    'message',
    'New Message',
    message,
    { fromUserName, articleTitle }
  );
};

export const notifyArticleDeleted = async (
  userId: string,
  articleTitle: string,
  adminNote?: string
): Promise<void> => {
  const message = adminNote 
    ? `Your article "${articleTitle}" was removed by an admin. Reason: ${adminNote}`
    : `Your article "${articleTitle}" was removed by an admin.`;

  await createNotification(
    userId,
    'article_deleted',
    'Article Removed',
    message,
    { articleTitle, adminNote }
  );
};