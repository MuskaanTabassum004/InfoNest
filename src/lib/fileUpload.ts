import { useState } from "react";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  originalName: string; // Preserve original filename
  size: number;
  type: string;
}

export interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error?: string;
}

// Allowed file types for articles
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const validateFile = (
  file: File
): { isValid: boolean; error?: string } => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error:
        "File type not supported. Please upload images (JPEG, PNG, GIF, WebP) or documents (PDF, TXT, DOC, DOCX).",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "File size too large. Maximum size is 10MB.",
    };
  }

  return { isValid: true };
};

export const generateFileName = (
  originalName: string,
  userId: string,
  articleId?: string,
  folder?: string
): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);

  // Clean the original filename to make it URL-safe
  const cleanName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

  const nameParts = cleanName.split('.');
  const extension = nameParts.pop() || '';
  const baseName = nameParts.join('.') || 'file';

  // Create filename that preserves original name but ensures uniqueness
  const uniqueFileName = `${baseName}_${timestamp}_${randomString}.${extension}`;

  // For articles folder, ALWAYS require articleId (new structure only)
  if (folder === "articles") {
    if (!articleId) {
      throw new Error(
        "Article ID is required for article file uploads. Please save the article first to get an ID."
      );
    }
    // New structure: articles/{userId}/{articleId}/{originalName_timestamp_random.ext}
    return `${userId}/${articleId}/${uniqueFileName}`;
  } else {
    // For profiles folder, use simple structure: {userId}/{originalName_timestamp_random.ext}
    return `${userId}/${uniqueFileName}`;
  }
};

export const uploadFile = async (
  file: File,
  userId: string,
  folder: "articles" | "profiles" = "articles",
  onProgress?: (progress: number) => void,
  articleId?: string
): Promise<UploadResult> => {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    console.error("File validation failed:", validation.error);
    throw new Error(validation.error);
  }

  // Generate unique filename with article organization
  const fileName = generateFileName(file.name, userId, articleId, folder);
  const filePath = `${folder}/${fileName}`;

  // Create storage reference
  const storageRef = ref(storage, filePath);

  try {
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    const result = {
      url: downloadURL,
      path: filePath,
      name: fileName.split('/').pop() || file.name, // Generated filename
      originalName: file.name, // Preserve original filename
      size: file.size,
      type: file.type,
    };

    return result;
  } catch (error: any) {
    console.error("Upload failed:", error);

    // Provide specific error messages based on error type
    if (error.code === "storage/unauthorized") {
      throw new Error(
        "Permission denied. Please check your authentication and storage rules."
      );
    } else if (error.code === "storage/canceled") {
      throw new Error("Upload was canceled.");
    } else if (error.code === "storage/unknown") {
      throw new Error(
        "Unknown error occurred. Please check your internet connection and try again."
      );
    } else if (error.code === "storage/invalid-format") {
      throw new Error("Invalid file format. Please check the file type.");
    } else if (error.code === "storage/object-not-found") {
      throw new Error("Storage location not found. Please contact support.");
    } else {
      throw new Error(`Upload failed: ${error.message || "Unknown error"}`);
    }
  }
};

export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const storageRef = ref(storage, filePath);

    await deleteObject(storageRef);
  } catch (error: any) {
    console.error("Error deleting file:", error);

    // If file doesn't exist, consider it already deleted (success)
    if (error?.code === "storage/object-not-found") {
      return; // Don't throw error for already deleted files
    }

    throw new Error(
      `Failed to delete file: ${error?.message || "Unknown error"}`
    );
  }
};

export const isImageFile = (fileType: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(fileType);
};

export const extractFilePathFromUrl = (url: string): string | null => {
  if (!url || typeof url !== "string") return null;

  try {
    // Handle Firebase Storage URLs
    if (url.includes("firebasestorage.googleapis.com")) {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]);
      }
    }

    // Handle gs:// URLs
    if (url.startsWith("gs://")) {
      return url.replace(/^gs:\/\/[^\/]+\//, "");
    }

    return null;
  } catch (error) {
    console.error("Error extracting file path from URL:", url, error);
    return null;
  }
};

