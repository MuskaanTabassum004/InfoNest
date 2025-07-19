import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, Clock, AlertTriangle } from "lucide-react";
import { offlineSyncManager } from "../lib/offlineSync";
import { resumableUploadManager } from "../lib/resumableUpload";

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState(0);
  const [activeUploads, setActiveUploads] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor pending actions and uploads
    const interval = setInterval(() => {
      setPendingActions(offlineSyncManager.getPendingActionsCount());
      setActiveUploads(resumableUploadManager.getActiveUploads().length);
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Only show when offline or there are pending operations
  if (isOnline && pendingActions === 0 && activeUploads === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border text-sm ${
        isOnline
          ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
          : 'bg-red-50 text-red-800 border-red-200'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span className="font-medium">
              {pendingActions > 0 || activeUploads > 0 ? 'Syncing...' : 'Online'}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="font-medium">Offline</span>
          </>
        )}
        
        {(pendingActions > 0 || activeUploads > 0) && (
          <span className="text-xs bg-white/20 px-2 py-1 rounded">
            {pendingActions + activeUploads}
          </span>
        )}
      </div>
    </div>
  );
};