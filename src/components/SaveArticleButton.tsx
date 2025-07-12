import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  saveArticle, 
  unsaveArticle, 
  isArticleSaved 
} from '../lib/savedArticles';
import { Article } from '../lib/articles';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface SaveArticleButtonProps {
  article: Article;
  className?: string;
}

export const SaveArticleButton: React.FC<SaveArticleButtonProps> = ({ 
  article, 
  className = '' 
}) => {
  const { userProfile, isUser } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if article is already saved
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!userProfile?.uid || !isUser) {
        setChecking(false);
        return;
      }

      try {
        const saved = await isArticleSaved(userProfile.uid, article.id);
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking saved status:', error);
      } finally {
        setChecking(false);
      }
    };

    checkSavedStatus();
  }, [userProfile?.uid, article.id, isUser]);

  const handleToggleSave = async () => {
    if (!userProfile?.uid || !isUser) {
      toast.error('Please login to save articles');
      return;
    }

    setLoading(true);
    try {
      if (isSaved) {
        await unsaveArticle(userProfile.uid, article.id);
        setIsSaved(false);
        toast.success('Article removed from saved articles');
      } else {
        await saveArticle(userProfile.uid, article);
        setIsSaved(true);
        toast.success('Article saved successfully!');
      }
    } catch (error) {
      toast.error(isSaved ? 'Failed to remove article' : 'Failed to save article');
    } finally {
      setLoading(false);
    }
  };

  // Don't show for non-users
  if (!isUser) {
    return null;
  }

  if (checking) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-600">Checking...</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggleSave}
      disabled={loading}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
        ${isSaved 
          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200' 
          : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200 hover:border-purple-200'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isSaved ? 'Remove from saved articles' : 'Save article for later'}
    >
      {loading ? (
        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isSaved ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">
        {loading 
          ? (isSaved ? 'Removing...' : 'Saving...') 
          : (isSaved ? 'Saved' : 'Save Article')
        }
      </span>
    </button>
  );
};
