import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Eye, X, Monitor, Smartphone } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Version {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  deviceInfo: string;
  wordCount: number;
  changesSummary: string;
}

interface VersionHistoryProps {
  articleId: string;
  onRestore: (version: Version) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  articleId,
  onRestore,
  onClose,
  isOpen
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && articleId) {
      loadVersionHistory();
    }
  }, [isOpen, articleId]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from your backend
      // For now, we'll simulate version history from localStorage
      const mockVersions: Version[] = [
        {
          id: '1',
          title: 'Getting Started with React Hooks',
          content: '<p>React Hooks are a powerful feature...</p>',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          deviceInfo: 'Chrome on Windows (Desktop)',
          wordCount: 1250,
          changesSummary: 'Added introduction and examples'
        },
        {
          id: '2',
          title: 'Getting Started with React Hooks',
          content: '<p>React Hooks are a powerful feature that allows...</p>',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          deviceInfo: 'Safari on iPhone (Mobile)',
          wordCount: 980,
          changesSummary: 'Updated code examples'
        },
        {
          id: '3',
          title: 'React Hooks Guide',
          content: '<p>This guide covers React Hooks...</p>',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          deviceInfo: 'Chrome on MacOS (Desktop)',
          wordCount: 750,
          changesSummary: 'Initial draft creation'
        }
      ];
      
      setVersions(mockVersions);
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    if (deviceInfo.includes('Mobile') || deviceInfo.includes('iPhone') || deviceInfo.includes('Android')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Version History</h2>
                <p className="text-blue-100 text-sm">
                  View and restore previous versions of your article
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Version List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Recent Versions
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading versions...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version, index) => (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedVersion?.id === version.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          Version {versions.length - index}
                        </span>
                        <div className="flex items-center space-x-1 text-gray-400">
                          {getDeviceIcon(version.deviceInfo)}
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1 mb-1">
                        {version.title}
                      </h4>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>{formatDistanceToNow(version.timestamp, { addSuffix: true })}</p>
                        <p>{version.wordCount} words</p>
                        <p className="line-clamp-1">{version.changesSummary}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Version Preview */}
          <div className="flex-1 flex flex-col">
            {selectedVersion ? (
              <>
                {/* Preview Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedVersion.title}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{format(selectedVersion.timestamp, 'PPp')}</span>
                        <span>•</span>
                        <span>{selectedVersion.wordCount} words</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          {getDeviceIcon(selectedVersion.deviceInfo)}
                          <span>{selectedVersion.deviceInfo}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onRestore(selectedVersion)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Restore This Version</span>
                    </button>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Version
                  </h3>
                  <p className="text-gray-600">
                    Choose a version from the list to preview its content
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};