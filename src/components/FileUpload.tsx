import React, { useState, useRef } from 'react';
import { uploadFile, FileUploadResult, formatFileSize, isImageFile } from '../lib/storage';
import { Upload, X, File, Image, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onFileUploaded: (file: FileUploadResult) => void;
  onFileRemoved: (fileName: string) => void;
  uploadedFiles: FileUploadResult[];
  maxFiles?: number;
  path: string;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  onFileRemoved,
  uploadedFiles,
  maxFiles = 5,
  path,
  accept = "image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFile(file, path);
        onFileUploaded(result);
        toast.success(`${file.name} uploaded successfully`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (fileName: string) => {
    onFileRemoved(fileName);
    toast.success('File removed');
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Upload className="h-6 w-6 text-blue-600" />
          </div>
          
          {uploading ? (
            <div className="space-y-2">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-600">Uploading files...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-700 font-medium">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports images, PDFs, documents (max 10MB each, {maxFiles} files max)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Limit Warning */}
      {uploadedFiles.length >= maxFiles && (
        <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            Maximum file limit reached ({maxFiles} files)
          </p>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded">
                    {isImageFile(file.fileName) ? (
                      <Image className="h-4 w-4 text-blue-600" />
                    ) : (
                      <File className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isImageFile(file.fileName) && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Preview
                    </a>
                  )}
                  <button
                    onClick={() => handleRemoveFile(file.fileName)}
                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};