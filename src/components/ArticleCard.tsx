import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  User,
  Tag,
  Folder,
  Clock,
  Eye,
  Edit,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SaveArticleButton } from "./SaveArticleButton";
import { ShareButton } from "./ShareButton";
import { LikeButton } from "./LikeButton";

import { getUserProfile, UserProfile } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { Article, deleteArticleByRole } from "../lib/articles";
import { toast } from "react-hot-toast";

interface ArticleCardProps {
  article: Article;
  showStatus?: boolean; // For InfoWriter's own articles
  showActions?: boolean; // Show save/share buttons
  showEditButton?: boolean; // Show edit button for own articles
  variant?: "default" | "compact" | "featured";
  className?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  showStatus = false,
  showActions = true,
  showEditButton = false,
  variant = "default",
  className = "",
}) => {
  const { userProfile, canEditArticle, canDeleteArticle } = useAuth();
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [loadingAuthor, setLoadingAuthor] = useState(true);
  const [profilePicError, setProfilePicError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load author profile for profile picture
  useEffect(() => {
    const loadAuthorProfile = async () => {
      if (!article.authorId) {
        setLoadingAuthor(false);
        return;
      }

      try {
        const profile = await getUserProfile(article.authorId);
        setAuthorProfile(profile);
      } catch (error) {
        setAuthorProfile(null);
      } finally {
        setLoadingAuthor(false);
      }
    };

    loadAuthorProfile();
  }, [article.authorId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-700";
      case "draft":
        return "bg-yellow-100 text-yellow-700";
      case "unpublished":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const canEdit = () => {
    if (!userProfile) return false;
    return canEditArticle(article.authorId);
  };

  const canDelete = () => {
    if (!userProfile) return false;
    return canDeleteArticle(article.authorId, authorProfile?.role);
  };

  const handleDelete = async () => {
    if (!userProfile || !canDelete()) return;

    setDeleting(true);
    try {
      await deleteArticleByRole(
        article.id,
        userProfile.role,
        userProfile.uid,
        article.authorId,
        authorProfile?.role,
        "Article removed by administrator"
      );

      // Different success messages based on deletion type
      const isOwnArticle = userProfile.uid === article.authorId;
      const successMessage = isOwnArticle
        ? "Article deleted successfully"
        : "Article unpublished successfully";

      toast.success(successMessage);
      setShowDeleteConfirm(false);
      // Optionally trigger a refresh of the parent component
      window.location.reload();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Failed to delete article");
    } finally {
      setDeleting(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "compact":
        return "p-4";
      case "featured":
        return "p-8";
      default:
        return "p-6";
    }
  };

  const getImageClasses = () => {
    switch (variant) {
      case "compact":
        return "aspect-video h-32";
      case "featured":
        return "aspect-video h-48";
      default:
        return "aspect-video h-40";
    }
  };

  return (
    <div
      className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-blue-200 transition-all duration-200 hover:shadow-lg group ${getVariantClasses()} ${className}`}
    >
      <Link to={`/article/${article.id}`} className="flex-1">
      {/* Cover Image */}
      {article.coverImage && (
        <div
          className={`bg-gray-100 rounded-lg mb-4 overflow-hidden ${getImageClasses()}`}
        >
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Title and Status */}
      <div className="flex items-start justify-between mb-3">
        
          <h3
            className={`font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 ${
              variant === "featured"
                ? "text-xl"
                : variant === "compact"
                ? "text-base"
                : "text-lg"
            }`}
          >
            {article.title}
          </h3>
        

        {showStatus && (
          <span
            className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
              article.status
            )}`}
          >
            {article.status}
          </span>
        )}
      </div>

      {/* Author Information */}
      <div className="flex items-center space-x-3 mb-3">
        <Link
          to={`/author/${article.authorId}`}
          className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors group"
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking author
        >
          {/* Author Profile Picture */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 relative group-hover:ring-2 group-hover:ring-blue-200 transition-all">
            {loadingAuthor ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !profilePicError && authorProfile?.profilePicture ? (
              <img
                src={authorProfile.profilePicture}
                alt={`${article.authorName}'s profile`}
                className="w-full h-full object-cover"
                onError={() => setProfilePicError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all">
                <span className="text-blue-700 text-xs font-semibold">
                  {article.authorName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Author Name */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
              {article.authorName}
            </span>
            {authorProfile?.role && (
              <span className="text-xs text-gray-500 capitalize">
                {authorProfile.role === "infowriter" ? "InfoWriter" : authorProfile.role === "admin" ? "InfoWriter" : authorProfile.role}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Content Preview */}
      <p
        className={`text-gray-600 mb-4 line-clamp-3 ${
          variant === "compact" ? "text-sm" : "text-sm"
        }`}
      >
        {article.excerpt || "No excerpt available"}
      </p>

      {/* published Date */}
      <div className="flex items-center text-xs text-gray-500 mb-3">
        <Clock className="h-3 w-3 mr-1" />
        <span>Published {formatDistanceToNow(article.updatedAt)} ago</span>
      </div>

      {/* Category */}
      {article.categories.length > 0 && (
        <div className="flex items-center mb-3">
          <Folder className="h-3 w-3 text-gray-400 mr-1" />
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            {article.categories[0]}
          </span>
        </div>
      )}

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {article.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center"
            >
              <Tag className="h-2 w-2 mr-1" />
              {tag}
            </span>
          ))}
          {article.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{article.tags.length - 3} more
            </span>
          )}
        </div>
      )}
        </Link>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {showActions && (
            <React.Fragment key="article-actions">
              <SaveArticleButton
                key={`save-${article.id}`}
                articleId={article.id}
                articleTitle={article.title}
                articleAuthor={article.authorName}
                size="sm"
              />
              <LikeButton
                key={`like-${article.id}`}
                articleId={article.id}
                initialLikes={article.likes || 0}
                initialLikedBy={article.likedBy || []}
                size="sm"
                showLabel={true}
              />
            </React.Fragment>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {showEditButton && canEdit() && (
            <Link
              to={`/article/edit/${article.id}`}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Article"
            >
              <Edit className="h-4 w-4" />
            </Link>
          )}

          {/* Delete Button */}
          {canDelete() && (
            <div className="relative">
              {showDeleteConfirm ? (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Confirm Delete"
                  >
                    {deleting ? (
                      <div className="h-4 w-4 animate-spin border-2 border-red-600 border-t-transparent rounded-full" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={
                    userProfile?.uid === article.authorId
                      ? "Delete Article"
                      : "Unpublish Article"
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
        
    </div>
  );
};
