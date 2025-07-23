// src/components/AutoSaveIndicator.tsx
import React from 'react';
import { 
  Save, 
  Check, 
  AlertCircle, 
  WifiOff, 
  Loader2,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SaveStatus } from '../hooks/useAutoSave'; // Import SaveStatus type

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  hasUnsavedChanges: boolean;
  className?: string;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved,
  error,
  hasUnsavedChanges,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Saving draft...',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      
      case 'saved':
        return {
          icon: <Check className="h-3 w-3" />,
          text: lastSaved ? `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}` : 'Saved',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: error || 'Unable to save',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline - will save when connected',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
      
      default:
        if (hasUnsavedChanges) {
          return {
            icon: <Clock className="h-3 w-3" />,
            text: 'Unsaved changes',
            bgColor: 'bg-gray-50',
            textColor: 'text-gray-600',
            borderColor: 'border-gray-200'
          };
        }
        return null;
    }
  };

  const config = getStatusConfig();
  
  if (!config) return null;

  return (
    <div 
      className={`
        fixed top-20 left-4 z-40 flex items-center space-x-2 px-3 py-2 
        rounded-lg border backdrop-blur-sm shadow-sm transition-all duration-300
        ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label={config.text}
    >
      {config.icon}
      <span className="text-xs font-medium whitespace-nowrap">
        {config.text}
      </span>
    </div>
  );
};
