import { useState, useEffect, useCallback } from "react";
import {
  resumableUploadManager,
  UploadProgress,
  UploadMetadata,
  ResumableUploadResult
} from "../lib/resumableUpload";

export interface UseResumableUploadOptions {
  onProgress?: (uploadId: string, progress: UploadProgress) => void;
  onComplete?: (uploadId: string, result: ResumableUploadResult | Error) => void;
  onStateChange?: (uploadId: string, state: string) => void;
}

export interface UseResumableUploadReturn {
  uploads: UploadMetadata[];
  activeUploads: UploadMetadata[];
  isOnline: boolean;
  uploadFile: (file: File, userId: string, folder?: string) => Promise<string>;
  pauseUpload: (uploadId: string) => void;
  resumeUpload: (uploadId: string) => void;
  cancelUpload: (uploadId: string) => void;
  retryUpload: (uploadId: string) => void;
  getUploadStatus: (uploadId: string) => UploadMetadata | null;
  cleanupCompleted: () => void;
  formatFileSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
  formatTime: (seconds: number) => string;
}

export const useResumableUpload = (options: UseResumableUploadOptions = {}): UseResumableUploadReturn => {
  const [uploads, setUploads] = useState<UploadMetadata[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor uploads
  useEffect(() => {
    const interval = setInterval(() => {
      const allUploads = resumableUploadManager.getAllUploads();
      setUploads(allUploads);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    userId: string,
    folder: string = 'articles'
  ): Promise<string> => {
    const uploadId = await resumableUploadManager.addUpload(
      file,
      userId,
      folder,
      (progress) => {
        options.onProgress?.(uploadId, progress);
      },
      (result) => {
        options.onComplete?.(uploadId, result);
      }
    );

    // Start the upload
    resumableUploadManager.resumeUpload(uploadId);
    return uploadId;
  }, [options]);

  const pauseUpload = useCallback((uploadId: string) => {
    resumableUploadManager.pauseUpload(uploadId);
    options.onStateChange?.(uploadId, 'paused');
  }, [options]);

  const resumeUpload = useCallback((uploadId: string) => {
    resumableUploadManager.resumeUpload(uploadId);
    options.onStateChange?.(uploadId, 'running');
  }, [options]);

  const cancelUpload = useCallback((uploadId: string) => {
    resumableUploadManager.cancelUpload(uploadId);
    options.onStateChange?.(uploadId, 'canceled');
  }, [options]);

  const retryUpload = useCallback((uploadId: string) => {
    resumableUploadManager.resumeUpload(uploadId);
    options.onStateChange?.(uploadId, 'running');
  }, [options]);

  const getUploadStatus = useCallback((uploadId: string) => {
    return resumableUploadManager.getUploadStatus(uploadId);
  }, []);

  const cleanupCompleted = useCallback(() => {
    resumableUploadManager.cleanupCompletedUploads();
  }, []);

  const activeUploads = uploads.filter(
    upload => upload.state === 'running' || upload.state === 'paused'
  );

  return {
    uploads,
    activeUploads,
    isOnline,
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    getUploadStatus,
    cleanupCompleted,
    formatFileSize: resumableUploadManager.formatFileSize,
    formatSpeed: resumableUploadManager.formatSpeed,
    formatTime: resumableUploadManager.formatTime
  };
};

// Hook for monitoring specific upload
export const useUploadStatus = (uploadId: string | null) => {
  const [status, setStatus] = useState<UploadMetadata | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  useEffect(() => {
    if (!uploadId) return;

    const interval = setInterval(() => {
      const uploadStatus = resumableUploadManager.getUploadStatus(uploadId);
      setStatus(uploadStatus);

      if (uploadStatus) {
        const progressData: UploadProgress = {
          bytesTransferred: uploadStatus.bytesTransferred,
          totalBytes: uploadStatus.totalBytes,
          percentage: Math.round((uploadStatus.bytesTransferred / uploadStatus.totalBytes) * 100),
          speed: 0,
          estimatedTimeRemaining: 0,
          state: uploadStatus.state
        };
        setProgress(progressData);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [uploadId]);

  return { status, progress };
};