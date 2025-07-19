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
      const uploadsArray = Array.from(this.uploads.values()).map((upload) => ({
        ...upload,
        uploadTask: undefined, // Don't persist Firebase task
        file: undefined, // Don't persist File object
        // Convert ArrayBuffer to base64 for storage
        fileData: upload.fileData
          ? this.arrayBufferToBase64(upload.fileData)
          : undefined,
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(uploadsArray));
    } catch (error) {
      console.error("Failed to persist uploads:", error);
    }
  }

  private startUploadProcessor(): void {
    setInterval(() => {
      this.processUploadQueue();
    }, 1000);
  }

  private processUploadQueue(): void {
    if (!this.isOnline) return;

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
    const fileName = this.generateFileName(file.name, userId);
    const filePath = `${folder}/${fileName}`;

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

    console.error("Upload error:", error);

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
        name: upload.fileName,
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

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  }

  private generateFileName(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split(".").pop();
    return `${userId}/${timestamp}_${randomString}.${extension}`;
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
        // Update article cover image
        await updateArticle(context.articleId, {
          coverImage: result.url,
        });
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
      const { doc, updateDoc } = await import("firebase/firestore");
      const { firestore } = await import("./firebase");

      const userRef = doc(firestore, "users", upload.userId);
      await updateDoc(userRef, {
        profilePicture: result.url,
        updatedAt: new Date(),
      });
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
