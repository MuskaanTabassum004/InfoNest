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
  userId: string
): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop();
  return `${userId}/${timestamp}_${randomString}.${extension}`;
};

export const uploadFile = async (
  file: File,
  userId: string,
  folder: "articles" | "profiles" = "articles",
  onProgress?: (progress: number) => void
): Promise<UploadResult> => {

  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    console.error("File validation failed:", validation.error);
    throw new Error(validation.error);
  }

  // Generate unique filename
  const fileName = generateFileName(file.name, userId);
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
      name: file.name,
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
    if (error?.code === 'storage/object-not-found') {
      return; // Don't throw error for already deleted files
    }

    throw new Error(`Failed to delete file: ${error?.message || 'Unknown error'}`);
  }
};

export const isImageFile = (fileType: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(fileType);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    folder: "articles" | "profiles" = "articles"
  ): Promise<UploadResult> => {
    setUploadProgress({ progress: 0, isUploading: true });

    try {
      const result = await uploadFile(file, userId, folder, (progress) => {
        setUploadProgress({ progress, isUploading: true });
      });

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