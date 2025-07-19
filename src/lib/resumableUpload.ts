import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import { storage } from "./firebase";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
}

export interface UploadMetadata {
  id: string;
  file: File;
  fileName: string;
  filePath: string;
  userId: string;
  folder: string;
  startTime: number;
  lastProgressTime: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'error' | 'canceled';
  error?: string;
  downloadURL?: string;
  uploadTask?: UploadTask;
}

export interface ResumableUploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
  uploadId: string;
}

class ResumableUploadManager {
  private static instance: ResumableUploadManager;
  private uploads: Map<string, UploadMetadata> = new Map();
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();
  private completionCallbacks: Map<string, (result: ResumableUploadResult | Error) => void> = new Map();
  private isOnline: boolean = navigator.onLine;
  private readonly STORAGE_KEY = 'infonest_uploads';
  private readonly MAX_CONCURRENT_UPLOADS = 3;
  private uploadQueue: string[] = [];
  private activeUploads: Set<string> = new Set();

  static getInstance(): ResumableUploadManager {
    if (!ResumableUploadManager.instance) {
      ResumableUploadManager.instance = new ResumableUploadManager();
    }
    return ResumableUploadManager.instance;
  }

  constructor() {
    this.setupNetworkListeners();
    this.loadPersistedUploads();
    this.startUploadProcessor();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      // Auto-resume paused uploads when connection is restored
      this.uploads.forEach((upload, uploadId) => {
        if (upload.state === 'paused' && upload.uploadTask) {
          this.resumeUpload(uploadId);
        }
      });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      // Auto-pause running uploads when connection is lost
      this.uploads.forEach((upload, uploadId) => {
        if (upload.state === 'running') {
          this.pauseUpload(uploadId);
        }
      });
    });

    // Additional connectivity check using fetch
    setInterval(() => {
      this.checkConnectivity();
    }, 5000);
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      if (!wasOnline && this.isOnline) {
        // Connection restored - resume paused uploads
        this.uploads.forEach((upload, uploadId) => {
          if (upload.state === 'paused') this.resumeUpload(uploadId);
        });
      } else if (wasOnline && !this.isOnline) {
        // Connection lost - pause running uploads
        this.uploads.forEach((upload, uploadId) => {
          if (upload.state === 'running') this.pauseUpload(uploadId);
        });
      }
    } catch (error) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      if (wasOnline) {
        // Connection lost - pause running uploads
        this.uploads.forEach((upload, uploadId) => {
          if (upload.state === 'running') this.pauseUpload(uploadId);
        });
      }
    }
  }

  private loadPersistedUploads(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const persistedUploads: UploadMetadata[] = JSON.parse(stored);
        persistedUploads.forEach(upload => {
          if (upload.state === 'running' || upload.state === 'paused') {
            // Reset to paused state for manual resume
            upload.state = 'paused';
            this.uploads.set(upload.id, upload);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load persisted uploads:', error);
    }
  }

  private persistUploads(): void {
    try {
      const uploadsArray = Array.from(this.uploads.values()).map(upload => ({
        ...upload,
        uploadTask: undefined, // Don't persist Firebase task
        file: undefined // Don't persist File object
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(uploadsArray));
    } catch (error) {
      console.error('Failed to persist uploads:', error);
    }
  }

  private startUploadProcessor(): void {
    setInterval(() => {
      this.processUploadQueue();
    }, 1000);
  }

  private processUploadQueue(): void {
    if (!this.isOnline) return;

    while (this.activeUploads.size < this.MAX_CONCURRENT_UPLOADS && this.uploadQueue.length > 0) {
      const uploadId = this.uploadQueue.shift();
      if (uploadId && this.uploads.has(uploadId)) {
        this.startUpload(uploadId);
      }
    }
  }

  public async addUpload(
    file: File,
    userId: string,
    folder: string = 'articles',
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (result: ResumableUploadResult | Error) => void
  ): Promise<string> {
    const uploadId = this.generateUploadId();
    const fileName = this.generateFileName(file.name, userId);
    const filePath = `${folder}/${fileName}`;

    const uploadMetadata: UploadMetadata = {
      id: uploadId,
      file,
      fileName: file.name,
      filePath,
      userId,
      folder,
      startTime: Date.now(),
      lastProgressTime: Date.now(),
      bytesTransferred: 0,
      totalBytes: file.size,
      state: 'paused'
    };

    this.uploads.set(uploadId, uploadMetadata);
    
    if (onProgress) {
      this.progressCallbacks.set(uploadId, onProgress);
    }
    
    if (onComplete) {
      this.completionCallbacks.set(uploadId, onComplete);
    }

    // Add to queue for processing
    this.uploadQueue.push(uploadId);
    this.persistUploads();

    return uploadId;
  }

  private async startUpload(uploadId: string): Promise<void> {
    const upload = this.uploads.get(uploadId);
    if (!upload || !upload.file) {
      console.error('Upload not found or file missing');
      return;
    }

    if (!this.isOnline) {
      upload.state = 'paused';
      return;
    }

    this.activeUploads.add(uploadId);
    upload.state = 'running';
    upload.startTime = Date.now();
    upload.lastProgressTime = Date.now();

    try {
      const storageRef = ref(storage, upload.filePath);
      const uploadTask = uploadBytesResumable(storageRef, upload.file);
      upload.uploadTask = uploadTask;

      uploadTask.on('state_changed',
        (snapshot) => {
          this.handleUploadProgress(uploadId, snapshot);
        },
        (error) => {
          this.handleUploadError(uploadId, error);
        },
        async () => {
          await this.handleUploadComplete(uploadId, uploadTask);
        }
      );

      this.persistUploads();
    } catch (error) {
      this.handleUploadError(uploadId, error as Error);
    }
  }

  private handleUploadProgress(uploadId: string, snapshot: any): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    const now = Date.now();
    const timeDiff = (now - upload.lastProgressTime) / 1000; // seconds
    const bytesDiff = snapshot.bytesTransferred - upload.bytesTransferred;
    
    upload.bytesTransferred = snapshot.bytesTransferred;
    upload.lastProgressTime = now;

    // Calculate speed (bytes per second)
    const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
    
    // Calculate estimated time remaining
    const remainingBytes = upload.totalBytes - upload.bytesTransferred;
    const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;

    const progress: UploadProgress = {
      bytesTransferred: snapshot.bytesTransferred,
      totalBytes: snapshot.totalBytes,
      percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      speed,
      estimatedTimeRemaining,
      state: upload.state
    };

    const callback = this.progressCallbacks.get(uploadId);
    if (callback) {
      callback(progress);
    }

    // Persist progress periodically (every 5% or 10 seconds)
    if (progress.percentage % 5 === 0 || timeDiff > 10) {
      this.persistUploads();
    }
  }

  private handleUploadError(uploadId: string, error: Error): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    console.error('Upload error:', error);
    
    upload.state = 'error';
    upload.error = error.message;
    this.activeUploads.delete(uploadId);

    // Check if it's a network error that can be retried
    if (this.isRetryableError(error)) {
      upload.state = 'paused';
      
      // Add back to queue for retry
      if (!this.uploadQueue.includes(uploadId)) {
        this.uploadQueue.push(uploadId);
      }
    } else {
      // Permanent error
      const callback = this.completionCallbacks.get(uploadId);
      if (callback) {
        callback(error);
      }
      this.cleanupUpload(uploadId);
    }

    this.persistUploads();
  }

  private async handleUploadComplete(uploadId: string, uploadTask: UploadTask): Promise<void> {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    try {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      
      upload.state = 'success';
      upload.downloadURL = downloadURL;
      this.activeUploads.delete(uploadId);

      const result: ResumableUploadResult = {
        url: downloadURL,
        path: upload.filePath,
        name: upload.fileName,
        size: upload.totalBytes,
        type: upload.file?.type || 'application/octet-stream',
        uploadId
      };

      const callback = this.completionCallbacks.get(uploadId);
      if (callback) {
        callback(result);
      }

      
      // Clean up after successful upload
      setTimeout(() => {
        this.cleanupUpload(uploadId);
      }, 5000); // Keep for 5 seconds for UI updates

    } catch (error) {
      this.handleUploadError(uploadId, error as Error);
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'network-request-failed',
      'timeout',
      'server-file-wrong-size',
      'unknown'
    ];
    
    return retryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType) ||
      error.name.toLowerCase().includes(errorType)
    );
  }

  public pauseUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    if (upload.uploadTask && upload.state === 'running') {
      upload.uploadTask.pause();
      upload.state = 'paused';
      this.activeUploads.delete(uploadId);
      this.persistUploads(); // Save state immediately
    }
  }

  public resumeUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    if (upload.state === 'paused' && this.isOnline) {
        if (!this.uploadQueue.includes(uploadId)) {
          this.uploadQueue.push(uploadId);
        }
        this.persistUploads(); // Save state immediately
    }
  }

  public cancelUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    if (upload.uploadTask) {
      upload.uploadTask.cancel();
    }

    upload.state = 'canceled';
    this.activeUploads.delete(uploadId);
    
    // Remove from queue
    const queueIndex = this.uploadQueue.indexOf(uploadId);
    if (queueIndex > -1) {
      this.uploadQueue.splice(queueIndex, 1);
    }

    this.cleanupUpload(uploadId);
  }

  public getUploadStatus(uploadId: string): UploadMetadata | null {
    return this.uploads.get(uploadId) || null;
  }

  public getAllUploads(): UploadMetadata[] {
    return Array.from(this.uploads.values());
  }

  public getActiveUploads(): UploadMetadata[] {
    return Array.from(this.uploads.values()).filter(
      upload => upload.state === 'running' || upload.state === 'paused'
    );
  }

  private cleanupUpload(uploadId: string): void {
    this.uploads.delete(uploadId);
    this.progressCallbacks.delete(uploadId);
    this.completionCallbacks.delete(uploadId);
    this.activeUploads.delete(uploadId);
    
    // Remove from queue
    const queueIndex = this.uploadQueue.indexOf(uploadId);
    if (queueIndex > -1) {
      this.uploadQueue.splice(queueIndex, 1);
    }
    
    this.persistUploads();
  }

  public cleanupCompletedUploads(): void {
    const completedUploads = Array.from(this.uploads.entries()).filter(
      ([_, upload]) => upload.state === 'success' || upload.state === 'error'
    );

    completedUploads.forEach(([uploadId, _]) => {
      this.cleanupUpload(uploadId);
    });

  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateFileName(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${userId}/${timestamp}_${randomString}.${extension}`;
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public formatSpeed(bytesPerSecond: number): string {
    return `${this.formatFileSize(bytesPerSecond)}/s`;
  }

  public formatTime(seconds: number): string {
    if (seconds === Infinity || isNaN(seconds)) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

export const resumableUploadManager = ResumableUploadManager.getInstance();