import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserArticles, deleteArticle, Article } from '../lib/articles';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Search,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const MyArticles: React.FC = () => {
  const { userProfile, isInfoWriter } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isInfoWriter && userProfile) {
      loadArticles();
    }
  }, [isInfoWriter, userProfile]);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, statusFilter]);

  const loadArticles = async () => {
    if (!userProfile) return;
    
    setLoading(true);
    try {
      const userArticles = await getUserArticles(userProfile.uid);
      setArticles(userArticles);
    } catch (error) {
      toast.error('Error loading articles');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(article => article.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.categories.some(cat => cat.toLowerCase().includes(query)) ||
        article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredArticles(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteArticle(id);
      setArticles(prev => prev.filter(article => article.id !== id));
      toast.success('Article deleted successfully');
    } catch (error) {
      toast.error('Error deleting article');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isInfoWriter) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
        <p className="text-gray-600">You need InfoWriter access to view this page.</p>
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          My Articles
        </h1>
        <Link
          to="/article/new"
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Article</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{articles.length}</div>
          <div className="text-sm text-gray-600">Total Articles</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">
            {articles.filter(a => a.status === 'published').length}
          </div>
          <div className="text-sm text-green-600">Published</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">
            {articles.filter(a => a.status === 'draft').length}
          </div>
          <div className="text-sm text-yellow-600">Drafts</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-700">
            {articles.filter(a => a.status === 'archived').length}
          </div>
          <div className="text-sm text-gray-600">Archived</div>
        </div>
      </div>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {articles.length === 0 ? 'No articles yet' : 'No articles match your filters'}
          </h3>
          <p className="text-gray-600 mb-6">
            {articles.length === 0 
              ? 'Start creating your first article to share knowledge with your team.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {articles.length === 0 && (
            <Link
              to="/article/new"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Article</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:border-blue-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {article.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(article.status)}`}>
                      {article.status}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {article.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.categories.slice(0, 3).map((category) => (
                      <span
                        key={category}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Updated {formatDistanceToNow(article.updatedAt)} ago</span>
                    <span className="mx-2">•</span>
                    <span>Version {article.version}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    to={`/article/${article.id}`}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Article"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>

                  <Link
                    to={`/article/edit/${article.id}`}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Article"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={() => setDeleteConfirm(article.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Article
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this article? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};