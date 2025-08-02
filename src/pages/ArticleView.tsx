import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getArticle, Article, hardDeleteArticle } from "../lib/articles";
import { UserProfile } from "../lib/auth";
import {
  ArrowLeft,
  Edit,
  Calendar,
  User,
  Clock,
  Tag,
  Folder,
  MessageCircle,
  Eye,
  Share2,
  Download,
  Heart,
  ChevronDown,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";
import { SaveArticleButton } from "../components/SaveArticleButton";
import { ShareButton } from "../components/ShareButton";
import {
  CommentSection,
  CommentButton,
  useCommentSection,
} from "../components/CommentSection";
import { onSnapshot, doc, updateDoc, increment } from "firebase/firestore";
import { firestore } from "../lib/firebase";

import { processLayoutSpecificCaptions } from "../lib/tiptap/utils/captionProcessor";

// Helper function to extract original filename from storage URL
const extractOriginalFilename = (url: string): string => {
  try {
    // Decode URL first to handle encoded characters
    const decodedUrl = decodeURIComponent(url);

    // Extract filename from URL (last part after /)
    const filename = decodedUrl.split("/").pop() || "";

    // Remove query parameters if any
    const cleanFilename = filename.split("?")[0];

    // Remove temp prefix if present
    let processedName = cleanFilename.replace(/^temp_/, "");

    // Split by underscore to find timestamp
    const parts = processedName.split("_");

    if (parts.length >= 2) {
      // Last part should be timestamp with extension (e.g., "1754137025165.pdf")
      const lastPart = parts[parts.length - 1];

      // Check if last part looks like timestamp with extension
      const timestampPattern = /^\d{13,}\.[\w]+$/; // 13+ digits followed by extension

      if (timestampPattern.test(lastPart)) {
        // Remove timestamp, keep original name parts
        const originalParts = parts.slice(0, -1);
        let originalName = originalParts.join("_");

        // Get extension from timestamp part
        const extension = lastPart.split(".").pop();

        // Restore spaces and special characters for better readability
        originalName = originalName
          .replace(/_/g, " ") // Convert underscores back to spaces
          .replace(/\s+/g, " ") // Normalize multiple spaces
          .trim();

        // Add extension back
        return `${originalName}.${extension}`;
      }
    }

    // Fallback: clean up the filename for display
    return processedName
      .replace(/_/g, " ") // Convert underscores to spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim() || "Download";

  } catch (error) {
    console.error("Error extracting filename:", error);
    return "Download";
  }
};

export const ArticleView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    userProfile,
    canEditArticle,
    canReadArticle,
    loading: authLoading,
  } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewsIncremented, setViewsIncremented] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likingInProgress, setLikingInProgress] = useState(false);

  // Attachments collapse state (default: collapsed)
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteNote, setDeleteNote] = useState("");

  // Comment section state
  const commentSection = useCommentSection(article?.id || "");

  useEffect(() => {
    // Wait for auth to load before attempting to load article
    // This ensures userProfile is available for permission checks
    if (id && !authLoading) {
      loadArticle(id);
    }
  }, [id, authLoading]);

  const loadArticle = async (articleId: string) => {
    setLoading(true);
    try {
      const loadedArticle = await getArticle(articleId);
      if (loadedArticle) {
        // For published articles, anyone can read them
        // For draft articles, we need to ensure userProfile is loaded before checking permissions
        if (loadedArticle.status !== "published") {
          // If userProfile is still loading, wait a bit and retry
          if (!userProfile && !authLoading) {
            toast.error("Authentication required to view this article");
            navigate("/dashboard");
            return;
          }
          // If userProfile is loaded, check permissions
          if (
            userProfile &&
            !canReadArticle(loadedArticle.status, loadedArticle.authorId)
          ) {
            toast.error("Article not found or not accessible");
            navigate("/dashboard");
            return;
          }
        }
        setArticle(loadedArticle);

        // Initialize like state
        setLikeCount(loadedArticle.likes || 0);
        setIsLiked(
          loadedArticle.likedBy?.includes(userProfile?.uid || "") || false
        );

        // Author profile is now loaded via real-time hook

        // Increment view count (only once per session)
        if (!viewsIncremented && loadedArticle.status === "published") {
          try {
            const articleRef = doc(firestore, "articles", articleId);
            await updateDoc(articleRef, {
              views: increment(1),
            });
            setViewsIncremented(true);
          } catch (error) {
            console.error("Error incrementing views:", error);
          }
        }
      } else {
        toast.error("Article not found");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("Error loading article");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Real-time article updates
  useEffect(() => {
    if (!id) return;

    const articleRef = doc(firestore, "articles", id);
    const unsubscribe = onSnapshot(
      articleRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const updatedArticle = {
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            publishedAt: data.publishedAt?.toDate(),
          } as Article;
          setArticle(updatedArticle);

          // Update like state in real-time
          setLikeCount(updatedArticle.likes || 0);
          setIsLiked(
            updatedArticle.likedBy?.includes(userProfile?.uid || "") || false
          );
        } else {
          // Article has been deleted - redirect to dashboard
          toast.error("This article has been removed");
          navigate("/dashboard");
        }
      },
      (error) => {
        // Handle permission errors silently
        if (error.code === "permission-denied") {
          console.warn("Permission denied for article subscription - article may be private or user not authenticated");
          navigate("/dashboard");
          return;
        }
        console.error("Error in article subscription:", error);
        toast.error("Error loading article");
        navigate("/dashboard");
      }
    );

    return () => unsubscribe();
  }, [id, userProfile?.uid]);

  // Real-time author profile updates
  useEffect(() => {
    if (!article?.authorId) return;

    const userRef = doc(firestore, "users", article.authorId);
    const unsubscribe = onSnapshot(
      userRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const profile: UserProfile = {
            uid: article.authorId,
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
        } else {
          setAuthorProfile(null);
        }
      },
      (error) => {
        // Silently handle permission errors
        if (error.code !== "permission-denied") {
          console.error(
            `Error subscribing to author profile ${article.authorId}:`,
            error
          );
        }
        setAuthorProfile(null);
      }
    );

    return () => unsubscribe();
  }, [article?.authorId]);

  const canEdit = (article: Article): boolean => {
    if (!userProfile) return false;
    return canEditArticle(article.authorId, article.status);
  };

  // Check if user can delete this article
  const canDelete = (article: Article): boolean => {
    if (!userProfile) return false;

    // Admins can delete any article
    if (userProfile.role === "admin") return true;

    // InfoWriters can delete their own articles
    if (userProfile.role === "infowriter" && userProfile.uid === article.authorId) return true;

    return false;
  };

  // Handle article deletion
  const handleDelete = async () => {
    if (!article || !userProfile || !canDelete(article)) return;

    setDeleting(true);
    try {
      const isOwnArticle = userProfile.uid === article.authorId;
      const deleteReason = isOwnArticle
        ? "Article deleted by author"
        : (deleteNote.trim() || "Article removed by administrator");

      // Import deleteArticleByRole
      const { deleteArticleByRole } = await import("../lib/articles");

      await deleteArticleByRole(
        article.id,
        userProfile.role,
        userProfile.uid,
        article.authorId,
        authorProfile?.role,
        deleteReason
      );

      toast.success("Article deleted successfully");
      setShowDeleteConfirm(false);
      setDeleteNote(""); // Reset the note

      // Navigate back to appropriate page
      if (userProfile.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/my-articles");
      }
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Failed to delete article");
    } finally {
      setDeleting(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!userProfile) {
      toast.error("Please log in to like articles");
      return;
    }

    if (!article || likingInProgress) return;

    setLikingInProgress(true);
    try {
      const articleRef = doc(firestore, "articles", article.id);
      const userId = userProfile.uid;
      const currentLikedBy = article.likedBy || [];

      if (isLiked) {
        // Unlike: remove user from likedBy array and decrement likes
        await updateDoc(articleRef, {
          likes: increment(-1),
          likedBy: currentLikedBy.filter((id) => id !== userId),
        });
      } else {
        // Like: add user to likedBy array and increment likes
        await updateDoc(articleRef, {
          likes: increment(1),
          likedBy: [...currentLikedBy, userId],
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    } finally {
      setLikingInProgress(false);
    }
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Article not found
        </h2>
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
    <>
      <style>{`
        /* Custom Image Layout Styles for Article View */
        .prose .custom-image {
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          height: auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .prose .custom-image:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        /* Enhanced prose styling */
        .prose h2 {
          margin-top: 2.5rem;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .prose h2::before {
          content: '';
          position: absolute;
          left: -1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 1.5rem;
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 2px;
        }

        .prose p {
          margin-bottom: 1.5rem;
        }

        .prose ul, .prose ol {
          margin-bottom: 1.5rem;
        }

        .prose li {
          margin-bottom: 0.5rem;
        }

        /* Full Column Width Layout */
        .prose .image-full-column {
          max-width: calc(100% + 32px);
          width: auto;
          display: block;
          margin: 16px -16px;
          border-radius: 8px;
        }

        /* Outset Layout - extends beyond column boundaries */
        .prose .image-outset {
          max-width: 120%;
          width: auto;
          display: block;
          margin: 16px auto;
          margin-left: -10%;
          margin-right: -10%;
        }

        /* Full Screen Width Layout - Constrained to content area */
        .prose .image-full-screen {
          width: calc(100% + 32px);
          max-width: calc(100% + 32px);
          display: block;
          margin: 16px -16px;
          border-radius: 8px;
          box-sizing: border-box;
        }

        /* Image Grid Layouts */
        .prose .image-grid-item {
          display: inline-block;
          margin: 4px;
          border-radius: 8px;
          vertical-align: top;
        }

        /* 2-image grid */
        .prose .image-grid-item:nth-child(2n) {
          width: calc(50% - 8px);
        }

        /* 3-image grid */
        .prose .image-grid-item:nth-child(3n) {
          width: calc(33.333% - 8px);
        }

        /* 4+ image grid */
        .prose .image-grid-item:nth-child(4n) {
          width: calc(25% - 8px);
        }

        /* Grid container */
        .prose .image-grid-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 16px 0;
          justify-content: center;
        }

        /* Responsive grid adjustments */
        @media (max-width: 768px) {
          .prose .image-outset {
            max-width: 100%;
            margin-left: 0;
            margin-right: 0;
          }

          .prose .image-full-screen {
            width: 100%;
            margin-left: 0;
            margin-right: 0;
            padding: 0;
          }

          .prose .image-grid-item:nth-child(n) {
            width: calc(50% - 8px);
          }
        }

        @media (max-width: 480px) {
          .prose .image-grid-item:nth-child(n) {
            width: 100%;
            margin: 4px 0;
          }
        }

        /* Professional Document Styling */
        .prose {
          font-family: 'Georgia', 'Times New Roman', serif;
          color: #1a1a1a;
          max-width: none;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
        }

        .prose p {
          margin-bottom: 1.5em;
          text-align: left;
          line-height: 1.8;
          font-size: 18px;
        }

        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          font-family: 'Helvetica Neue', 'Arial', sans-serif;
          font-weight: 600;
          color: #111827;
          margin-top: 2.5em;
          margin-bottom: 1em;
          line-height: 1.3;
        }

        .prose h1 {
          font-size: 2.25rem;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }

        .prose h2 {
          font-size: 1.875rem;
        }

        .prose h3 {
          font-size: 1.5rem;
        }

        .prose blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1.5rem;
          margin: 2rem 0;
          font-style: italic;
          color: #4b5563;
          background-color: #f8fafc;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }

        .prose ul, .prose ol {
          margin: 1.5rem 0;
          padding-left: 2rem;
        }

        .prose li {
          margin: 0.75rem 0;
          line-height: 1.7;
        }

        /* Image Caption Styles - now handled by JavaScript processor */
        .prose .image-figure-container {
          margin: 24px auto;
          text-align: center;
          display: block;
        }

        .prose .image-caption-text {
          margin-top: 16px;
          margin-bottom: 24px;
          font-size: 0.9rem;
          color: #6b7280;
          font-style: italic;
          line-height: 1.5;
          text-align: center;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 24px;
          box-sizing: border-box;
          font-family: 'Helvetica Neue', 'Arial', sans-serif;
        }

        /* Prose content styling for text visibility and alignment */
        .prose {
          color: #374151;
          line-height: 1.75;
          max-width: none;
          margin: 0 auto;
        }

        .prose p {
          margin-top: 1.25em;
          margin-bottom: 1.25em;
          color: #374151;
          text-align: left;
        }

        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: #111827;
          font-weight: 600;
          line-height: 1.25;
          margin-top: 2em;
          margin-bottom: 1em;
        }

        .prose h1 { font-size: 2.25em; }
        .prose h2 { font-size: 1.875em; }
        .prose h3 { font-size: 1.5em; }
        .prose h4 { font-size: 1.25em; }

        .prose ul, .prose ol {
          margin-top: 1.25em;
          margin-bottom: 1.25em;
          padding-left: 1.625em;
          color: #374151;
        }

        .prose li {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }

        .prose blockquote {
          font-style: italic;
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1.6em 0;
          color: #6b7280;
        }

        .prose code {
          background-color: #f3f4f6;
          padding: 0.125em 0.25em;
          border-radius: 0.25em;
          font-size: 0.875em;
          color: #dc2626;
        }

        .prose pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1.5em 0;
        }

        .prose pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
        }

        .prose a {
          color: #2563eb;
          text-decoration: underline;
        }

        .prose a:hover {
          color: #1d4ed8;
        }

        .prose strong {
          font-weight: 600;
          color: #111827;
        }

        .prose em {
          font-style: italic;
        }

        /* Content Overflow Prevention */
        .prose * {
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
        }

        .prose img {
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain;
        }

        .prose table {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          display: block;
          white-space: nowrap;
        }

        .prose table tbody {
          display: table;
          width: 100%;
        }

        .prose pre {
          max-width: 100%;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .prose code {
          word-break: break-all;
          white-space: pre-wrap;
        }

        .prose iframe,
        .prose video,
        .prose embed,
        .prose object {
          max-width: 100% !important;
          height: auto !important;
        }

        /* Long URLs and links */
        .prose a {
          word-break: break-all;
          overflow-wrap: break-word;
        }

        /* Figure and image containers */
        .prose figure {
          max-width: 100%;
          overflow: hidden;
        }

        .prose figure img {
          max-width: 100%;
          height: auto;
        }

        /* Responsive Design for Mobile Devices */
        @media (max-width: 768px) {
          .prose {
            font-size: 16px;
            line-height: 1.7;
            overflow-x: hidden;
          }

          .prose h1 {
            font-size: 1.875rem;
          }

          .prose h2 {
            font-size: 1.5rem;
          }

          .prose h3 {
            font-size: 1.25rem;
          }

          .prose p {
            text-align: left;
            margin-bottom: 1.25em;
          }

          .prose blockquote {
            padding: 1rem;
            margin: 1.5rem 0;
          }

          .prose .image-caption-text {
            padding: 0 16px;
            font-size: 0.85rem;
          }

          .prose table {
            font-size: 14px;
            display: block;
            overflow-x: auto;
            white-space: nowrap;
            max-width: 100%;
          }

          .prose pre {
            font-size: 14px;
            padding: 0.75rem;
            overflow-x: auto;
            max-width: 100%;
          }

          .prose code {
            font-size: 13px;
            word-break: break-all;
          }
        }

        @media (max-width: 480px) {
          .prose {
            font-size: 15px;
            overflow-x: hidden;
            max-width: 100vw;
          }

          .prose h1 {
            font-size: 1.5rem;
            word-break: break-word;
          }

          .prose h2 {
            font-size: 1.25rem;
            word-break: break-word;
          }

          .prose .image-caption-text {
            padding: 0 12px;
          }

          .prose table {
            font-size: 12px;
            max-width: calc(100vw - 2rem);
          }

          .prose pre {
            font-size: 12px;
            max-width: calc(100vw - 2rem);
            padding: 0.5rem;
          }

          .prose img {
            max-width: calc(100vw - 2rem) !important;
          }

          .prose a {
            word-break: break-all;
            hyphens: auto;
          }
        }

        /* Legacy image styles for backward compatibility */
        .prose img:not(.custom-image) {
          border-radius: 8px;
          max-width: 100%;
          height: auto;
          display: block;
          margin: 12px auto;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              // Use browser back navigation to preserve authentication state
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                // Fallback to homepage if no history
                navigate("/");
              }
            }}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors hover:bg-gray-50 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            {/* Save Article Button for Users */}
            <SaveArticleButton article={article} />

            {/* Share Article Button */}
            <ShareButton
              articleId={article.id}
              articleTitle={article.title}
              showLabel={true}
            />

            {canEdit(article) && (
              <Link
                to={`/article/edit/${article.id}`}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Link>
            )}

            {canDelete(article) && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Article Content */}
        <article className="bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          {/* Cover Image */}
          {article.coverImage && (
            <div className="aspect-video bg-gray-100 overflow-hidden">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8 lg:p-12">
            {/* Status Badge */}
            {article.status !== "published" && (
              <div className="mb-6">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    article.status === "draft"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {article.status === "draft" ? "Draft" : "Unpublished"}
                </span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent mb-8 leading-tight tracking-tight">
              {article.title}
            </h1>

            {/* Author Profile & Metadata */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center space-x-4">
                {/* Author Profile */}
                <Link
                  to={`/author/${article.authorId}`}
                  className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors group"
                >
                  {authorProfile?.profilePicture ? (
                    <img
                      src={authorProfile.profilePicture}
                      alt={authorProfile.displayName || article.authorName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center group-hover:from-blue-600 group-hover:to-purple-700 transition-all">
                      <User className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {authorProfile?.displayName || article.authorName}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                      {authorProfile?.role
                        ? authorProfile.role === "infowriter"
                          ? "InfoWriter"
                          : authorProfile.role === "admin"
                          ? "InfoWriter"
                          : authorProfile.role
                        : "Author"}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Article Actions */}
              <div className="flex items-center space-x-3">
                <CommentButton
                  commentCount={commentSection.commentCount}
                  onClick={commentSection.toggle}
                  className="data-comment-button"
                />

                <button
                  onClick={handleLikeToggle}
                  disabled={likingInProgress}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isLiked
                      ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                      : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
                  />
                  <span className="text-sm">{likeCount}</span>
                </button>
              </div>
            </div>

            {/* Article Stats */}
            <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Updated: {format(article.updatedAt, "dd/MM/yyyy")}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>{article.views || 0} views</span>
              </div>
            </div>

            {/* Categories and Tags */}
            {(article.categories.length > 0 || article.tags.length > 0) && (
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-6">
                  {article.categories.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Categories:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {article.categories.map((category) => (
                          <span
                            key={category}
                            className="px-3 py-1 border border-[#1D4ED8] text-[#1D4ED8] rounded-full text-sm font-medium hover:text-[#1D4ED8]/80 transition-colors"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {article.tags.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Tags:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {article.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 border border-[#7C3AED] text-[#7C3AED] rounded-full text-sm hover:text-[#7C3AED]/80 transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="w-full pt-4 pb-8 px-4 overflow-hidden">
              <div
                className="prose prose-lg max-w-none mx-auto prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-purple-600 prose-code:bg-purple-50 prose-pre:bg-gray-900 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50"
                style={{
                  fontSize: "18px",
                  lineHeight: "1.8",
                  letterSpacing: "0.01em",
                  overflowWrap: "break-word",
                  wordWrap: "break-word",
                  maxWidth: "100%",
                }}
                dangerouslySetInnerHTML={{
                  __html: processLayoutSpecificCaptions(article.content),
                }}
              />
            </div>

            {/* Attachments */}
            {((article.attachments && article.attachments.length > 0) ||
              (article.attachmentMetadata && article.attachmentMetadata.length > 0)) && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                {/* Collapsible Header */}
                <button
                  onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)}
                  className="flex items-center justify-between w-full mb-4 p-2 -m-2 rounded-lg hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 group"
                  aria-expanded={isAttachmentsExpanded}
                  aria-controls="attachments-content"
                  aria-label={`${isAttachmentsExpanded ? 'Collapse' : 'Expand'} attachments section`}
                >
                  <div className="flex items-center space-x-2">
                    <Download className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      Attachments ({article.attachmentMetadata?.length || article.attachments?.length || 0})
                    </h3>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform duration-300 ease-in-out ${
                      isAttachmentsExpanded ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>

                {/* Collapsible Content */}
                <div
                  id="attachments-content"
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isAttachmentsExpanded
                      ? 'max-h-screen opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                  style={{
                    transitionProperty: 'max-height, opacity, margin',
                    marginTop: isAttachmentsExpanded ? '0' : '0',
                  }}
                >
                  <div className={`space-y-3 transition-all duration-300 ease-in-out ${
                    isAttachmentsExpanded ? 'pb-2 pt-1' : 'pb-0 pt-0'
                  }`}>
                    {/* Display new format with metadata if available */}
                    {article.attachmentMetadata && article.attachmentMetadata.length > 0 ? (
                      article.attachmentMetadata.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl border border-blue-100 hover:border-blue-200 transition-all duration-200 group"
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:from-blue-600 group-hover:to-purple-700 transition-all">
                            <Download className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors block truncate">
                              {attachment.originalName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB • ` : ''}Click to download
                            </span>
                          </div>
                        </a>
                      ))
                    ) : (
                      /* Fallback to legacy format for backward compatibility */
                      article.attachments?.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl border border-blue-100 hover:border-blue-200 transition-all duration-200 group"
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:from-blue-600 group-hover:to-purple-700 transition-all">
                            <Download className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors block truncate">
                              {extractOriginalFilename(attachment)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Click to download
                            </span>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Comment Section */}
        {article && (
          <div className="mt-8" data-comment-section>
            <CommentSection
              articleId={article.id}
              isOpen={commentSection.isOpen}
              onToggle={commentSection.toggle}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Article
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{article?.title}"? This action cannot be undone.
            </p>

            {/* Show note input only for admin deleting other's articles */}
            {userProfile?.role === "admin" && userProfile.uid !== article?.authorId && (
              <div className="mb-4">
                <label htmlFor="deleteNote" className="block text-sm font-medium text-gray-700 mb-2">
                  Deletion Note (optional)
                </label>
                <textarea
                  id="deleteNote"
                  value={deleteNote}
                  onChange={(e) => setDeleteNote(e.target.value)}
                  placeholder="Provide a reason for deletion (will be sent to the author)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {deleteNote.length}/500 characters
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteNote("");
                }}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deleting ? (
                  <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span>Delete Article</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
