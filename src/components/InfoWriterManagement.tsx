import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAllInfoWriters, removeInfoWriterAccess, UserProfile } from '../lib/auth';
import { getUserArticles } from '../lib/articles';
import { 
  Users, 
  Search, 
  UserMinus,
  Calendar,
  BookOpen,
  Mail,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export const InfoWriterManagement: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [infoWriters, setInfoWriters] = useState<UserProfile[]>([]);
  const [filteredWriters, setFilteredWriters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState<UserProfile | null>(null);
  const [writerStats, setWriterStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isAdmin) {
      loadInfoWriters();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterAndSortWriters();
  }, [infoWriters, searchQuery, sortBy, sortOrder]);

  const loadInfoWriters = async () => {
    setLoading(true);
    try {
      const writers = await getAllInfoWriters();
      setInfoWriters(writers);
      
      // Load article counts for each writer
      const stats: Record<string, number> = {};
      await Promise.all(
        writers.map(async (writer) => {
          try {
            const articles = await getUserArticles(writer.uid);
            stats[writer.uid] = articles.length;
          } catch (error) {
            stats[writer.uid] = 0;
          }
        })
      );
      setWriterStats(stats);
    } catch (error) {
      toast.error('Error loading InfoWriters');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortWriters = () => {
    let filtered = infoWriters;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(writer =>
        writer.displayName?.toLowerCase().includes(query) ||
        writer.email.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.displayName || a.email).toLowerCase();
          bValue = (b.displayName || b.email).toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredWriters(filtered);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRemoveAccess = async (writer: UserProfile) => {
    if (!userProfile) return;

    setProcessingUser(writer.uid);
    try {
      await removeInfoWriterAccess(writer.uid);
      setInfoWriters(prev => prev.filter(w => w.uid !== writer.uid));
      setConfirmRemoval(null);
      toast.success(`InfoWriter access removed from ${writer.displayName || writer.email}`);
    } catch (error) {
      toast.error('Error removing InfoWriter access');
    } finally {
      setProcessingUser(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">InfoWriter Management</h2>
        <p className="text-gray-600">Manage InfoWriter accounts and permissions</p>
      </div>

      {/* Search and Stats */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{infoWriters.length}</div>
            <div className="text-sm text-blue-600">Active InfoWriters</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {Object.values(writerStats).reduce((sum, count) => sum + count, 0)}
            </div>
            <div className="text-sm text-green-600">Total Articles</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">
              {infoWriters.filter(w => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return w.createdAt > weekAgo;
              }).length}
            </div>
            <div className="text-sm text-purple-600">New This Week</div>
          </div>
        </div>
      </div>

      {/* InfoWriters Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    {sortBy === 'email' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Articles
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Joined</span>
                    {sortBy === 'createdAt' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWriters.map((writer) => (
                <tr key={writer.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {writer.displayName || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">InfoWriter</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{writer.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {writerStats[writer.uid] || 0} articles
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{format(writer.createdAt, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(writer.createdAt)} ago
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setConfirmRemoval(writer)}
                      disabled={processingUser === writer.uid}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      <UserMinus className="h-4 w-4" />
                      <span>Remove Access</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredWriters.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No InfoWriters found</h3>
            <p className="text-gray-600">
              {infoWriters.length === 0 
                ? 'No InfoWriters have been approved yet.'
                : 'No InfoWriters match your search criteria.'}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmRemoval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Remove InfoWriter Access
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove InfoWriter access from{' '}
              <strong>{confirmRemoval.displayName || confirmRemoval.email}</strong>?
              This will revert their role to "User" and they will lose the ability to create and manage articles.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmRemoval(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveAccess(confirmRemoval)}
                disabled={processingUser === confirmRemoval.uid}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {processingUser === confirmRemoval.uid ? 'Removing...' : 'Remove Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};