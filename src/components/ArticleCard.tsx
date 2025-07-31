import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Tag,
  Folder,
  Clock,
  Edit,
  FileText,
  Trash2,
  AlertTriangle,
  MoreVertical,
  EyeOff,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { SaveArticleButton } from "./SaveArticleButton";
import { LikeButton } from "./LikeButton";
import { useAuth } from "../hooks/useAuth";
import { Article, deleteArticleByRole, updateArticle } from "../lib/articles";
import { UserProfile } from "../lib/auth";
import { toast } from "react-hot-toast";
import { onSnapshot, doc } from "firebase/firestore";
import { firestore } from "../lib/firebase";

interface ArticleCardProps {
  article: Article;
  showStatus?: boolean; // For InfoWriter's own articles
  showActions?: boolean; // Show save/share buttons
  showEditButton?: boolean; // Show edit button for own articles
  showManagementMenu?: boolean; // Show three-dot menu for article management
  variant?: "default" | "compact" | "featured";
  className?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article: initialArticle,
  showStatus = false,
  showActions = true,
  showEditButton = false,
  showManagementMenu = false,
  variant = "default",
  className = "",
}) => {
  const { userProfile, canEditArticle, canDeleteArticle } = useAuth();
  const [profilePicError, setProfilePicError] = useState(false);
  const [article, setArticle] = useState(initialArticle);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Real-time article updates
  useEffect(() => {
    const articleRef = doc(firestore, "articles", initialArticle.id);
    const unsubscribe = onSnapshot(articleRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const updatedArticle = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          publishedAt: data.publishedAt?.toDate(),
        } as Article;
        setArticle(updatedArticle);
      }
    });

    return () => unsubscribe();
  }, [initialArticle.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        const target = event.target as Element;
        const dropdown = document.querySelector(
          `[data-dropdown-id="${article.id}"]`
        );
        const button = document.querySelector(
          `[data-dropdown-button="${article.id}"]`
        );

        if (
          dropdown &&
          !dropdown.contains(target) &&
          button &&
          !button.contains(target)
        ) {
          setShowDropdown(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown, article.id]);

  // Real-time author profile updates
  useEffect(() => {
    if (!initialArticle.authorId) return;

    const userRef = doc(firestore, "users", initialArticle.authorId);
    const unsubscribe = onSnapshot(
      userRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const profile = {
            uid: initialArticle.authorId,
            email: data.email || "",
            displayName: data.displayName || "",
            role: data.role || "user",
            emailVerified: data.emailVerified || false,
            profilePicture: data.profilePicture || "",
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            requestedWriterAccess: data.requestedWriterAccess || false,
          };
          setAuthorProfile(profile);

          // Reset profile picture error when new profile picture is available
          if (data.profilePicture) {
            setProfilePicError(false);
          }
        } else {
          setAuthorProfile(null);
        }
      },
      (error) => {
        // Silently handle permission errors
        if (error.code !== "permission-denied") {
          console.error(
            `Error subscribing to author profile ${initialArticle.authorId}:`,
            error
          );
        }
        setAuthorProfile(null);
      }
    );

    return () => unsubscribe();
  }, [initialArticle.authorId]);

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

  const handleStatusChange = async (newStatus: "published" | "unpublished") => {
    if (!userProfile?.uid) {
      toast.error("You must be logged in to update articles");
      return;
    }

    setUpdatingStatus(true);
    try {
      const updateData: any = {
        status: newStatus,
      };

      // Only set publishedAt when transitioning to published
      if (newStatus === "published") {
        updateData.publishedAt = new Date();
      }

      await updateArticle(article.id, updateData);

      // Update local state
      setArticle((prev) => ({
        ...prev,
        status: newStatus,
        publishedAt: newStatus === "published" ? new Date() : prev.publishedAt,
      }));

      const statusText =
        newStatus === "published" ? "published" : "unpublished";
      toast.success(`Article ${statusText} successfully`);
    } catch (error) {
      console.error("Error updating article status:", error);
      toast.error(
        `Error updating article status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setUpdatingStatus(false);
      setShowDropdown(false);
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
      className={`bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-blue-200 transition-all duration-200 hover:shadow-lg group flex flex-col h-full ${getVariantClasses()} ${className}`}
    >
      <Link to={`/article/${article.id}`} className="flex-1 flex flex-col">
        {/* Cover Image - Only show if exists */}
        {article.coverImage && (
          <div
            className={`bg-gray-100 rounded-lg mb-4 overflow-hidden ${getImageClasses()} flex-shrink-0`}
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

        {/* Title and Status - Fixed Height */}
        <div className="flex items-start justify-between mb-3 min-h-[3rem]">
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
              className={`ml-2 px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ${getStatusColor(
                article.status
              )}`}
            >
              {article.status}
            </span>
          )}
        </div>

        {/* Author Information - Fixed Height */}
        <div className="flex items-center space-x-3 mb-3 min-h-[2.5rem]">
          <Link
            to={`/author/${article.authorId}`}
            className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors group"
            onClick={(e) => e.stopPropagation()} // Prevent card click when clicking author
          >
            {/* Author Profile Picture */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 relative group-hover:ring-2 group-hover:ring-blue-200 transition-all">
              {!profilePicError && authorProfile?.profilePicture ? (
                <img
                  src={authorProfile.profilePicture}
                  alt={`${
                    authorProfile?.displayName || article.authorName
                  }'s profile`}
                  className="w-full h-full object-cover"
                  onError={() => setProfilePicError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all">
                  <span className="text-blue-700 text-xs font-semibold">
                    {(authorProfile?.displayName || article.authorName)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Author Name */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                {authorProfile?.displayName || article.authorName}
              </span>
              {authorProfile?.role && (
                <span className="text-xs text-gray-500 capitalize">
                  {authorProfile.role === "infowriter"
                    ? "InfoWriter"
                    : authorProfile.role === "admin"
                    ? "InfoWriter"
                    : authorProfile.role}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Content Preview - Flexible Height based on image presence */}
        <p
          className={`text-gray-600 mb-4 flex-grow ${
            variant === "compact" ? "text-sm" : "text-sm"
          } ${article.coverImage ? "line-clamp-3" : "line-clamp-6"}`}
          style={{
            minHeight: article.coverImage ? "3.75rem" : "7.5rem",
          }}
        >
          {article.excerpt || "No excerpt available"}
        </p>

        {/* Updated Date */}
        <div className="flex items-center text-xs text-gray-500 mb-3">
          <Clock className="h-3 w-3 mr-1" />
          <span>Updated: {format(article.updatedAt, "dd/MM/yyyy")}</span>
        </div>

        {/* Category - Fixed Height */}
        <div className="mb-3 min-h-[1.5rem] flex items-center">
          {article.categories.length > 0 && (
            <>
              <Folder className="h-3 w-3 text-gray-400 mr-1" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {article.categories[0]}
              </span>
            </>
          )}
        </div>

        {/* Tags - Fixed Height */}
        <div className="mb-4 min-h-[2rem] flex items-start">
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
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
        </div>
      </Link>

      {/* Actions - Fixed at bottom */}
      <div className="flex items-center justify-between mt-auto pt-2">
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

          {/* Actions Menu */}
          {showManagementMenu &&
            (canDelete() ||
              (userProfile &&
                (userProfile.role === "admin" ||
                  userProfile.role === "infowriter"))) && (
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
                  <>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      data-dropdown-button={article.id}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                      title="More Actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {showDropdown && (
                      <div
                        data-dropdown-id={article.id}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                      >
                        <div className="py-1">
                          {article.status === "published" &&
                            userProfile &&
                            (userProfile.role === "admin" ||
                              userProfile.uid === article.authorId) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange("unpublished");
                                }}
                                disabled={updatingStatus}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center space-x-2 disabled:opacity-50"
                              >
                                <EyeOff className="h-4 w-4" />
                                <span>Unpublish</span>
                              </button>
                            )}

                          {article.status === "unpublished" &&
                            userProfile &&
                            (userProfile.role === "admin" ||
                              userProfile.uid === article.authorId) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange("published");
                                }}
                                disabled={updatingStatus}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center space-x-2 disabled:opacity-50"
                              >
                                <Send className="h-4 w-4" />
                                <span>Publish</span>
                              </button>
                            )}

                          {canDelete() && (
                            <>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                onClick={() => {
                                  setShowDeleteConfirm(true);
                                  setShowDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
