import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getArticle, Article, getArticleVersions, ArticleVersion } from '../lib/articles';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Clock,
  Tag,
  Folder,
  History
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { SaveArticleButton } from '../components/SaveArticleButton';

export const ArticleView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, isInfoWriter } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (id) {
      loadArticle(id);
    }
  }, [id]);

  const loadArticle = async (articleId: string) => {
    setLoading(true);
    try {
      const loadedArticle = await getArticle(articleId);
      if (loadedArticle) {
        // Check if article is published or user owns it
        if (loadedArticle.status !== 'published' && 
            loadedArticle.authorId !== userProfile?.uid && 
            userProfile?.role !== 'admin') {
          toast.error('Article not found or not accessible');
          navigate('/dashboard');
          return;
        }
        setArticle(loadedArticle);
        
        // Load versions if user can edit
        if (canEdit(loadedArticle)) {
          const articleVersions = await getArticleVersions(articleId);
          setVersions(articleVersions);
        }
      } else {
        toast.error('Article not found');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Error loading article');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = (article: Article): boolean => {
    if (!isInfoWriter || !userProfile) return false;
    return article.authorId === userProfile.uid || userProfile.role === 'admin';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Article not found</h2>
        <Link
          to="/dashboard"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-3">
          {/* Save Article Button for Users */}
          <SaveArticleButton article={article} />

          {canEdit(article) && (
            <>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <History className="h-4 w-4" />
                <span>History</span>
              </button>

              <Link
                to={`/article/edit/${article.id}`}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Article Content */}
      <article className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
        {/* Status Badge */}
        {article.status !== 'published' && (
          <div className="mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              article.status === 'draft' 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {article.status === 'draft' ? 'Draft' : 'Archived'}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
          {article.title}
        </h1>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>By {article.authorName}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>
              Published {formatDistanceToNow(article.publishedAt || article.createdAt)} ago
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>
              Updated {formatDistanceToNow(article.updatedAt)} ago
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Version {article.version}</span>
          </div>
        </div>

        {/* Categories and Tags */}
        {(article.categories.length > 0 || article.tags.length > 0) && (
          <div className="mb-8 space-y-3">
            {article.categories.length > 0 && (
              <div className="flex items-center flex-wrap gap-2">
                <Folder className="h-4 w-4 text-gray-500" />
                {article.categories.map((category) => (
                  <span
                    key={category}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}

            {article.tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>

      {/* Version History */}
      {showVersions && versions.length > 0 && (
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Version History</h3>
          <div className="space-y-4">
            {versions.map((version) => (
              <div key={version.id} className="border-l-2 border-blue-200 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    Version {version.version}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(version.createdAt, 'PPpp')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Updated by {version.createdBy}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};