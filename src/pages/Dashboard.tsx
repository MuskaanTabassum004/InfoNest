import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPublishedArticles, getUserArticles, Article } from '../lib/articles';
import { requestWriterAccess } from '../lib/auth';
import { SearchBar } from '../components/SearchBar';
import { 
  BookOpen, 
  PenTool, 
  Clock, 
  User,
  ArrowRight,
  TrendingUp,
  Star,
  Plus,
  Calendar,
  Tag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const { userProfile, isInfoWriter, isUser, refreshProfile } = useAuth();
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [myArticles, setMyArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const published = await getPublishedArticles();
        setPublishedArticles(published.slice(0, 6)); // Show 6 recent articles

        if (isInfoWriter && userProfile) {
          const my = await getUserArticles(userProfile.uid);
          setMyArticles(my.slice(0, 4)); // Show 4 recent articles
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isInfoWriter, userProfile]);

  const handleRequestWriterAccess = async () => {
    if (!userProfile) return;

    try {
      await requestWriterAccess(userProfile.uid);
      await refreshProfile();
      toast.success('Writer access requested! An admin will review your request.');
    } catch (error) {
      toast.error('Error requesting writer access');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Welcome to InfoNest
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your centralized knowledge management platform. Discover, learn, and contribute to our growing library of documentation.
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{publishedArticles.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {isInfoWriter && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">My Articles</p>
                <p className="text-2xl font-bold text-gray-900">{myArticles.length}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <PenTool className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Your Role</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{userProfile?.role}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <User className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Writer Access Request */}
      {isUser && !userProfile?.requestedWriterAccess && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Want to contribute content?
              </h3>
              <p className="text-gray-600">
                Request InfoWriter access to create and manage articles.
              </p>
            </div>
            <button
              onClick={handleRequestWriterAccess}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2"
            >
              <PenTool className="h-4 w-4" />
              <span>Request Access</span>
            </button>
          </div>
        </div>
      )}

      {/* Pending Request Notice */}
      {userProfile?.requestedWriterAccess && (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800">
                Writer Access Request Pending
              </h3>
              <p className="text-amber-700">
                Your request for InfoWriter access is being reviewed by an administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {isInfoWriter && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/article/new"
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl transition-all group"
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create New Article</h3>
                <p className="text-sm text-gray-600">Start writing a new documentation</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 ml-auto" />
            </Link>

            <Link
              to="/my-articles"
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-xl transition-all group"
            >
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Manage Articles</h3>
                <p className="text-sm text-gray-600">Edit and organize your content</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 ml-auto" />
            </Link>
          </div>
        </div>
      )}

      {/* My Recent Articles (InfoWriter) */}
      {isInfoWriter && myArticles.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Recent Articles</h2>
            <Link
              to="/my-articles"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myArticles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="block p-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-700 line-clamp-1">
                    {article.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    article.status === 'published' 
                      ? 'bg-green-100 text-green-700'
                      : article.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {article.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(article.updatedAt)} ago
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Articles</h2>
          <Link
            to="/search"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>Browse all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {publishedArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles yet</h3>
            <p className="text-gray-600">
              Be the first to contribute to the knowledge base!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedArticles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="block bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 rounded-xl p-6 border border-gray-200 hover:border-blue-200 transition-all group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {article.categories.slice(0, 2).map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                  {article.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>By {article.authorName}</span>
                  <span>{formatDistanceToNow(article.publishedAt || article.createdAt)} ago</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};