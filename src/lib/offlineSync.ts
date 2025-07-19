import { resumableUploadManager } from "./resumableUpload";

interface OfflineAction {
  id: string;
  type: 'upload' | 'article_save' | 'article_publish';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private pendingActions: Map<string, OfflineAction> = new Map();
  private readonly STORAGE_KEY = 'infonest_offline_actions';
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;

  static getInstance(): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager();
    }
    return OfflineSyncManager.instance;
  }

  constructor() {
    this.loadPendingActions();
    this.setupNetworkListeners();
    this.startSyncProcessor();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🔄 Network restored, starting offline sync');
      this.processPendingActions();
    });
  }

  private loadPendingActions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const actions: OfflineAction[] = JSON.parse(stored);
        actions.forEach(action => {
          this.pendingActions.set(action.id, action);
        });
        console.log(`📦 Loaded ${actions.length} pending offline actions`);
      }
    } catch (error) {
      console.error('❌ Failed to load pending actions:', error);
    }
  }

  private persistActions(): void {
    try {
      const actionsArray = Array.from(this.pendingActions.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actionsArray));
    } catch (error) {
      console.error('❌ Failed to persist offline actions:', error);
    }
  }

  private startSyncProcessor(): void {
    setInterval(() => {
      if (navigator.onLine && !this.isProcessing) {
        this.processPendingActions();
      }
    }, 30000); // Check every 30 seconds
  }

  public addAction(type: OfflineAction['type'], data: any): string {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const action: OfflineAction = {
      id: actionId,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.pendingActions.set(actionId, action);
    this.persistActions();

    console.log(`📝 Added offline action: ${type} (${actionId})`);
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processPendingActions();
    }

    return actionId;
  }

  private async processPendingActions(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;
    console.log('🔄 Processing pending offline actions');

    const actions = Array.from(this.pendingActions.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const action of actions) {
      try {
        await this.processAction(action);
        this.pendingActions.delete(action.id);
        console.log(`✅ Processed offline action: ${action.type} (${action.id})`);
      } catch (error) {
        console.error(`❌ Failed to process action ${action.id}:`, error);
        
        action.retryCount++;
        if (action.retryCount >= this.MAX_RETRIES) {
          console.error(`❌ Max retries reached for action ${action.id}, removing`);
          this.pendingActions.delete(action.id);
        }
      }
    }

    this.persistActions();
    this.isProcessing = false;
  }

  private async processAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'upload':
        await this.processUploadAction(action);
        break;
      case 'article_save':
        await this.processArticleSaveAction(action);
        break;
      case 'article_publish':
        await this.processArticlePublishAction(action);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  private async processUploadAction(action: OfflineAction): Promise<void> {
    // Resume upload using resumable upload manager
    const { uploadId } = action.data;
    if (uploadId) {
      resumableUploadManager.resumeUpload(uploadId);
    }
  }

  private async processArticleSaveAction(action: OfflineAction): Promise<void> {
    // Implement article save logic
    const { articleData } = action.data;
    // This would integrate with your article save API
    console.log('Processing article save:', articleData);
  }

  private async processArticlePublishAction(action: OfflineAction): Promise<void> {
    // Implement article publish logic
    const { articleId } = action.data;
    // This would integrate with your article publish API
    console.log('Processing article publish:', articleId);
  }

  public getPendingActionsCount(): number {
    return this.pendingActions.size;
  }

  public getPendingActions(): OfflineAction[] {
    return Array.from(this.pendingActions.values());
  }

  public clearCompletedActions(): void {
    this.pendingActions.clear();
    this.persistActions();
    console.log('🧹 Cleared all pending actions');
  }
}

export const offlineSyncManager = OfflineSyncManager.getInstance();