import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface NetworkStatusMonitorProps {
  onStatusChange?: (isOnline: boolean) => void;
  className?: string;
}

export const NetworkStatusMonitor: React.FC<NetworkStatusMonitorProps> = ({
  onStatusChange,
  className = ''
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      onStatusChange?.(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status check
    onStatusChange?.(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange]);

  // Auto-hide offline message after 5 seconds
  useEffect(() => {
    if (showOfflineMessage) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showOfflineMessage]);

  if (!showOfflineMessage) return null;

  return (
    <div 
      className={`
        fixed top-20 right-4 z-40 flex items-center space-x-2 px-4 py-3 
        bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-lg
        backdrop-blur-sm transition-all duration-300 ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="h-4 w-4" />
      <div>
        <p className="text-sm font-medium">Connection lost</p>
        <p className="text-xs text-red-600">Your work is saved locally and will sync when reconnected</p>
      </div>
    </div>
  );
};