// Delete entire article folder and all its contents
export const deleteArticleFolder = async (
  userId: string,
  articleId: string
): Promise<void> => {
  try {
    const { listAll } = await import("firebase/storage");
    const folderPath = `articles/${userId}/${articleId}`;
    const folderRef = ref(storage, folderPath);

    console.log(`🗑️ Deleting article folder: ${folderPath}`);

    // List all files in the article folder
    const listResult = await listAll(folderRef);

    if (listResult.items.length > 0) {
      // Delete all files in the folder
      await Promise.all(
        listResult.items.map(async (fileRef) => {
          try {
            await deleteObject(fileRef);
            console.log(`✅ Deleted file: ${fileRef.fullPath}`);
          } catch (error) {
            console.error(
              `⚠️ Failed to delete file: ${fileRef.fullPath}`,
              error
            );
            // Continue with other deletions
          }
        })
      );

      console.log(
        `✅ Deleted ${listResult.items.length} files from article folder: ${folderPath}`
      );
    } else {
      console.log(`📁 Article folder is empty: ${folderPath}`);
    }
  } catch (error: any) {
    console.error(
      `❌ Error deleting article folder: articles/${userId}/${articleId}`,
      error
    );

    // If folder doesn't exist, consider it already deleted (success)
    if (error?.code === "storage/object-not-found") {
      console.log(
        `📁 Article folder already deleted: articles/${userId}/${articleId}`
      );
      return;
    }

    throw new Error(
      `Failed to delete article folder: ${error?.message || "Unknown error"}`
    );
  }
};

// Delete entire user folder and all its contents (for InfoWriter privilege removal)
export const deleteUserArticlesFolder = async (
  userId: string
): Promise<void> => {
  try {
    const { listAll } = await import("firebase/storage");
    const userFolderPath = `articles/${userId}`;
    const userFolderRef = ref(storage, userFolderPath);

    console.log(`🗑️ Deleting user articles folder: ${userFolderPath}`);

    // List all items in the user folder (including subfolders)
    const listResult = await listAll(userFolderRef);

    let totalFilesDeleted = 0;

    // Delete all files in the user folder
    if (listResult.items.length > 0) {
      await Promise.all(
        listResult.items.map(async (fileRef) => {
          try {
            await deleteObject(fileRef);
            console.log(`✅ Deleted file: ${fileRef.fullPath}`);
            totalFilesDeleted++;
          } catch (error) {
            console.error(
              `⚠️ Failed to delete file: ${fileRef.fullPath}`,
              error
            );
            // Continue with other deletions
          }
        })
      );
    }

    // Recursively delete all subfolders (article folders)
    if (listResult.prefixes.length > 0) {
      await Promise.all(
        listResult.prefixes.map(async (folderRef) => {
          try {
            const subListResult = await listAll(folderRef);
            await Promise.all(
              subListResult.items.map(async (fileRef) => {
                try {
                  await deleteObject(fileRef);
                  console.log(`✅ Deleted file: ${fileRef.fullPath}`);
                  totalFilesDeleted++;
                } catch (error) {
                  console.error(
                    `⚠️ Failed to delete file: ${fileRef.fullPath}`,
                    error
                  );
                }
              })
            );
          } catch (error) {
            console.error(
              `⚠️ Failed to delete subfolder: ${folderRef.fullPath}`,
              error
            );
          }
        })
      );
    }

    console.log(
      `✅ Deleted ${totalFilesDeleted} files from user folder: ${userFolderPath}`
    );
  } catch (error: any) {
    console.error(
      `❌ Error deleting user articles folder: articles/${userId}`,
      error
    );

    // If folder doesn't exist, consider it already deleted (success)
    if (error?.code === "storage/object-not-found") {
      console.log(
        `📁 User articles folder already deleted: articles/${userId}`
      );
      return;
    }

    throw new Error(
      `Failed to delete user articles folder: ${
        error?.message || "Unknown error"
      }`
    );
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Hook for file upload with progress
export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
  });

  const uploadFileWithProgress = async (
    file: File,
    userId: string,
    folder: "articles" | "profiles" = "articles",
    articleId?: string
  ): Promise<UploadResult> => {
    setUploadProgress({ progress: 0, isUploading: true });

    try {
      const result = await uploadFile(
        file,
        userId,
        folder,
        (progress) => {
          setUploadProgress({ progress, isUploading: true });
        },
        articleId
      );

      setUploadProgress({ progress: 100, isUploading: false });
      return result;
    } catch (error) {
      setUploadProgress({
        progress: 0,
        isUploading: false,
        error: error instanceof Error ? error.message : "Upload failed",
      });
      throw error;
    }
  };

  const resetProgress = () => {
    setUploadProgress({ progress: 0, isUploading: false });
  };

  return {
    uploadProgress,
    uploadFileWithProgress,
    resetProgress,
  };
};
