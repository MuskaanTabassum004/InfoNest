import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  getUserSavedArticles, 
  unsaveArticle, 
  SavedArticle,
  subscribeToUserSavedArticles 
} from '../lib/savedArticles';
import { 
  BookOpen, 
  Calendar, 
  User, 
  Bookmark, 
  BookmarkX,
  ArrowLeft,
  Tag,
  Folder
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const SavedArticles: React.FC = () => {
  const { userProfile } = useAuth();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Set up real-time subscription
    const unsubscribe = subscribeToUserSavedArticles(
      userProfile.uid,
      (articles) => {
        setSavedArticles(articles);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userProfile?.uid]);

  const handleUnsaveArticle = async (articleId: string) => {
    if (!userProfile?.uid) return;

    setRemovingArticle(articleId);
    try {
      await unsaveArticle(userProfile.uid, articleId);
      toast.success('Article removed from saved articles');
    } catch (error) {
      toast.error('Failed to remove article');
    } finally {
      setRemovingArticle(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Saved Articles
            </h1>
          </div>
          <p className="text-gray-600">
            Your personal collection of saved articles
          </p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Bookmark className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Saved</p>
              <p className="text-xl font-bold text-gray-900">{savedArticles.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Articles List */}
      {savedArticles.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
          <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No saved articles yet
          </h3>
          <p className="text-gray-600 mb-4">
            Start saving articles you want to read later or reference again.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Browse Articles</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedArticles.map((savedArticle) => (
            <div
              key={savedArticle.id}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-purple-200 transition-all duration-200 hover:shadow-lg group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Link
                    to={`/article/${savedArticle.articleId}`}
                    className="flex-1"
                  >
                    <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                      {savedArticle.articleTitle}
                    </h3>
                  </Link>
                  
                  <button
                    onClick={() => handleUnsaveArticle(savedArticle.articleId)}
                    disabled={removingArticle === savedArticle.articleId}
                    className="ml-2 p-1 text-purple-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Remove from saved articles"
                  >
                    {removingArticle === savedArticle.articleId ? (
                      <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <BookmarkX className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {savedArticle.articleExcerpt || 'No excerpt available'}
                </p>

                {/* Categories and Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {savedArticle.articleCategories.slice(0, 2).map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      <Folder className="h-3 w-3" />
                      <span>{category}</span>
                    </span>
                  ))}
                  {savedArticle.articleTags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      <Tag className="h-3 w-3" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{savedArticle.articleAuthor}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Saved {formatDistanceToNow(savedArticle.savedAt)} ago</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
