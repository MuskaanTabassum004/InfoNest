import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, Clock, AlertTriangle } from "lucide-react";
import { offlineSyncManager } from "../lib/offlineSync";
import { resumableUploadManager } from "../lib/resumableUpload";

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState(0);
  const [activeUploads, setActiveUploads] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

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

  if (isOnline && pendingActions === 0 && activeUploads === 0) {
    return null; // Don't show when everything is normal
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg border cursor-pointer transition-all ${
          isOnline
            ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">
              {pendingActions > 0 || activeUploads > 0 ? 'Syncing...' : 'Online'}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Offline</span>
          </>
        )}
        
        {(pendingActions > 0 || activeUploads > 0) && (
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span className="text-xs">
              {pendingActions + activeUploads} pending
            </span>
          </div>
        )}
      </div>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-64">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Connection Status</h4>
              <div className={`flex items-center space-x-1 text-sm ${
                isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            {activeUploads > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active uploads:</span>
                <span className="font-medium text-blue-600">{activeUploads}</span>
              </div>
            )}

            {pendingActions > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pending actions:</span>
                <span className="font-medium text-yellow-600">{pendingActions}</span>
              </div>
            )}

            {!isOnline && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Working offline</p>
                  <p>Your changes will sync when connection is restored.</p>
                </div>
              </div>
            )}

            {isOnline && (pendingActions > 0 || activeUploads > 0) && (
              <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Syncing in progress</p>
                  <p>Your uploads and changes are being processed.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};