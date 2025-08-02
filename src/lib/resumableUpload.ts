import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask,
} from "firebase/storage";
import { storage } from "./firebase";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  state: "running" | "paused" | "success" | "error" | "canceled";
}

export interface UploadContext {
  type: "article" | "profile" | "attachment" | "cover";
  articleId?: string; // For article-related uploads
  targetField?: string; // Which field to update (coverImage, content, etc.)
  pageUrl?: string; // Original page URL for navigation back
  autoSave?: boolean; // Whether to auto-save when upload completes
  metadata?: Record<string, any>; // Additional context data
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
  state: "running" | "paused" | "success" | "error" | "canceled";
  error?: string;
  downloadURL?: string;
  uploadTask?: UploadTask;
  // Add fields for proper resumption
  uploadSessionUrl?: string;
  fileData?: ArrayBuffer; // Store file data for resumption
  fileType?: string;
  fileLastModified?: number;
  // Add context for cross-page upload handling
  context?: UploadContext;
  completedAt?: number; // Timestamp when upload completed
  needsProcessing?: boolean; // Whether upload needs post-processing
}

export interface ResumableUploadResult {
  url: string;
  path: string;
  name: string;
  originalName: string; // Preserve original filename
  size: number;
  type: string;
  uploadId: string;
}

