# Firebase Storage Security Rules Implementation

## Overview

This document outlines the comprehensive Firebase Storage security rules implemented for the InfoNest application, addressing file upload security, access control, and storage organization.

## Storage Structure Analysis

### Current File Organization
```
storage/
├── profiles/
│   └── {userId}/
│       └── {timestamp}_{randomString}.{extension}
├── articles/
│   └── {userId}/
│       └── {timestamp}_{randomString}.{extension}
└── temp/
    └── {userId}/
        └── {fileName}
```

### File Types Supported
- **Profile Pictures**: JPEG, JPG, PNG, GIF, WebP (max 5MB)
- **Article Files**: Images + Documents (PDF, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX) (max 10MB)
- **Temporary Files**: Any type (max 50MB, for resumable uploads)

## Security Rules Implementation

### 1. Profile Pictures (`/profiles/{userId}/{fileName}`)

**Public Read Access:**
- ✅ No authentication required for reading profile pictures
- ✅ Enables display on public pages and author profiles

**Write Access:**
- ✅ Users can only upload/update/delete their own profile pictures
- ✅ Authenticated users only
- ✅ File type validation (images only)
- ✅ File size validation (5MB max)
- ✅ Filename security validation

### 2. Article Files (`/articles/{userId}/{fileName}`)

**Public Read Access:**
- ✅ No authentication required for reading article files
- ✅ Enables public display of cover images and attachments

**Write Access:**
- ✅ Only InfoWriters and Admins can upload article files
- ✅ Users can only manage files in their own folder
- ✅ Role verification through Firestore lookup
- ✅ File type validation (images and documents)
- ✅ File size validation (10MB max)
- ✅ Filename security validation

### 3. Temporary Files (`/temp/{userId}/{fileName}`)

**Access Control:**
- ✅ Users can only access their own temporary files
- ✅ Used for resumable upload functionality
- ✅ Higher size limit (50MB) for upload processing

### 4. Admin Override Access

**Management Access:**
- ✅ Admins can read all files for management purposes
- ✅ Role verification through Firestore lookup
- ✅ Email verification required

## Security Features

### File Validation
```javascript
// Profile Pictures
- Size: 0 < size <= 5MB
- Types: image/jpeg, image/jpg, image/png, image/gif, image/webp
- Filename: Alphanumeric, dots, dashes, underscores only

// Article Files  
- Size: 0 < size <= 10MB
- Types: Images + PDF, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Filename: Same validation as profile pictures
```

### Security Protections
- ✅ **Path Traversal Prevention**: Filename validation prevents `../` attacks
- ✅ **Special Character Filtering**: Blocks malicious characters in filenames
- ✅ **Empty File Prevention**: Files must have content (size > 0)
- ✅ **Role-Based Access**: Firestore integration for user role verification
- ✅ **System Folder Protection**: Explicit denial of access to system folders

## File Replacement Logic

### Current Implementation Issue
The current upload system creates new unique filenames for each upload, which means:
- ❌ Profile picture updates create new files instead of replacing existing ones
- ❌ Old files are not automatically deleted
- ❌ Storage accumulates unused files over time

### Recommended Client-Side Implementation
```javascript
// Profile Picture Update Process
1. Upload new profile picture
2. Update user profile with new URL
3. Delete old profile picture file (if exists)
4. Update all references to use new URL

// Article File Management
1. Track file usage in article content
2. When article is updated, identify unused files
3. Delete unused files from storage
4. Clean up temporary files after successful uploads
```

## Configuration Files Updated

### firebase.json
```json
{
  "storage": {
    "rules": "storage.rules"
  }
}
```

### storage.rules
- ✅ Comprehensive security rules created
- ✅ Public read access for profile pictures and article files
- ✅ Role-based write access control
- ✅ File type and size validation
- ✅ Security protections against common attacks

## Deployment Instructions

1. **Deploy Storage Rules:**
   ```bash
   firebase deploy --only storage
   ```

2. **Verify Rules Deployment:**
   ```bash
   firebase storage:rules:get
   ```

3. **Test Access Patterns:**
   - Test public read access to profile pictures
   - Test public read access to article cover images
   - Test authenticated upload for profile pictures
   - Test role-based upload for article files

## Important Notes

### File Cleanup Requirements
- ⚠️ **Firebase Storage rules cannot automatically delete old files**
- ⚠️ **Client-side code must handle file cleanup**
- ⚠️ **Consider implementing Cloud Functions for automated cleanup**

### Real-Time Implementation
- ✅ **Profile picture updates work in real-time**
- ✅ **Article file uploads work in real-time**
- ✅ **All existing functionality preserved**

### Security Considerations
- ✅ **Principle of least privilege applied**
- ✅ **Public access limited to necessary files only**
- ✅ **Role-based access control implemented**
- ✅ **File validation prevents malicious uploads**

## Testing Checklist

- [ ] Profile pictures display publicly without authentication
- [ ] Article cover images display publicly without authentication
- [ ] Users can upload their own profile pictures
- [ ] InfoWriters can upload article files
- [ ] Admins can upload article files
- [ ] Regular users cannot upload article files
- [ ] File size limits are enforced
- [ ] File type restrictions are enforced
- [ ] Malicious filenames are rejected
- [ ] Admin users can access all files for management

## Future Enhancements

1. **Automated File Cleanup**: Implement Cloud Functions to automatically delete unused files
2. **Image Optimization**: Add automatic image resizing and optimization
3. **Virus Scanning**: Integrate file scanning for malicious content
4. **Usage Analytics**: Track file access patterns and storage usage
5. **CDN Integration**: Implement CDN for better performance of public files
