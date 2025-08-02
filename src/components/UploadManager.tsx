import React, { useState, useEffect } from "react";
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
  Trash2,
  Download,
  Eye,
  Minimize2,
  Maximize2
} from "lucide-react";
import {
  resumableUploadManager,
  UploadProgress,
  UploadMetadata
} from "../lib/resumableUpload";
import { isImageFile } from "../lib/fileUpload";
import { formatDistanceToNow } from "date-fns";

interface UploadManagerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  articleId?: string;
}

interface ExtendedUpload {
  id: string;
  metadata: UploadMetadata;
  progress: UploadProgress;
}

export const UploadManager: React.FC<UploadManagerProps> = ({
  isOpen,
  onClose,
  className = "",
  articleId
}) => {
  const [uploads, setUploads] = useState<ExtendedUpload[]>([]);
  const [persistentFiles, setPersistentFiles] = useState<ExtendedUpload[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMinimized, setIsMinimized] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  // Load existing files when component mounts or articleId changes
  useEffect(() => {
    if (articleId) {
      // Get all uploads and find ones that belong to this article or are completed
      const allUploads = resumableUploadManager.getAllUploads();
      const articleFiles = allUploads
        .filter(metadata =>
          (metadata.context?.articleId === articleId) ||
          (metadata.state === 'success' && metadata.downloadURL)
        )
        .map(metadata => {
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

      setPersistentFiles(articleFiles);
    }
  }, [articleId]);

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

  // Monitor all uploads and maintain persistent files
  useEffect(() => {
    const interval = setInterval(() => {
      const allUploads = resumableUploadManager.getAllUploads();
      const uploadsWithProgress = allUploads.map(metadata => {
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

      setUploads(uploadsWithProgress);

      // Always add completed uploads to persistent files, regardless of article association
      const completedUploads = uploadsWithProgress.filter(upload =>
        upload.metadata.state === 'success' && upload.metadata.downloadURL
      );

      // Update persistent files - add any new completed uploads
      setPersistentFiles(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newCompletedFiles = completedUploads.filter(f => !existingIds.has(f.id));

        // Keep all existing persistent files and add new completed ones
        const updatedFiles = [...prev, ...newCompletedFiles];

        // Don't remove files automatically - only when explicitly deleted
        return updatedFiles;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [articleId]);

  const handleUploadAction = (uploadId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    switch (action) {
      case 'pause':
        resumableUploadManager.pauseUpload(uploadId);
        break;
      case 'resume':
      case 'retry':
        resumableUploadManager.resumeUpload(uploadId);
        break;
      case 'cancel':
        resumableUploadManager.cancelUpload(uploadId);
        break;
    }
  };



  const handleCleanupCompleted = () => {
    // Only cleanup failed/cancelled uploads, keep successful ones
    const failedUploads = uploads.filter(u =>
      u.progress.state === 'error' || u.progress.state === 'canceled'
    );

    failedUploads.forEach(upload => {
      resumableUploadManager.removeUpload(upload.id);
    });

    // Update state
    setUploads(prev => prev.filter(u =>
      u.progress.state !== 'error' && u.progress.state !== 'canceled'
    ));
    setPersistentFiles(prev => prev.filter(u =>
      u.progress.state !== 'error' && u.progress.state !== 'canceled'
    ));
  };

  const getFilteredUploads = () => {
    // Start with persistent files (these should always be shown)
    const allFiles = [...persistentFiles];

    // Add current uploads that aren't already in persistent files
    uploads.forEach(upload => {
      if (!allFiles.find(f => f.id === upload.id)) {
        allFiles.push(upload);
      }
    });

    switch (filter) {
      case 'active':
        return allFiles.filter(u => u.progress.state === 'running' || u.progress.state === 'paused');
      case 'completed':
        return allFiles.filter(u => u.progress.state === 'success');
      case 'failed':
        return allFiles.filter(u => u.progress.state === 'error' || u.progress.state === 'canceled');
      default:
        return allFiles;
    }
  };

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

  const filteredUploads = getFilteredUploads();
  const allFiles = filteredUploads;
  const activeCount = allFiles.filter(u => u.progress.state === 'running' || u.progress.state === 'paused').length;
  const completedCount = allFiles.filter(u => u.progress.state === 'success').length;
  const failedCount = allFiles.filter(u => u.progress.state === 'error' || u.progress.state === 'canceled').length;

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[600px] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              Upload Manager
            </h3>
            {!isOnline && (
              <div className="flex items-center space-x-1 text-red-600 bg-red-100 px-2 py-1 rounded-full">
                <WifiOff className="h-3 w-3" />
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-gray-600 p-1"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Stats and Filters */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-4 gap-2 mb-3">
                <button
                  onClick={() => setFilter('all')}
                  className={`text-center p-2 rounded text-xs ${
                    filter === 'all' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{allFiles.length}</div>
                  <div>All</div>
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`text-center p-2 rounded text-xs ${
                    filter === 'active' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{activeCount}</div>
                  <div>Active</div>
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`text-center p-2 rounded text-xs ${
                    filter === 'completed' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{completedCount}</div>
                  <div>Done</div>
                </button>
                <button
                  onClick={() => setFilter('failed')}
                  className={`text-center p-2 rounded text-xs ${
                    filter === 'failed' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{failedCount}</div>
                  <div>Failed</div>
                </button>
              </div>

              {failedCount > 0 && (
                <button
                  onClick={handleCleanupCompleted}
                  className="w-full text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 py-1 px-2 rounded"
                >
                  Clear failed uploads
                </button>
              )}
            </div>

            {/* Upload List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredUploads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {filter === 'all' 
                      ? 'No uploads yet' 
                      : `No ${filter} uploads`
                    }
                  </p>
                </div>
              ) : (
                filteredUploads.map((upload) => (
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
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {upload.metadata.fileName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {resumableUploadManager.formatFileSize(upload.metadata.totalBytes)}
                            {upload.metadata.startTime && (
                              <span className="ml-2">
                                Started {formatDistanceToNow(upload.metadata.startTime)} ago
                              </span>
                            )}
                          </div>
                        </div>
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
                            onClick={() => handleUploadAction(upload.id, 'retry')}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Retry upload"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                        
                        {upload.progress.state === 'success' && upload.metadata.downloadURL && (
                          <>
                            <a
                              href={upload.metadata.downloadURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="View file"
                            >
                              <Eye className="h-3 w-3" />
                            </a>
                            <a
                              href={upload.metadata.downloadURL}
                              download={upload.metadata.fileName}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Download file"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </>
                        )}
                        
                        {upload.progress.state !== 'success' && (
                          <button
                            onClick={() => handleUploadAction(upload.id, 'cancel')}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Cancel upload"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {upload.progress.state !== 'success' && upload.progress.state !== 'canceled' && (
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
                    )}
                    
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
                    
                    {upload.progress.state === 'success' && (
                      <div className="text-xs text-green-600">
                        Upload completed successfully
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};