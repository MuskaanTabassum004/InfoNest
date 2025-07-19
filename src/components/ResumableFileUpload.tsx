import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  X,
  File,
  Image,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  RotateCcw,
  Trash2
} from "lucide-react";
import {
  resumableUploadManager,
  UploadProgress,
  UploadMetadata,
  ResumableUploadResult
} from "../lib/resumableUpload";
import { validateFile, isImageFile } from "../lib/fileUpload";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

interface ResumableFileUploadProps {
  onUploadComplete: (result: ResumableUploadResult) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  folder?: "articles" | "profiles";
  className?: string;
  children?: React.ReactNode;
  showUploadManager?: boolean;
}

interface ActiveUpload {
  id: string;
  metadata: UploadMetadata;
  progress: UploadProgress;
}

export const ResumableFileUpload: React.FC<ResumableFileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  accept = "image/*,.pdf,.txt,.doc,.docx",
  folder = "articles",
  className = "",
  children,
  showUploadManager = true
}) => {
  const { userProfile } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showManager, setShowManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Network status monitoring
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

  // Monitor active uploads
  useEffect(() => {
    const interval = setInterval(() => {
      const uploads = resumableUploadManager.getActiveUploads();
      const activeUploadsData = uploads.map(metadata => {
        const progress: UploadProgress = {
          bytesTransferred: metadata.bytesTransferred,
          totalBytes: metadata.totalBytes,
          percentage: Math.round((metadata.bytesTransferred / metadata.totalBytes) * 100),
          speed: 0,
          estimatedTimeRemaining: 0,
          state: metadata.state
        };
        return {
          id: metadata.id,
          metadata,
          progress
        };
      });
      setActiveUploads(activeUploadsData);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!userProfile) {
      toast.error("Please login to upload files");
      onUploadError?.("Please login to upload files");
      return;
    }

    const file = files[0];

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      const error = validation.error || "Invalid file";
      console.error("File validation failed:", error);
      toast.error(error);
      onUploadError?.(error);
      return;
    }

    try {
      const uploadId = await resumableUploadManager.addUpload(
        file,
        userProfile.uid,
        folder,
        (progress) => {
          // Update progress in real-time
          setActiveUploads(prev => 
            prev.map(upload => 
              upload.id === uploadId 
                ? { ...upload, progress }
                : upload
            )
          );
        },
        (result) => {
          if (result instanceof Error) {
            console.error("Upload failed:", result.message);
            toast.error(`Upload failed: ${result.message}`);
            onUploadError?.(result.message);
          } else {
            toast.success("File uploaded successfully!");
            onUploadComplete(result);
          }
          
          // Remove from active uploads
          setActiveUploads(prev => 
            prev.filter(upload => upload.id !== uploadId)
          );
        }
      );

      // Start the upload
      resumableUploadManager.resumeUpload(uploadId);
      toast.success("Upload started!");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      console.error("Upload error:", errorMessage);
      toast.error(errorMessage);
      onUploadError?.(errorMessage);
    }
  }, [userProfile, folder, onUploadComplete, onUploadError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUploadAction = useCallback((uploadId: string, action: 'pause' | 'resume' | 'cancel') => {
    switch (action) {
      case 'pause':
        resumableUploadManager.pauseUpload(uploadId);
        toast.info("Upload paused");
        break;
      case 'resume':
        resumableUploadManager.resumeUpload(uploadId);
        toast.info("Upload resumed");
        break;
      case 'cancel':
        resumableUploadManager.cancelUpload(uploadId);
        toast.info("Upload canceled");
        break;
    }
  }, []);

  const getUploadStatusIcon = (state: string) => {
    switch (state) {
      case 'running':
        return <Upload className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'canceled':
        return <X className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getUploadStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'border-blue-200 bg-blue-50';
      case 'paused':
        return 'border-yellow-200 bg-yellow-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'canceled':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (children) {
    return (
      <>
        <div onClick={openFileDialog} className="cursor-pointer">
          {children}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        {/* Upload Manager Modal */}
        {showUploadManager && activeUploads.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-96 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">
                    Uploads ({activeUploads.length})
                  </h3>
                  {!isOnline && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <WifiOff className="h-4 w-4" />
                      <span className="text-xs">Offline</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowManager(!showManager)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showManager ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                </button>
              </div>
              
              {showManager && (
                <div className="max-h-64 overflow-y-auto">
                  {activeUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className={`p-4 border-b border-gray-100 ${getUploadStatusColor(upload.progress.state)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {isImageFile(upload.metadata.file?.type || '') ? (
                            <Image className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <File className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {upload.metadata.fileName}
                          </span>
                          {getUploadStatusIcon(upload.progress.state)}
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {upload.progress.state === 'running' && (
                            <button
                              onClick={() => handleUploadAction(upload.id, 'pause')}
                              className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
                              title="Pause upload"
                            >
                              <Pause className="h-3 w-3" />
                            </button>
                          )}
                          
                          {upload.progress.state === 'paused' && (
                            <button
                              onClick={() => handleUploadAction(upload.id, 'resume')}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Resume upload"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                          )}
                          
                          {upload.progress.state === 'error' && (
                            <button
                              onClick={() => handleUploadAction(upload.id, 'resume')}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Retry upload"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleUploadAction(upload.id, 'cancel')}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Cancel upload"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>{upload.progress.percentage}%</span>
                          <span>
                            {resumableUploadManager.formatFileSize(upload.progress.bytesTransferred)} / {resumableUploadManager.formatFileSize(upload.progress.totalBytes)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              upload.progress.state === 'running' 
                                ? 'bg-blue-600' 
                                : upload.progress.state === 'paused'
                                ? 'bg-yellow-500'
                                : upload.progress.state === 'error'
                                ? 'bg-red-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${upload.progress.percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Upload Stats */}
                      {upload.progress.state === 'running' && (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Zap className="h-3 w-3" />
                            <span>{resumableUploadManager.formatSpeed(upload.progress.speed)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{resumableUploadManager.formatTime(upload.progress.estimatedTimeRemaining)}</span>
                          </div>
                        </div>
                      )}
                      
                      {upload.progress.state === 'paused' && (
                        <div className="text-xs text-yellow-600">
                          Upload paused {!isOnline ? '(offline)' : ''}
                        </div>
                      )}
                      
                      {upload.progress.state === 'error' && upload.metadata.error && (
                        <div className="text-xs text-red-600">
                          Error: {upload.metadata.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Upload className="h-12 w-12 text-gray-400" />
            {!isOnline && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1">
                <WifiOff className="h-3 w-3" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isOnline ? "Drop files here or click to upload" : "Offline - Files will upload when online"}
            </h3>
            <p className="text-sm text-gray-600">
              Supports resumable uploads with automatic retry on network reconnection
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Images, PDFs, and documents up to 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Network Status Indicator */}
      <div className={`absolute top-2 right-2 flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
        isOnline 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
      </div>
    </div>
  );
};

// Simple button wrapper for resumable uploads
export const ResumableFileUploadButton: React.FC<{
  onUploadComplete: (result: ResumableUploadResult) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  folder?: "articles" | "profiles";
  className?: string;
  children: React.ReactNode;
}> = ({ children, ...props }) => {
  return <ResumableFileUpload {...props}>{children}</ResumableFileUpload>;
};