// src/utils/draftStorage.ts
/**
 * Draft storage utilities for managing auto-saved drafts
 */

interface DraftMetadata {
  title: string;
  content: string;
  excerpt?: string;
  categories: string[];
  tags: string[];
  coverImage?: string;
  lastModified: Date;
  deviceInfo: string;
  userAgent: string;
  articleId?: string;
}

class DraftStorageManager {
  private static instance: DraftStorageManager;
  private readonly STORAGE_PREFIX = 'autosave_draft_';
  private readonly MAX_DRAFTS = 10;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): DraftStorageManager {
    if (!DraftStorageManager.instance) {
      DraftStorageManager.instance = new DraftStorageManager();
    }
    return DraftStorageManager.instance;
  }

  constructor() {
    this.setupPeriodicCleanup();
  }

  /**
   * Save draft to localStorage with metadata
   */
  saveDraft(articleId: string | null, data: Partial<DraftMetadata>): void {
    try {
      const draftId = articleId || `new_${Date.now()}`;
      const key = `${this.STORAGE_PREFIX}${draftId}`;
      
      const draftData: DraftMetadata = {
        title: data.title || '',
        content: data.content || '',
        excerpt: data.excerpt,
        categories: data.categories || [],
        tags: data.tags || [],
        coverImage: data.coverImage,
        lastModified: new Date(),
        deviceInfo: this.getDeviceInfo(),
        userAgent: navigator.userAgent,
        articleId: articleId || undefined,
        ...data
      };

      localStorage.setItem(key, JSON.stringify(draftData));
      this.cleanupOldDrafts();
    } catch (error) {
      console.error('Failed to save draft:', error);
      // If localStorage is full, try to clean up and retry
      this.cleanupOldDrafts();
      try {
        const key = `${this.STORAGE_PREFIX}${articleId || `new_${Date.now()}`}`;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (retryError) {
        console.error('Failed to save draft after cleanup:', retryError);
      }
    }
  }

  /**
   * Load draft from localStorage
   */
  loadDraft(articleId: string): DraftMetadata | null {
    try {
      const key = `${this.STORAGE_PREFIX}${articleId}`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          lastModified: new Date(parsed.lastModified)
        };
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  }

  /**
   * Get all available drafts
   */
  getAllDrafts(): Array<DraftMetadata & { id: string }> {
    const drafts: Array<DraftMetadata & { id: string }> = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              drafts.push({
                ...parsed,
                id: key.replace(this.STORAGE_PREFIX, ''),
                lastModified: new Date(parsed.lastModified)
              });
            } catch (parseError) {
              console.error('Failed to parse draft:', parseError);
              // Remove corrupted draft
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get all drafts:', error);
    }

    // Sort by last modified (newest first)
    return drafts.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  /**
   * Delete a specific draft
   */
  deleteDraft(articleId: string): void {
    try {
      const key = `${this.STORAGE_PREFIX}${articleId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }

  /**
   * Clear all drafts
   */
  clearAllDrafts(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear all drafts:', error);
    }
  }

  /**
   * Clean up old drafts (older than 7 days) and excess drafts
   */
  private cleanupOldDrafts(): void {
    try {
      const drafts = this.getAllDrafts();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Remove drafts older than 7 days
      drafts.forEach(draft => {
        if (draft.lastModified < sevenDaysAgo) {
          this.deleteDraft(draft.id);
        }
      });

      // Keep only the most recent drafts if we exceed the limit
      const recentDrafts = drafts.filter(draft => draft.lastModified >= sevenDaysAgo);
      if (recentDrafts.length > this.MAX_DRAFTS) {
        const draftsToRemove = recentDrafts.slice(this.MAX_DRAFTS);
        draftsToRemove.forEach(draft => this.deleteDraft(draft.id));
      }
    } catch (error) {
      console.error('Failed to cleanup old drafts:', error);
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldDrafts();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Get device information for draft metadata
   */
  private getDeviceInfo(): string {
    const platform = navigator.platform || 'Unknown';
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const browser = this.getBrowserName();
    
    return `${browser} on ${platform}${isMobile ? ' (Mobile)' : ''}`;
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown Browser';
  }

  /**
   * Check if draft exists for article
   */
  hasDraft(articleId: string): boolean {
    const key = `${this.STORAGE_PREFIX}${articleId}`;
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Estimate available space (most browsers limit localStorage to ~5-10MB)
      const estimated = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / estimated) * 100;

      return {
        used,
        available: estimated - used,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }
}

export const draftStorage = DraftStorageManager.getInstance();
