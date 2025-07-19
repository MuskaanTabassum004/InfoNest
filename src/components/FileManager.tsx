import React, { useState, useMemo } from "react";
import { Trash2, Eye, Download, File, Image, AlertTriangle } from "lucide-react";
import { deleteFile, isImageFile, formatFileSize } from "../lib/fileUpload";
import toast from "react-hot-toast";

export interface ManagedFile {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

interface FileManagerProps {
  files: ManagedFile[];
  onFileRemoved: (file: ManagedFile) => void;
  className?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  onFileRemoved,
  className = "",
}) => {
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDeleteFile = async (file: ManagedFile) => {
    if (confirmDelete !== file.path) {
      setConfirmDelete(file.path);
      return;
    }

    setDeletingFile(file.path);
    try {
      // Delete from Firebase Storage (handles already-deleted files gracefully)
      await deleteFile(file.path);

      // Remove from local state (always do this, even if file wasn't in storage)
      onFileRemoved(file);

      toast.success("File removed successfully!");
    } catch (error: any) {
      console.error("Error deleting file:", error);

      // Still remove from document even if storage deletion failed
      onFileRemoved(file);

      // Show appropriate error message
      if (error?.message?.includes('object-not-found')) {
        toast.success("File removed from document (was already deleted from storage)");
      } else {
        toast.error(`Failed to delete from storage: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setDeletingFile(null);
      setConfirmDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">Uploaded Files</h3>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {isImageFile(file.type) ? (
                  <Image className="h-5 w-5 text-blue-600" />
                ) : (
                  <File className="h-5 w-5 text-gray-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* View/Download Button */}
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="View/Download"
              >
                {isImageFile(file.type) ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </a>

              {/* Delete Button */}
              {confirmDelete === file.path ? (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDeleteFile(file)}
                    disabled={deletingFile === file.path}
                    className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                    title="Confirm Delete"
                  >
                    {deletingFile === file.path ? (
                      <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={cancelDelete}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Cancel"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDeleteFile(file)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete File"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook to extract files from article content (optimized with useMemo)
export const useArticleFiles = (content: string): ManagedFile[] => {
  return useMemo(() => {
    if (!content) return [];

    const extractPathFromUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        // Extract path from Firebase Storage URL format
        const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
        if (pathMatch) {
          const decodedPath = decodeURIComponent(pathMatch[1]);
          return decodedPath;
        }
        return '';
      } catch (error) {
        console.error("❌ Error parsing URL:", error);
        return '';
      }
    };

    const files: ManagedFile[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // Extract images
    const images = doc.querySelectorAll('img[src*="firebasestorage.googleapis.com"]');
    images.forEach((img) => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || 'Image';
      if (src) {
        files.push({
          url: src,
          path: extractPathFromUrl(src),
          name: alt,
          size: 0, // Size not available from HTML
          type: 'image/unknown'
        });
      }
    });

    // Extract file links
    const links = doc.querySelectorAll('a[href*="firebasestorage.googleapis.com"]');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent || 'File';
      if (href) {
        files.push({
          url: href,
          path: extractPathFromUrl(href),
          name: text.replace('📄 ', '').replace(/\s*\([^)]*\)$/, ''),
          size: 0, // Size not available from HTML
          type: text.includes('PDF') ? 'application/pdf' : 'application/unknown'
        });
      }
    });

    return files;
  }, [content]); // Only recalculate when content changes
};
