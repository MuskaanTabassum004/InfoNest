import React, { useState, useEffect } from "react";
import { resumableUploadManager } from "../lib/resumableUpload";
import { CheckCircle, X, Upload, FileText } from "lucide-react";
import { toast } from "react-hot-toast";

interface UploadNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  url: string;
  context?: any;
  timestamp: number;
}

export const GlobalUploadNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<UploadNotification[]>([]);
  const [activeUploads, setActiveUploads] = useState<any[]>([]);

  useEffect(() => {
    // Load existing notifications
    const loadNotifications = () => {
      const stored = resumableUploadManager.getUploadNotifications();
      setNotifications(stored.slice(-3)); // Show only last 3
    };

    // Load active uploads
    const loadActiveUploads = () => {
      const uploads = resumableUploadManager.getActiveUploads();
      setActiveUploads(uploads);
    };

    // Initial load
    loadNotifications();
    loadActiveUploads();

    // Listen for global upload completion events
    const handleGlobalUploadComplete = (event: CustomEvent) => {
      const notification = event.detail;
      setNotifications(prev => [...prev.slice(-2), notification]);
      toast.success(notification.message);
    };

    // Listen for upload progress updates
    const handleUploadProgress = () => {
      loadActiveUploads();
    };

    // Set up event listeners
    window.addEventListener("globalUploadComplete", handleGlobalUploadComplete as EventListener);
    
    // Poll for active uploads updates
    const interval = setInterval(() => {
      loadActiveUploads();
    }, 2000);

    return () => {
      window.removeEventListener("globalUploadComplete", handleGlobalUploadComplete as EventListener);
      clearInterval(interval);
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Update localStorage
    const allNotifications = resumableUploadManager.getUploadNotifications();
    const filtered = allNotifications.filter(n => n.id !== id);
    localStorage.setItem("upload_notifications", JSON.stringify(filtered));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    resumableUploadManager.clearUploadNotifications();
  };

  if (notifications.length === 0 && activeUploads.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Active Uploads */}
      {activeUploads.map((upload) => (
        <div
          key={upload.id}
          className="bg-white border border-blue-200 rounded-lg shadow-lg p-4 animate-slide-up"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Uploading {upload.fileName}
              </p>
              <div className="mt-1">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upload.percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(upload.percentage || 0)}% • {upload.speed ? resumableUploadManager.formatSpeed(upload.speed) : "Calculating..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Completed Upload Notifications */}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border border-green-200 rounded-lg shadow-lg p-4 animate-slide-up"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 truncate">
                {notification.message}
              </p>
              {notification.context?.type === "article" && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      if (notification.context?.articleId) {
                        window.location.href = `/article/edit/${notification.context.articleId}`;
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Go to Article</span>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Clear All Button */}
      {notifications.length > 1 && (
        <div className="text-center">
          <button
            onClick={clearAllNotifications}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );
};
