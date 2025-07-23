import React, { useState } from 'react';
import { AlertTriangle, Users, Clock, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConflictData {
  localVersion: {
    title: string;
    content: string;
    lastModified: Date;
    deviceInfo: string;
  };
  serverVersion: {
    title: string;
    content: string;
    lastModified: Date;
    authorName: string;
  };
}

interface ConflictResolutionProps {
  conflict: ConflictData;
  onResolve: (resolution: 'local' | 'server' | 'merge') => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conflict,
  onResolve,
  onCancel,
  isOpen
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge' | null>(null);
  const [showPreview, setShowPreview] = useState<'local' | 'server' | null>(null);

  if (!isOpen) return null;

  const getWordCount = (content: string) => {
    return content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Editing Conflict Detected
              </h2>
              <p className="text-orange-100 text-sm">
                This article has been modified elsewhere. Choose how to resolve the conflict.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Conflict Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Local Version */}
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-blue-900">Your Local Changes</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Clock className="h-3 w-3" />
                  <span>
                    Modified {formatDistanceToNow(conflict.localVersion.lastModified, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-blue-600">Device: {conflict.localVersion.deviceInfo}</p>
                <p className="text-blue-600">Words: {getWordCount(conflict.localVersion.content)}</p>
              </div>

              <div className="mt-3">
                <h4 className="font-medium text-blue-900 mb-1">Title:</h4>
                <p className="text-sm text-blue-800 line-clamp-2">
                  {conflict.localVersion.title}
                </p>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <button
                  onClick={() => setShowPreview(showPreview === 'local' ? null : 'local')}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {showPreview === 'local' ? 'Hide' : 'Preview'} Content
                </button>
                <button
                  onClick={() => setSelectedResolution('local')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedResolution === 'local'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <Check className="h-3 w-3" />
                  <span>Use This Version</span>
                </button>
              </div>
            </div>

            {/* Server Version */}
            <div className="border border-green-200 rounded-xl p-4 bg-green-50">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-green-600 p-1.5 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-green-900">Server Version</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-green-700">
                  <Clock className="h-3 w-3" />
                  <span>
                    Modified {formatDistanceToNow(conflict.serverVersion.lastModified, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-green-600">Author: {conflict.serverVersion.authorName}</p>
                <p className="text-green-600">Words: {getWordCount(conflict.serverVersion.content)}</p>
              </div>

              <div className="mt-3">
                <h4 className="font-medium text-green-900 mb-1">Title:</h4>
                <p className="text-sm text-green-800 line-clamp-2">
                  {conflict.serverVersion.title}
                </p>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <button
                  onClick={() => setShowPreview(showPreview === 'server' ? null : 'server')}
                  className="text-xs text-green-600 hover:text-green-800 underline"
                >
                  {showPreview === 'server' ? 'Hide' : 'Preview'} Content
                </button>
                <button
                  onClick={() => setSelectedResolution('server')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedResolution === 'server'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  <Check className="h-3 w-3" />
                  <span>Use This Version</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content Preview */}
          {showPreview && (
            <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <div className={`px-4 py-2 text-sm font-medium ${
                showPreview === 'local' 
                  ? 'bg-blue-100 text-blue-900' 
                  : 'bg-green-100 text-green-900'
              }`}>
                {showPreview === 'local' ? 'Your Local Version' : 'Server Version'} - Content Preview
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: showPreview === 'local' 
                      ? conflict.localVersion.content 
                      : conflict.serverVersion.content 
                  }}
                />
              </div>
            </div>
          )}

          {/* Merge Option */}
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50 mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="bg-purple-600 p-1.5 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold text-purple-900">Manual Merge</h3>
            </div>
            
            <p className="text-sm text-purple-700 mb-3">
              Keep both versions and manually merge the changes in the editor. 
              Your local changes will be preserved, and you can manually incorporate 
              changes from the server version.
            </p>

            <button
              onClick={() => setSelectedResolution('merge')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedResolution === 'merge'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              <Check className="h-3 w-3" />
              <span>Merge Manually</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>

            <button
              onClick={() => selectedResolution && onResolve(selectedResolution)}
              disabled={!selectedResolution}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>Resolve Conflict</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};