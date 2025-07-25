import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  saveArticle,
  unsaveArticle,
  isArticleSaved,
} from "../lib/savedArticles";
import { Article, getArticle } from "../lib/articles";
import { Bookmark, BookmarkCheck } from "lucide-react";
import toast from "react-hot-toast";

interface SaveArticleButtonProps {
  // New interface - supports both old SaveButton props and new SaveArticleButton props
  article?: Article;
  articleId?: string;
  articleTitle?: string;
  articleAuthor?: string;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export const SaveArticleButton: React.FC<SaveArticleButtonProps> = ({
  article,
  articleId,
  articleTitle,
  articleAuthor,
  className = "",
  showLabel = false,
  size = "md",
}) => {
  const { userProfile, isAuthenticated } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Determine the article ID to use
  const currentArticleId = article?.id || articleId;

  // Check if article is already saved
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!userProfile?.uid || !isAuthenticated || !currentArticleId) {
        setChecking(false);
        return;
      }

      try {
        const saved = await isArticleSaved(userProfile.uid, currentArticleId);
        setIsSaved(saved);
      } catch (error) {
        console.error("Error checking saved status:", error);
      } finally {
        setChecking(false);
      }
    };

    checkSavedStatus();
  }, [userProfile?.uid, currentArticleId, isAuthenticated]);

  const handleToggleSave = async () => {
    if (!userProfile?.uid || !isAuthenticated || !currentArticleId) {
      toast.error("Please login to save articles");
      return;
    }

    setLoading(true);
    try {
      if (isSaved) {
        await unsaveArticle(userProfile.uid, currentArticleId);
        setIsSaved(false);
        toast.success("Article removed from saved articles");
      } else {
        // If we have the full article object, use it directly
        if (article) {
          await saveArticle(userProfile.uid, article);
        } else {
          // Otherwise, fetch the article data first (like the old SaveButton did)
          const fetchedArticle = await getArticle(currentArticleId);
          if (fetchedArticle) {
            await saveArticle(userProfile.uid, fetchedArticle);
          } else {
            throw new Error("Article not found");
          }
        }
        setIsSaved(true);
        toast.success("Article saved successfully!");
      }
    } catch (error) {
      console.error("Error toggling save status:", error);
      toast.error(
        isSaved ? "Failed to remove article" : "Failed to save article"
      );
    } finally {
      setLoading(false);
    }
  };

  // Don't show for non-authenticated users
  if (!isAuthenticated) {
    return null;
  }

  // Size classes for icons and buttons
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const buttonSizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  };

  if (checking) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        {showLabel && (
          <span className="text-sm text-gray-600">Checking...</span>
        )}
      </div>
    );
  }

  // Use compact styling when showLabel is false (like original SaveButton)
  if (!showLabel) {
    return (
      <button
        onClick={handleToggleSave}
        disabled={loading || !userProfile}
        className={`${buttonSizeClasses[size]} ${
          isSaved
            ? "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
        } rounded-lg transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={isSaved ? "Remove from saved" : "Save article"}
      >
        {loading ? (
          <div
            className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
          />
        ) : isSaved ? (
          <BookmarkCheck
            className={`${sizeClasses[size]} fill-current transition-all`}
          />
        ) : (
          <Bookmark className={`${sizeClasses[size]} transition-all`} />
        )}
      </button>
    );
  }

  // Full styling with label (like original SaveArticleButton)
  return (
    <button
      onClick={handleToggleSave}
      disabled={loading}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
        ${
          isSaved
            ? "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
            : "bg-white text-gray-700 hover:bg-purple-50 border border-gray-200 hover:border-purple-200"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isSaved ? "Remove from saved articles" : "Save article for later"}
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
          ? isSaved
            ? "Removing..."
            : "Saving..."
          : isSaved
          ? "Saved"
          : "Save Article"}
      </span>
    </button>
  );
};
