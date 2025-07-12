import React, { useState } from 'react';
import { FileUpload, FilePreview } from './FileUpload';
import { UploadResult } from '../lib/fileUpload';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const QuickUploadTest: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleUploadComplete = (result: UploadResult) => {
    console.log('✅ Upload test successful:', result);
    setUploadedFiles(prev => [...prev, result]);
    setLastError(null);
  };

  const handleUploadError = (error: string) => {
    console.error('❌ Upload test failed:', error);
    setLastError(error);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Upload className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Quick Upload Test</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Test file upload functionality. Check browser console for detailed logs.
      </p>

      <FileUpload
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        accept="image/*,.pdf,.txt,.doc,.docx"
        folder="articles"
        className="mb-4"
      />

      {lastError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Upload Failed</p>
            <p className="text-sm text-red-700">{lastError}</p>
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-gray-900">Successfully Uploaded Files</h4>
          </div>
          
          {uploadedFiles.map((file, index) => (
            <div key={index} className="space-y-2">
              <FilePreview
                file={file}
                onRemove={() => removeFile(index)}
                className="bg-green-50 border-green-200"
              />
              
              <div className="text-xs text-gray-500 pl-4 space-y-1">
                <p><strong>URL:</strong> <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{file.url}</a></p>
                <p><strong>Path:</strong> {file.path}</p>
                <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                <p><strong>Type:</strong> {file.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length === 0 && !lastError && (
        <div className="text-center py-4">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No files uploaded yet. Try uploading a file above.</p>
        </div>
      )}
    </div>
  );
};
