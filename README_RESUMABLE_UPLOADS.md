# Resumable File Upload System Documentation

## Overview

This implementation provides a comprehensive offline-first, real-time collaborative file upload system using Firebase Storage's resumable upload capabilities. The system handles network interruptions gracefully and provides a seamless user experience.

## Key Features

### 1. Resumable Uploads
- Uses Firebase Storage's `uploadBytesResumable()` method
- Automatically resumes interrupted uploads when connection is restored
- Supports all file types configured in the application
- Handles multiple concurrent uploads (max 3 simultaneous)

### 2. Progress Tracking
- Real-time upload progress with percentage completion
- Upload speed calculation (bytes per second)
- Estimated time remaining
- Smooth progress indicators without performance issues

### 3. Network Resilience
- Automatic detection of network connectivity changes
- Graceful handling of network failures
- Automatic resume on reconnection
- Multiple concurrent uploads resuming simultaneously
- No data loss or corruption during resume operations

### 4. Persistent State
- Upload progress stored in localStorage
- Uploads resume after browser reload or tab closure
- File metadata persistence (name, size, progress)
- Automatic cleanup of completed uploads

### 5. User Experience
- Clear visual indicators for upload status
- Appropriate error messages for different failure scenarios
- Manual pause/resume controls
- Upload queue management
- Network status indicators

## Architecture

### Core Components

#### 1. ResumableUploadManager (`src/lib/resumableUpload.ts`)
- Singleton class managing all upload operations
- Handles upload queue and concurrent upload limits
- Provides network monitoring and automatic resume
- Manages persistent state in localStorage

#### 2. ResumableFileUpload Component (`src/components/ResumableFileUpload.tsx`)
- React component for file upload UI
- Drag and drop support
- Real-time progress display
- Network status indicators

#### 3. UploadManager Component (`src/components/UploadManager.tsx`)
- Comprehensive upload management interface
- Upload filtering and status monitoring
- Manual control over uploads (pause/resume/cancel)
- Upload statistics and cleanup

#### 4. Network Status Components
- `NetworkStatus.tsx`: Network connectivity indicator
- `OfflineIndicator.tsx`: Global offline status and sync progress
- Real-time connection quality monitoring

### Integration Points

#### 1. Enhanced FileUpload Component
- Backward compatible with existing upload functionality
- `useResumable` prop to enable/disable resumable uploads
- Automatic fallback to legacy upload for compatibility

#### 2. Article Editor Integration
- Resumable uploads for cover images and attachments
- Upload manager integration
- Real-time upload progress in editor

#### 3. Profile Picture Uploads
- Resumable profile picture uploads
- Enhanced error handling and retry logic

## Usage Examples

### Basic Resumable Upload
```tsx
import { ResumableFileUpload } from './components/ResumableFileUpload';

<ResumableFileUpload
  onUploadComplete={(result) => {
    console.log('Upload completed:', result);
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error);
  }}
  accept="image/*,.pdf"
  folder="articles"
/>
```

### Using the Upload Manager
```tsx
import { UploadManager } from './components/UploadManager';

<UploadManager
  isOpen={showUploadManager}
  onClose={() => setShowUploadManager(false)}
/>
```

### Programmatic Upload Control
```tsx
import { resumableUploadManager } from './lib/resumableUpload';

// Add upload to queue
const uploadId = await resumableUploadManager.addUpload(
  file,
  userId,
  'articles',
  (progress) => console.log('Progress:', progress),
  (result) => console.log('Complete:', result)
);

// Control upload
resumableUploadManager.pauseUpload(uploadId);
resumableUploadManager.resumeUpload(uploadId);
resumableUploadManager.cancelUpload(uploadId);
```

### Using the Hook
```tsx
import { useResumableUpload } from './hooks/useResumableUpload';

const {
  uploads,
  activeUploads,
  isOnline,
  uploadFile,
  pauseUpload,
  resumeUpload,
  cancelUpload
} = useResumableUpload({
  onProgress: (uploadId, progress) => {
    console.log(`Upload ${uploadId}: ${progress.percentage}%`);
  },
  onComplete: (uploadId, result) => {
    console.log(`Upload ${uploadId} completed:`, result);
  }
});
```

## Configuration

### Upload Limits
- Maximum concurrent uploads: 3
- Maximum file size: 10MB (configurable)
- Supported file types: Images, PDFs, Documents (as defined in existing validation)

### Storage Keys
- Upload state: `infonest_uploads`
- Offline actions: `infonest_offline_actions`

### Network Monitoring
- Connection check interval: 5 seconds
- Sync processor interval: 30 seconds
- Upload queue processor: 1 second

## Error Handling

### Retryable Errors
- Network request failed
- Timeout errors
- Server file wrong size
- Unknown errors

### Non-Retryable Errors
- Authentication errors
- Permission denied
- Invalid file format
- File too large

### Retry Logic
- Exponential backoff for retries
- Maximum 3 retry attempts
- Automatic cleanup after max retries

## Testing Scenarios

### Network Interruption Testing
1. Start a large file upload
2. Disconnect network during upload
3. Verify upload pauses automatically
4. Reconnect network
5. Verify upload resumes from last position

### Browser Reload Testing
1. Start multiple uploads
2. Reload browser tab
3. Verify uploads are restored from localStorage
4. Verify uploads can be resumed manually

### Concurrent Upload Testing
1. Start multiple file uploads simultaneously
2. Verify only 3 uploads run concurrently
3. Verify queue management works correctly
4. Test pause/resume of individual uploads

### Large File Testing
1. Upload files >50MB
2. Verify progress tracking accuracy
3. Test network interruption during large upload
4. Verify memory usage remains stable

## Performance Considerations

### Memory Optimization
- File objects not persisted in localStorage
- Upload tasks cleaned up after completion
- Periodic cleanup of completed uploads

### UI Performance
- Progress updates throttled to prevent excessive re-renders
- Efficient state management with minimal re-renders
- Lazy loading of upload manager components

### Network Efficiency
- Chunked upload strategy via Firebase
- Minimal overhead for progress tracking
- Efficient retry mechanisms

## Security

### Firebase Storage Rules
Ensure your Firebase Storage rules allow resumable uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /articles/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /profiles/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Authentication
- All uploads require user authentication
- User ID validation for upload paths
- Secure file naming with user isolation

## Monitoring and Debugging

### Console Logging
- Detailed logging for upload lifecycle events
- Network status change notifications
- Error logging with context

### Development Tools
- Upload manager provides real-time status
- Network status components for debugging
- localStorage inspection for persistent state

## Migration from Legacy Upload

The system is designed to be backward compatible:

1. Existing `FileUpload` components work unchanged
2. Set `useResumable={true}` to enable resumable uploads
3. Legacy uploads still supported with `useResumable={false}`
4. Gradual migration possible component by component

## Future Enhancements

### Planned Features
- Upload bandwidth throttling
- Upload scheduling and queuing
- Collaborative upload progress sharing
- Advanced retry strategies
- Upload analytics and reporting

### Scalability Considerations
- Support for larger file sizes (>100MB)
- Improved concurrent upload management
- Enhanced offline sync capabilities
- Real-time collaboration features