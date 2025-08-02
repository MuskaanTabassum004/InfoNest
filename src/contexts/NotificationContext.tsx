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

export const NotificationContext = createContext<NotificationContextType | undefined>(
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
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userProfile?.uid) {
      setNotifications([]);
      setLoading(false);
      setShownNotificationIds(new Set()); // Clear shown notifications when user changes
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToUserNotifications(
      userProfile.uid,
      (newNotifications) => {
        setLoading(false);

        // Find truly new notifications that haven't been shown as browser notifications
        const newUnreadNotifications = newNotifications.filter(
          (notification) =>
            !notification.isRead &&
            notification.type === "role_approval" &&
            !shownNotificationIds.has(notification.id)
        );

        // Show browser notification for truly new unread notifications
        if (newUnreadNotifications.length > 0 && "Notification" in window) {
          // Request permission for browser notifications
          if (Notification.permission === "granted") {
            newUnreadNotifications.forEach((notification) => {
              new Notification(notification.title, {
                body: notification.message,
                icon: `${import.meta.env.BASE_URL}ChatGPT Image Jul 22, 2025, 11_54_47 AM.png`,
                tag: notification.id,
              });
            });
            // Mark these notifications as shown
            setShownNotificationIds(prev => {
              const newSet = new Set(prev);
              newUnreadNotifications.forEach(n => newSet.add(n.id));
              return newSet;
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                newUnreadNotifications.forEach((notification) => {
                  new Notification(notification.title, {
                    body: notification.message,
                    icon: `${import.meta.env.BASE_URL}ChatGPT Image Jul 22, 2025, 11_54_47 AM.png`,
                    tag: notification.id,
                  });
                });
                // Mark these notifications as shown
                setShownNotificationIds(prev => {
                  const newSet = new Set(prev);
                  newUnreadNotifications.forEach(n => newSet.add(n.id));
                  return newSet;
                });
              }
            });
          }
        }

        setNotifications(newNotifications);
      }
    );

    return unsubscribe;
  }, [userProfile?.uid]); // ✅ Removed shownNotificationIds dependency to prevent restarts

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
