import React, { useState, useRef } from "react";
import { Upload, X, File, Image, AlertCircle, CheckCircle } from "lucide-react";
import {
  uploadFile,
  validateFile,
  formatFileSize,
  isImageFile,
  UploadResult,
} from "../lib/fileUpload";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

interface FileUploadProps {
  onUploadComplete: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  folder?: "articles" | "profiles";
  className?: string;
  children?: React.ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  accept = "image/*,.pdf,.txt,.doc,.docx",
  folder = "articles",
  className = "",
  children,
}) => {
  const { userProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }

    if (!userProfile) {
      const error = "Please login to upload files";
      toast.error(error);
      onUploadError?.(error);
      return;
    }

    // Prevent duplicate uploads
    if (isUploading) {
      console.log("⚠️ Upload already in progress, ignoring duplicate request");
      return;
    }

    const file = files[0];
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    const fileHash = `${file.name}_${file.size}_${file.type}`;

    // Prevent uploading the same file twice in a row
    if (lastUploadedFile === fileId) {
      console.log("⚠️ Same file already uploaded recently, ignoring duplicate");
      toast.warning("This file was just uploaded. Please wait before uploading again.");
      return;
    }

    // Prevent uploading the same file multiple times (by content signature)
    if (uploadedFiles.has(fileHash)) {
      console.log("⚠️ File with same content already uploaded, ignoring duplicate");
      toast.warning("A file with the same name, size, and type has already been uploaded.");
      return;
    }

    console.log("📁 File selected:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      fileId: fileId,
      fileHash: fileHash
    });

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      const error = validation.error || "Invalid file";
      console.error("❌ File validation failed:", error);
      toast.error(error);
      onUploadError?.(error);
      return;
    }

    console.log("✅ File validation passed");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log("🚀 Starting upload process...");
      const result = await uploadFile(
        file,
        userProfile.uid,
        folder,
        (progress) => {
          console.log("📊 Upload progress:", progress + "%");
          setUploadProgress(progress);
        }
      );

      console.log("🎉 Upload completed successfully:", result);
      setLastUploadedFile(fileId); // Track this file as uploaded
      setUploadedFiles(prev => new Set([...prev, fileHash])); // Track file content signature

      // Clear the recent upload tracking after 5 seconds to allow re-uploading if needed
      setTimeout(() => {
        setLastUploadedFile(null);
      }, 5000);

      toast.success("File uploaded successfully!");
      onUploadComplete(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      console.error("💥 Upload error:", errorMessage);
      toast.error(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);

      // Clear the file input to allow re-uploading the same file later if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
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
          disabled={isUploading}
        />
        {isUploading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="text-center">
                <Upload className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Uploading File
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {uploadProgress}% complete
                </p>
              </div>
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
            : isUploading
            ? "border-gray-300 bg-gray-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isUploading ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Uploading...
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {uploadProgress}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to upload
              </h3>
              <p className="text-sm text-gray-600">
                Supports images, PDFs, and documents up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple file upload button component
export const FileUploadButton: React.FC<{
  onUploadComplete: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  folder?: "articles" | "profiles";
  className?: string;
  children: React.ReactNode;
}> = ({ children, ...props }) => {
  return <FileUpload {...props}>{children}</FileUpload>;
};

// File preview component
export const FilePreview: React.FC<{
  file: UploadResult;
  onRemove?: () => void;
  className?: string;
}> = ({ file, onRemove, className = "" }) => {
  const isImage = isImageFile(file.type);

  return (
    <div
      className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg ${className}`}
    >
      <div className="flex-shrink-0">
        {isImage ? (
          <Image className="h-8 w-8 text-blue-600" />
        ) : (
          <File className="h-8 w-8 text-gray-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
