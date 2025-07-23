// src/hooks/useAutoSave.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { updateArticle, createArticle } from '../lib/articles';
import { useAuth } from './useAuth';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AutoSaveOptions {
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface AutoSaveState {
  status: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  hasUnsavedChanges: boolean;
}

export const useAutoSave = (
  articleId: string | null,
  articleData: any,
  options: AutoSaveOptions = {}
) => {
  const { userProfile } = useAuth();
  const {
    debounceMs = 3000,
    maxRetries = 3,
    retryDelayMs = 2000
  } = options;

  const [saveState, setSaveState] = useState<AutoSaveState>({
    status: 'idle',
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const lastSavedDataRef = useRef<string>('');
  const isOnlineRef = useRef(navigator.onLine);

  // Initialize lastSavedDataRef.current on mount with the initial articleData
  // This prevents "Unsaved changes" immediately after loading an already saved article.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current && articleData && Object.keys(articleData).length > 0) {
      lastSavedDataRef.current = JSON.stringify(articleData);
      isInitialMount.current = false;
    }
  }, [articleData]); // Dependency on articleData to ensure it's available

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      if (saveState.status === 'offline' && saveState.hasUnsavedChanges) {
        triggerSave();
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setSaveState(prev => ({
        ...prev,
        status: 'offline',
        error: 'No internet connection'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [saveState.status, saveState.hasUnsavedChanges]);

  // Save function with retry logic
  const performSave = useCallback(async () => {
    if (!userProfile || !articleData) return;

    try {
      setSaveState(prev => ({ ...prev, status: 'saving', error: null }));

      const saveData = {
        ...articleData,
        status: 'draft', // Always save as draft for auto-save
        authorId: userProfile.uid,
        authorName: userProfile.displayName || userProfile.email,
      };

      // IMPORTANT: For new articles, createArticle returns the new ID.
      // We need to update the articleId ref if it's a new article being saved for the first time.
      let currentArticleId = articleId;
      if (!currentArticleId) {
        const newId = await createArticle(saveData);
        currentArticleId = newId; // Update the local variable for this save cycle
        // If you need to update the articleId prop in the parent component,
        // you'd need a callback from this hook, but for auto-save,
        // it's usually handled by the parent navigating to the new URL.
      } else {
        await updateArticle(currentArticleId, saveData);
      }

      const now = new Date();
      lastSavedDataRef.current = JSON.stringify(articleData); // This line updates the ref
      retryCountRef.current = 0;

      setSaveState({
        status: 'saved',
        lastSaved: now,
        error: null,
        hasUnsavedChanges: false // This should clear the unsaved changes flag
      });

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveState(prev => ({ ...prev, status: 'idle' }));
      }, 2000);

    } catch (error: any) { // Explicitly type error as any
      console.error('Auto-save error:', error);
      
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => {
          performSave();
        }, retryDelayMs * retryCountRef.current);
      } else {
        setSaveState(prev => ({
          ...prev,
          status: 'error',
          error: error.message || 'Unable to save - please check your connection'
        }));
        retryCountRef.current = 0;
      }
    }
  }, [userProfile, articleData, articleId, maxRetries, retryDelayMs]); // Added articleId to dependencies

  // Trigger save with debouncing
  const triggerSave = useCallback(() => {
    if (!isOnlineRef.current) {
      setSaveState(prev => ({
        ...prev,
        status: 'offline',
        error: 'No internet connection'
      }));
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [performSave, debounceMs]);

  // Check for changes and trigger auto-save
  useEffect(() => {
    if (!articleData || !userProfile) return;

    const currentDataString = JSON.stringify(articleData);
    const hasChanges = currentDataString !== lastSavedDataRef.current;

    if (hasChanges) {
      setSaveState(prev => ({ ...prev, hasUnsavedChanges: true }));
      triggerSave();
    }
  }, [articleData, userProfile, triggerSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState.hasUnsavedChanges]);

  return {
    saveState,
    triggerSave: () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      performSave();
    }
  };
};