class ResumableUploadManager {
  private static instance: ResumableUploadManager;
  private uploads: Map<string, UploadMetadata> = new Map();
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> =
    new Map();
  private completionCallbacks: Map<
    string,
    (result: ResumableUploadResult | Error) => void
  > = new Map();
  private isOnline: boolean = navigator.onLine;
  private readonly STORAGE_KEY = "infonest_uploads";
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
    // Clear localStorage on startup to prevent quota issues
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData && storedData.length > 2 * 1024 * 1024) {
        // 2MB threshold
        console.warn("Clearing large upload data from localStorage");
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Clearing corrupted upload data from localStorage");
      localStorage.removeItem(this.STORAGE_KEY);
    }

    this.isOnline = navigator.onLine;

    this.setupNetworkListeners();
    this.loadPersistedUploads();
    this.startUploadProcessor();
  }

  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      // Auto-resume paused uploads when connection is restored
      this.uploads.forEach((upload, uploadId) => {
        if (upload.state === "paused" && upload.uploadTask) {
          this.resumeUpload(uploadId);
        }
      });
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      // Auto-pause running uploads when connection is lost
      this.uploads.forEach((upload, uploadId) => {
        if (upload.state === "running") {
          this.pauseUpload(uploadId);
        }
      });
    });

    // Additional connectivity check using fetch - faster polling for real-time behavior
    setInterval(() => {
      this.checkConnectivity();
    }, 2000); // Check every 2 seconds for more responsive behavior
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch("/favicon.ico", {
        method: "HEAD",
        cache: "no-cache",
      });
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;

      if (!wasOnline && this.isOnline) {
        // Connection restored - resume paused uploads
        console.log("🌐 Connection restored, resuming paused uploads...");
        this.uploads.forEach((upload, uploadId) => {
          if (upload.state === "paused") {
            console.log(
              `📤 Resuming upload: ${upload.fileName} (${upload.bytesTransferred}/${upload.totalBytes} bytes)`
            );
            this.resumeUpload(uploadId);
          }
        });
      } else if (wasOnline && !this.isOnline) {
        // Connection lost - pause running uploads
        console.log("🔌 Connection lost, pausing running uploads...");
        this.uploads.forEach((upload, uploadId) => {
          if (upload.state === "running") {
            console.log(
              `⏸️ Pausing upload: ${upload.fileName} (${upload.bytesTransferred}/${upload.totalBytes} bytes)`
            );
            this.pauseUpload(uploadId);
          }
        });
      }
    } catch (error) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      if (wasOnline) {
        // Connection lost - pause running uploads
        this.uploads.forEach((upload, uploadId) => {
          if (upload.state === "running") this.pauseUpload(uploadId);
        });
      }
    }
  }

  private loadPersistedUploads(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const persistedUploads: any[] = JSON.parse(stored);
        persistedUploads.forEach((upload) => {
          if (upload.state === "running" || upload.state === "paused") {
            // Reset to paused state for manual resume
            upload.state = "paused";

            // Restore file data from base64
            if (upload.fileData && upload.fileType && upload.fileName) {
              try {
                const arrayBuffer = this.base64ToArrayBuffer(upload.fileData);
                const file = new File([arrayBuffer], upload.fileName, {
                  type: upload.fileType,
                  lastModified: upload.fileLastModified || Date.now(),
                });
                upload.file = file;
                upload.fileData = arrayBuffer; // Keep as ArrayBuffer in memory
              } catch (fileError) {
                console.error(
                  "Failed to restore file for upload:",
                  upload.id,
                  fileError
                );
                return; // Skip this upload if file restoration fails
              }
            } else {
              console.warn("Upload missing file data, skipping:", upload.id);
              return; // Skip uploads without file data
            }

            this.uploads.set(upload.id, upload);

            // Add to queue for potential resumption
            if (upload.state === "paused") {
              this.uploadQueue.push(upload.id);
            }
          }
        });
      }
    } catch (error) {
      console.error("Failed to load persisted uploads:", error);
    }
  }

  private persistUploads(): void {
    try {
      // Only persist essential data to avoid localStorage quota issues
      const uploadsArray = Array.from(this.uploads.values()).map((upload) => ({
        id: upload.id,
        fileName: upload.fileName,
        filePath: upload.filePath,
        userId: upload.userId,
        folder: upload.folder,
        startTime: upload.startTime,
        lastProgressTime: upload.lastProgressTime,
        bytesTransferred: upload.bytesTransferred,
        totalBytes: upload.totalBytes,
        state: upload.state,
        fileType: upload.fileType,
        fileLastModified: upload.fileLastModified,
        context: upload.context,
        needsProcessing: upload.needsProcessing,
        // Don't persist fileData to save space - will be re-read from file if needed
        uploadTask: undefined,
        file: undefined,
        fileData: undefined,
      }));

      // Check if data is too large for localStorage
      const dataString = JSON.stringify(uploadsArray);
      if (dataString.length > 4 * 1024 * 1024) {
        // 4MB limit
        console.warn(
          "Upload data too large for localStorage, clearing old uploads"
        );
        this.clearCompletedUploads();
        return;
      }

      localStorage.setItem(this.STORAGE_KEY, dataString);
    } catch (error) {
      console.error("Failed to persist uploads:", error);
      // Clear storage and try again with just active uploads
      try {
        this.clearCompletedUploads();
        const activeUploads = Array.from(this.uploads.values())
          .filter(
            (upload) =>
              upload.state === "uploading" || upload.state === "paused"
          )
          .map((upload) => ({
            id: upload.id,
            fileName: upload.fileName,
            filePath: upload.filePath,
            userId: upload.userId,
            folder: upload.folder,
            startTime: upload.startTime,
            lastProgressTime: upload.lastProgressTime,
            bytesTransferred: upload.bytesTransferred,
            totalBytes: upload.totalBytes,
            state: upload.state,
            fileType: upload.fileType,
            fileLastModified: upload.fileLastModified,
            context: upload.context,
            needsProcessing: upload.needsProcessing,
          }));

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeUploads));
      } catch (retryError) {
        console.error("Failed to persist even active uploads:", retryError);
        // Clear all localStorage data for uploads
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  private clearCompletedUploads(): void {
    const completedStates = ["completed", "failed", "cancelled"];
    for (const [id, upload] of this.uploads.entries()) {
      if (completedStates.includes(upload.state)) {
        this.uploads.delete(id);
      }
    }
    console.log("Cleared completed uploads to free localStorage space");
  }

  private startUploadProcessor(): void {
    setInterval(() => {
      this.processUploadQueue();
    }, 1000);
  }

  private processUploadQueue(): void {
    if (!this.isOnline) {
      return;
    }

    while (
      this.activeUploads.size < this.MAX_CONCURRENT_UPLOADS &&
      this.uploadQueue.length > 0
    ) {
      const uploadId = this.uploadQueue.shift();
      if (uploadId && this.uploads.has(uploadId)) {
        this.startUpload(uploadId);
      }
    }
  }

  public async addUpload(
    file: File,
    userId: string,
    folder: string = "articles",
    onProgress?: (progress: UploadProgress) => void,
    onComplete?: (result: ResumableUploadResult | Error) => void,
    context?: UploadContext
  ): Promise<string> {
    const uploadId = this.generateUploadId();
    const articleId = context?.articleId;

    let fileName: string;
    let filePath: string;

    try {
      const generatedPath = this.generateFileName(
        file.name,
        userId,
        articleId,
        folder
      );
      fileName = generatedPath.split("/").pop() || file.name; // Extract just the filename

      // For articles without articleId, use temp folder instead of articles folder
      if (folder === "articles" && !articleId) {
        filePath = `temp/${generatedPath}`; // Use temp folder for temporary uploads
      } else {
        filePath = `${folder}/${generatedPath}`; // Full path with folder prefix
      }
    } catch (error) {
      console.error(`Error generating filename:`, error);
      throw error;
    }

    // Convert file to ArrayBuffer for persistence
    const fileData = await file.arrayBuffer();

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
      state: "paused",
      // Store file data for resumption
      fileData,
      fileType: file.type,
      fileLastModified: file.lastModified,
      // Store context for cross-page handling
      context: context || {
        type: "attachment",
        pageUrl: window.location.href,
        autoSave: false,
      },
      needsProcessing: false,
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
      console.error("Upload not found or file missing");
      return;
    }

    if (!this.isOnline) {
      upload.state = "paused";
      return;
    }

    // If upload task already exists and is paused, resume it instead
    if (upload.uploadTask && upload.state === "paused") {
      this.resumeUpload(uploadId);
      return;
    }

    this.activeUploads.add(uploadId);
    upload.state = "running";

    // Don't reset start time if this is a resumed upload
    if (upload.bytesTransferred === 0) {
      upload.startTime = Date.now();
    }
    upload.lastProgressTime = Date.now();

    try {
      console.log(
        `🚀 Starting upload: ${upload.fileName} → ${upload.filePath}`
      );

      const storageRef = ref(storage, upload.filePath);

      // Create new upload task only if one doesn't exist
      const uploadTask = uploadBytesResumable(storageRef, upload.file);
      upload.uploadTask = uploadTask;

      // Store upload session URL for better tracking
      upload.uploadSessionUrl = uploadTask.snapshot.ref.fullPath;

      uploadTask.on(
        "state_changed",
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
      percentage: Math.round(
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      ),
      speed,
      estimatedTimeRemaining,
      state: upload.state,
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

    console.error(`❌ Upload error for ${upload.filePath}:`, error);
    console.error(`📋 Upload details:`, {
      fileName: upload.fileName,
      filePath: upload.filePath,
      userId: upload.userId,
      articleId: upload.context?.articleId,
      bytesTransferred: upload.bytesTransferred,
      totalBytes: upload.totalBytes,
    });

    upload.state = "error";
    upload.error = error.message;
    this.activeUploads.delete(uploadId);

    // Check if it's a network error that can be retried
    if (this.isRetryableError(error)) {
      upload.state = "paused";

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

  private async handleUploadComplete(
    uploadId: string,
    uploadTask: UploadTask
  ): Promise<void> {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    try {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      upload.state = "success";
      upload.downloadURL = downloadURL;
      upload.completedAt = Date.now();
      this.activeUploads.delete(uploadId);

      const result: ResumableUploadResult = {
        url: downloadURL,
        path: upload.filePath,
        name: upload.filePath.split('/').pop() || upload.fileName, // Generated filename
        originalName: upload.fileName, // Original filename from user
        size: upload.totalBytes,
        type: upload.file?.type || "application/octet-stream",
        uploadId,
      };

      // Handle cross-page upload completion
      await this.handleCrossPageCompletion(upload, result);

      const callback = this.completionCallbacks.get(uploadId);
      if (callback) {
        callback(result);
      } else {
        // If no callback (user navigated away), mark for processing
        upload.needsProcessing = true;
        this.persistUploads();

        // Show global notification
        this.showGlobalNotification(upload, result);
      }

      // Clean up after successful upload (extended time for cross-page handling)
      setTimeout(() => {
        this.cleanupUpload(uploadId);
      }, 30000); // Keep for 30 seconds for cross-page processing
    } catch (error) {
      this.handleUploadError(uploadId, error as Error);
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      "network-request-failed",
      "timeout",
      "server-file-wrong-size",
      "unknown",
    ];

    return retryableErrors.some(
      (errorType) =>
        error.message.toLowerCase().includes(errorType) ||
        error.name.toLowerCase().includes(errorType)
    );
  }

  public pauseUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    if (upload.uploadTask && upload.state === "running") {
      console.log(
        `⏸️ Pausing upload: ${upload.fileName} at ${upload.bytesTransferred}/${upload.totalBytes} bytes`
      );
      upload.uploadTask.pause();
      upload.state = "paused";
      this.activeUploads.delete(uploadId);
      this.persistUploads(); // Save state immediately
    }
  }

  public resumeUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    if (upload.state === "paused" && this.isOnline) {
      // If we have an existing upload task, resume it directly
      if (upload.uploadTask) {
        try {
          console.log(
            `▶️ Resuming existing upload task: ${upload.fileName} from ${upload.bytesTransferred}/${upload.totalBytes} bytes`
          );
          upload.uploadTask.resume();
          upload.state = "running";
          this.activeUploads.add(uploadId);
          upload.lastProgressTime = Date.now();
          this.persistUploads();
          return;
        } catch (error) {
          console.error(
            "Failed to resume existing upload task:",
            uploadId,
            error
          );
          // Fall through to create new task
        }
      }

      // If no existing task or resume failed, create new upload task
      // Ensure file object exists for resumption
      if (!upload.file && upload.fileData) {
        try {
          upload.file = new File([upload.fileData], upload.fileName, {
            type: upload.fileType || "application/octet-stream",
            lastModified: upload.fileLastModified || Date.now(),
          });
        } catch (error) {
          console.error(
            "Failed to recreate file for upload resumption:",
            uploadId,
            error
          );
          return;
        }
      }

      // Add to queue for new task creation only if no existing task
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

    upload.state = "canceled";
    this.activeUploads.delete(uploadId);

    // Remove from queue
    const queueIndex = this.uploadQueue.indexOf(uploadId);
    if (queueIndex > -1) {
      this.uploadQueue.splice(queueIndex, 1);
    }

    this.cleanupUpload(uploadId);
  }

  public deleteCompletedUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    // Only allow deletion of completed, failed, or cancelled uploads
    if (!["completed", "failed", "canceled"].includes(upload.state)) {
      console.warn("Cannot delete active upload");
      return;
    }

    // Remove from uploads map
    this.uploads.delete(uploadId);

    // Persist changes
    this.persistUploads();

    console.log(`Deleted upload record: ${uploadId}`);
  }

  public getUploadStatus(uploadId: string): UploadMetadata | null {
    return this.uploads.get(uploadId) || null;
  }

  public getAllUploads(): UploadMetadata[] {
    return Array.from(this.uploads.values());
  }

  public getActiveUploads(): UploadMetadata[] {
    return Array.from(this.uploads.values()).filter(
      (upload) => upload.state === "running" || upload.state === "paused"
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
      ([_, upload]) => upload.state === "success" || upload.state === "error"
    );

    completedUploads.forEach(([uploadId, _]) => {
      this.cleanupUpload(uploadId);
    });
  }

  public removeUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      // Cancel if still running
      if (upload.state === "running" || upload.state === "paused") {
        this.cancelUpload(uploadId);
      }

      // Remove from uploads map
      this.uploads.delete(uploadId);

      // Persist changes
      this.persistUploads();

      console.log(`🗑️ Removed upload: ${uploadId}`);
    }
  }

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  private generateFileName(
    originalName: string,
    userId: string,
    articleId?: string,
    folder?: string
  ): string {
    const timestamp = Date.now();

    // Clean the original filename to make it URL-safe while preserving readability
    const cleanName = originalName
      .replace(/[<>:"/\\|?*]/g, '_') // Replace only truly problematic characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    const nameParts = cleanName.split('.');
    const extension = nameParts.pop() || '';
    const baseName = nameParts.join('.') || 'file';

    // For articles folder
    if (folder === "articles") {
      if (articleId) {
        // New structure: articles/{userId}/{articleId}/{originalName_timestamp.ext}
        return `${userId}/${articleId}/${baseName}_${timestamp}.${extension}`;
      } else {
        // For new articles without articleId, use temp structure (will be moved later)
        // This will be used with temp/ folder prefix
        return `${userId}/${baseName}_${timestamp}.${extension}`;
      }
    } else {
      // For profiles folder, use simple structure: {userId}/{originalName_timestamp.ext}
      return `${userId}/${baseName}_${timestamp}.${extension}`;
    }
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Helper methods for file data persistence
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public formatSpeed(bytesPerSecond: number): string {
    return `${this.formatFileSize(bytesPerSecond)}/s`;
  }

  public formatTime(seconds: number): string {
    if (seconds === Infinity || isNaN(seconds)) return "Unknown";

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

  // Handle cross-page upload completion
  private async handleCrossPageCompletion(
    upload: UploadMetadata,
    result: ResumableUploadResult
  ): Promise<void> {
    if (!upload.context) return;

    try {
      switch (upload.context.type) {
        case "article":
          await this.handleArticleUploadCompletion(upload, result);
          break;
        case "profile":
          await this.handleProfileUploadCompletion(upload, result);
          break;
        case "cover":
          await this.handleCoverImageCompletion(upload, result);
          break;
        default:
          // Generic attachment handling
          break;
      }
    } catch (error) {
      console.error("Error handling cross-page upload completion:", error);
    }
  }

  // Handle article-related upload completion
  private async handleArticleUploadCompletion(
    upload: UploadMetadata,
    result: ResumableUploadResult
  ): Promise<void> {
    const context = upload.context;
    if (!context?.articleId) return;

    try {
      // Import article functions dynamically to avoid circular dependencies
      const { updateArticle, getArticle } = await import("./articles");

      if (context.targetField === "coverImage") {
        // Get current article data before updating
        const currentArticle = await getArticle(context.articleId);
        const oldCoverImage = currentArticle?.coverImage;

        // Update article cover image
        await updateArticle(context.articleId, {
          coverImage: result.url,
        });

        // Clean up old cover image if it exists and is different
        if (oldCoverImage && oldCoverImage !== result.url) {
          try {
            const { deleteFile, extractFilePathFromUrl } = await import(
              "./fileUpload"
            );
            const oldFilePath = extractFilePathFromUrl(oldCoverImage);
            if (oldFilePath && oldFilePath.startsWith("articles/")) {
              await deleteFile(oldFilePath);
              console.log("✅ Deleted old cover image:", oldFilePath);
            }
          } catch (error) {
            console.error("⚠️ Failed to delete old cover image:", error);
            // Don't throw error - cover image update was successful
          }
        }
      } else if (context.autoSave) {
        // Auto-save article as draft with attachment
        const currentArticle = await getArticle(context.articleId);
        if (currentArticle) {
          const updatedAttachments = [
            ...(currentArticle.attachments || []),
            result.url,
          ];
          await updateArticle(context.articleId, {
            attachments: updatedAttachments,
            status: "draft",
          });
        }
      }
    } catch (error) {
      console.error("Error updating article with upload:", error);
    }
  }

  // Handle profile upload completion
  private async handleProfileUploadCompletion(
    upload: UploadMetadata,
    result: ResumableUploadResult
  ): Promise<void> {
    try {
      // Import Firestore functions dynamically
      const { doc, updateDoc, getDoc } = await import("firebase/firestore");
      const { firestore } = await import("./firebase");
      const { deleteFile, extractFilePathFromUrl } = await import(
        "./fileUpload"
      );

      const userRef = doc(firestore, "users", upload.userId);

      // Get current profile picture before updating
      const userDoc = await getDoc(userRef);
      const oldProfilePicture = userDoc.exists()
        ? userDoc.data()?.profilePicture
        : null;

      await updateDoc(userRef, {
        profilePicture: result.url,
        updatedAt: new Date(),
      });

      // Clean up old profile picture if it exists and is different
      if (oldProfilePicture && oldProfilePicture !== result.url) {
        try {
          const oldFilePath = extractFilePathFromUrl(oldProfilePicture);
          if (oldFilePath && oldFilePath.startsWith("profiles/")) {
            await deleteFile(oldFilePath);
            console.log("✅ Deleted old profile picture:", oldFilePath);
          }
        } catch (error) {
          console.error("⚠️ Failed to delete old profile picture:", error);
          // Don't throw error - profile update was successful
        }
      }
    } catch (error) {
      console.error("Error updating profile with upload:", error);
    }
  }

  // Handle cover image completion
  private async handleCoverImageCompletion(
    upload: UploadMetadata,
    result: ResumableUploadResult
  ): Promise<void> {
    // Store in localStorage for the page to pick up
    const coverImageData = {
      uploadId: upload.id,
      url: result.url,
      timestamp: Date.now(),
      context: upload.context,
    };

    localStorage.setItem(
      "completed_cover_upload",
      JSON.stringify(coverImageData)
    );

    // Dispatch custom event for real-time updates
    window.dispatchEvent(
      new CustomEvent("coverUploadCompleted", {
        detail: coverImageData,
      })
    );
  }

  // Show global notification for completed uploads
  private showGlobalNotification(
    upload: UploadMetadata,
    result: ResumableUploadResult
  ): void {
    // Create a global notification that persists across pages
    const notification = {
      id: upload.id,
      type: "upload_complete",
      title: "Upload Completed",
      message: `${upload.fileName} has been uploaded successfully`,
      url: result.url,
      context: upload.context,
      timestamp: Date.now(),
    };

    // Store in localStorage for global access
    const existingNotifications = JSON.parse(
      localStorage.getItem("upload_notifications") || "[]"
    );
    existingNotifications.push(notification);

    // Keep only last 10 notifications
    if (existingNotifications.length > 10) {
      existingNotifications.splice(0, existingNotifications.length - 10);
    }

    localStorage.setItem(
      "upload_notifications",
      JSON.stringify(existingNotifications)
    );

    // Dispatch global event
    window.dispatchEvent(
      new CustomEvent("globalUploadComplete", {
        detail: notification,
      })
    );

    // Show browser notification if permission granted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Upload Completed", {
        body: notification.message,
        icon: "/favicon.ico",
      });
    }
  }

  // Get completed uploads that need processing
  public getCompletedUploads(): UploadMetadata[] {
    return Array.from(this.uploads.values()).filter(
      (upload) => upload.state === "success" && upload.needsProcessing
    );
  }

  // Mark upload as processed
  public markAsProcessed(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      upload.needsProcessing = false;
      this.persistUploads();
    }
  }

  // Update pending uploads with article ID (for new articles)
  public async updatePendingUploadsWithArticleId(
    articleId: string
  ): Promise<void> {
    const tempUploads = Array.from(this.uploads.entries()).filter(
      ([_, upload]) =>
        !upload.context?.articleId &&
        upload.folder === "articles" &&
        upload.state === "success" &&
        upload.filePath.includes("temp_")
    );

    if (tempUploads.length === 0) {
      console.log("No temp uploads to reorganize");
      return;
    }

    console.log(
      `Moving ${tempUploads.length} temp files to organized structure`
    );

    for (const [uploadId, upload] of tempUploads) {
      try {
        // Generate new organized file path
        const newFileName = this.generateFileName(
          upload.fileName.replace(/^temp_\d+_[a-z0-9]+\./, "") ||
            upload.fileName,
          upload.userId,
          articleId,
          upload.folder
        );
        const newFilePath = `${upload.folder}/${newFileName}`;

        // Move file in Firebase Storage
        await this.moveFileInStorage(upload.filePath, newFilePath);

        // Update upload metadata
        upload.context = {
          ...upload.context,
          articleId: articleId,
        };
        upload.filePath = newFilePath;
        upload.needsProcessing = false;

        console.log(`✅ Moved: ${upload.filePath} → ${newFilePath}`);
      } catch (error) {
        console.error(`❌ Failed to move temp file ${upload.filePath}:`, error);
      }
    }

    this.persistUploads();
  }

  // Move file from one location to another in Firebase Storage
  private async moveFileInStorage(
    oldPath: string,
    newPath: string
  ): Promise<void> {
    try {
      const { ref, uploadBytes, getDownloadURL, deleteObject } = await import(
        "firebase/storage"
      );
      const { storage } = await import("./firebase");

      // Get the old file
      const oldRef = ref(storage, oldPath);
      const oldFile = await fetch(await getDownloadURL(oldRef));
      const fileBlob = await oldFile.blob();

      // Upload to new location
      const newRef = ref(storage, newPath);
      await uploadBytes(newRef, fileBlob);

      // Delete old file
      await deleteObject(oldRef);

      console.log(`📁 File moved: ${oldPath} → ${newPath}`);
    } catch (error) {
      console.error(
        `❌ Error moving file from ${oldPath} to ${newPath}:`,
        error
      );
      throw error;
    }
  }

  // Clean up temp files for a specific user (when article creation is cancelled)
  public async cleanupTempFiles(userId: string): Promise<void> {
    const tempUploads = Array.from(this.uploads.entries()).filter(
      ([_, upload]) =>
        upload.userId === userId &&
        upload.folder === "articles" &&
        upload.filePath.includes("temp_") &&
        !upload.context?.articleId
    );

    if (tempUploads.length === 0) {
      return;
    }

    console.log(
      `🧹 Cleaning up ${tempUploads.length} temp files for user ${userId}`
    );

    for (const [uploadId, upload] of tempUploads) {
      try {
        // Delete file from Firebase Storage
        const { ref, deleteObject } = await import("firebase/storage");
        const { storage } = await import("./firebase");

        const fileRef = ref(storage, upload.filePath);
        await deleteObject(fileRef);

        // Remove from upload manager
        this.uploads.delete(uploadId);

        console.log(`🗑️ Deleted temp file: ${upload.filePath}`);
      } catch (error) {
        console.error(
          `❌ Failed to delete temp file ${upload.filePath}:`,
          error
        );
      }
    }

    this.persistUploads();
  }

  // Clean up unused files by comparing with article content
  public async cleanupUnusedFiles(
    userId: string,
    articleId: string,
    articleContent: string,
    coverImage?: string,
    attachments?: string[]
  ): Promise<void> {
    const articleUploads = Array.from(this.uploads.entries()).filter(
      ([_, upload]) =>
        upload.userId === userId &&
        upload.context?.articleId === articleId &&
        upload.state === "success"
    );

    if (articleUploads.length === 0) {
      return;
    }

    const usedUrls = new Set<string>();

    // Add cover image URL
    if (coverImage) {
      usedUrls.add(coverImage);
    }

    // Add attachment URLs
    if (attachments) {
      attachments.forEach((url) => usedUrls.add(url));
    }

    // Extract image URLs from article content
    const contentImageUrls = this.extractImageUrlsFromContent(articleContent);
    contentImageUrls.forEach((url) => usedUrls.add(url));

    // Find unused uploads
    const unusedUploads = articleUploads.filter(
      ([_, upload]) => upload.downloadURL && !usedUrls.has(upload.downloadURL)
    );

    if (unusedUploads.length === 0) {
      return;
    }

    console.log(
      `🧹 Cleaning up ${unusedUploads.length} unused files for article ${articleId}`
    );

    for (const [uploadId, upload] of unusedUploads) {
      try {
        // Delete file from Firebase Storage
        const { ref, deleteObject } = await import("firebase/storage");
        const { storage } = await import("./firebase");

        const fileRef = ref(storage, upload.filePath);
        await deleteObject(fileRef);

        // Remove from upload manager
        this.uploads.delete(uploadId);

        console.log(`🗑️ Deleted unused file: ${upload.filePath}`);
      } catch (error) {
        console.error(
          `❌ Failed to delete unused file ${upload.filePath}:`,
          error
        );
      }
    }

    this.persistUploads();
  }

  // Extract image URLs from HTML content
  private extractImageUrlsFromContent(content: string): string[] {
    // For now, use a simple regex to extract image URLs
    // This avoids the require() issue in browser environment
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const urls: string[] = [];
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  }

  // Get upload notifications
  public getUploadNotifications(): any[] {
    return JSON.parse(localStorage.getItem("upload_notifications") || "[]");
  }

  // Clear upload notifications
  public clearUploadNotifications(): void {
    localStorage.removeItem("upload_notifications");
  }
}

export const resumableUploadManager = ResumableUploadManager.getInstance();
