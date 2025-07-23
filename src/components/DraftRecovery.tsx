// src/components/DraftRecovery.tsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DraftData {
  id: string;
  title: string;
  content: string;
  lastModified: Date;
  deviceInfo: string;
}

interface DraftRecoveryProps {
  onRecover: (draft: DraftData) => void;
  onDismiss: () => void;
  currentArticleId?: string;
}

export const DraftRecovery: React.FC<DraftRecoveryProps> = ({
  onRecover,
  onDismiss,
  currentArticleId
}) => {
  const [availableDrafts, setAvailableDrafts] = useState<DraftData[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for available drafts in localStorage
    const checkForDrafts = () => {
      try {
        const drafts: DraftData[] = [];
        
        // Check for auto-saved drafts
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('autosave_draft_')) {
            const draftData = localStorage.getItem(key);
            if (draftData) {
              try {
                const parsed = JSON.parse(draftData);
                if (parsed.lastModified && parsed.title && parsed.content) {
                  drafts.push({
                    ...parsed,
                    lastModified: new Date(parsed.lastModified),
                    id: key.replace('autosave_draft_', '')
                  });
                }
              } catch (error) {
                console.error('Error parsing draft:', error);
              }
            }
          }
        }

        // Filter out current article drafts and old drafts (older than 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const validDrafts = drafts.filter(draft => {
          const isNotCurrent = !currentArticleId || draft.id !== currentArticleId;
          const isRecent = draft.lastModified > sevenDaysAgo;
          const hasContent = draft.content.trim().length > 50; // Minimum content threshold
          return isNotCurrent && isRecent && hasContent;
        });

        // Sort by last modified (newest first)
        validDrafts.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

        setAvailableDrafts(validDrafts.slice(0, 3)); // Show max 3 drafts
        setIsVisible(validDrafts.length > 0);
      } catch (error) {
        console.error('Error checking for drafts:', error);
      }
    };

    // Check on mount and when storage changes
    checkForDrafts();
    window.addEventListener('storage', checkForDrafts);

    return () => {
      window.removeEventListener('storage', checkForDrafts);
    };
  }, [currentArticleId]);

  const handleRecover = (draft: DraftData) => {
    onRecover(draft);
    // Remove the recovered draft from localStorage
    localStorage.removeItem(`autosave_draft_${draft.id}`);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const clearAllDrafts = () => {
    availableDrafts.forEach(draft => {
      localStorage.removeItem(`autosave_draft_${draft.id}`);
    });
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible || availableDrafts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Unsaved Drafts Found
                </h2>
                <p className="text-amber-100 text-sm">
                  We found {availableDrafts.length} unsaved draft{availableDrafts.length !== 1 ? 's' : ''} from previous sessions
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Draft List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {availableDrafts.map((draft, index) => (
              <div
                key={draft.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {draft.title || 'Untitled Draft'}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(draft.lastModified, { addSuffix: true })}
                        </span>
                      </div>
                      <span>•</span>
                      <span>{draft.deviceInfo || 'Unknown device'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRecover(draft)}
                    className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Recover</span>
                  </button>
                </div>

                {/* Content Preview */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {draft.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={clearAllDrafts}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear all drafts
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Continue without recovering
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
