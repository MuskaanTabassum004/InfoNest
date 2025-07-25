import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";

interface NetworkStatusProps {
  className?: string;
  showDetails?: boolean;
  hideFromUI?: boolean;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  className = "",
  showDetails = false,
  hideFromUI = true
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality('good');
      setLastOnlineTime(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test connection quality periodically
    const testConnection = async () => {
      if (!navigator.onLine) return;

      try {
        const start = Date.now();
        const response = await fetch('/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const duration = Date.now() - start;

        if (response.ok) {
          setIsOnline(true);
          setConnectionQuality(duration > 2000 ? 'poor' : 'good');
        } else {
          setIsOnline(false);
          setConnectionQuality('offline');
        }
      } catch (error) {
        setIsOnline(false);
        setConnectionQuality('offline');
      }
    };

    const interval = setInterval(testConnection, 10000);
    testConnection(); // Initial test

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Hide from UI but keep functionality
  if (hideFromUI) {
    return null;
  }

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    switch (connectionQuality) {
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-green-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    
    switch (connectionQuality) {
      case 'poor':
        return 'Poor Connection';
      case 'good':
        return 'Online';
      default:
        return 'Offline';
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-100 text-red-800 border-red-200';
    
    switch (connectionQuality) {
      case 'poor':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      
      {showDetails && !isOnline && lastOnlineTime && (
        <span className="text-xs opacity-75">
          Last online: {lastOnlineTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

// Global network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality('good');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionQuality };
};