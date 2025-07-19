import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  AppNotification,
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
} from "../lib/notifications";

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userProfile?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToUserNotifications(
      userProfile.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);

        // Show browser notification for new unread notifications
        const newUnreadNotifications = newNotifications.filter(
          (notification) =>
            !notification.isRead && notification.type === "role_approval"
        );

        if (newUnreadNotifications.length > 0 && "Notification" in window) {
          // Request permission for browser notifications
          if (Notification.permission === "granted") {
            newUnreadNotifications.forEach((notification) => {
              new Notification(notification.title, {
                body: notification.message,
                icon: "/favicon.ico",
                tag: notification.id,
              });
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                newUnreadNotifications.forEach((notification) => {
                  new Notification(notification.title, {
                    body: notification.message,
                    icon: "/favicon.ico",
                    tag: notification.id,
                  });
                });
              }
            });
          }
        }
      }
    );

    return unsubscribe;
  }, [userProfile?.uid]);

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      await markNotificationAsRead(notificationId);
      // The real-time listener will update the state automatically
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    if (!userProfile?.uid) return;

    try {
      await markAllNotificationsAsRead(userProfile.uid);
      // The real-time listener will update the state automatically
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (
    notificationId: string
  ): Promise<void> => {
    try {
      await deleteNotification(notificationId);
      // The real-time listener will update the state automatically
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const refreshNotifications = (): void => {
    // Real-time listener automatically updates notifications
  };

  const unreadCount = getUnreadNotificationCount(notifications);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification: handleDeleteNotification,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
