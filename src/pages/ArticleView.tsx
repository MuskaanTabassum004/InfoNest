import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getArticle, Article } from "../lib/articles";
import { getUserProfile, UserProfile } from "../lib/auth";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { SaveArticleButton } from "../components/SaveArticleButton";
import { ShareButton } from "../components/ShareButton";
import { CommentSection, CommentButton, useCommentSection } from "../components/CommentSection";
import { onSnapshot, doc, updateDoc, increment } from "firebase/firestore";
import { firestore } from "../lib/firebase";

import { processLayoutSpecificCaptions } from "../lib/tiptap/utils/captionProcessor";

export const ArticleView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, canEditArticle, canReadArticle, loading: authLoading } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewsIncremented, setViewsIncremented] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likingInProgress, setLikingInProgress] = useState(false);

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
          if (userProfile && !canReadArticle(loadedArticle.status, loadedArticle.authorId)) {
            toast.error("Article not found or not accessible");
            navigate("/dashboard");
            return;
          }
        }
        setArticle(loadedArticle);

        // Initialize like state
        setLikeCount(loadedArticle.likes || 0);
        setIsLiked(loadedArticle.likedBy?.includes(userProfile?.uid || '') || false);

        // Load author profile
        try {
          const author = await getUserProfile(loadedArticle.authorId);
          setAuthorProfile(author);
        } catch (error) {
          console.error("Error loading author profile:", error);
        }

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
    const unsubscribe = onSnapshot(articleRef, (doc) => {
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
        setIsLiked(updatedArticle.likedBy?.includes(userProfile?.uid || '') || false);
      }
    });

    return () => unsubscribe();
  }, [id, userProfile?.uid]);

  const canEdit = (article: Article): boolean => {
    if (!userProfile) return false;
    return canEditArticle(article.authorId);
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
          likedBy: currentLikedBy.filter(id => id !== userId)
        });
      } else {
        // Like: add user to likedBy array and increment likes
        await updateDoc(articleRef, {
          likes: increment(1),
          likedBy: [...currentLikedBy, userId]
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
        }

        /* Full Column Width Layout */
        .prose .image-full-column {
          max-width: calc(100% + 64px);
          width: auto;
          display: block;
          margin: 16px -32px;
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

        /* Full Screen Width Layout */
        .prose .image-full-screen {
          width: 100vw;
          max-width: none;
          display: block;
          margin: 16px 0;
          margin-left: calc(-50vw + 50%);
          margin-right: calc(-50vw + 50%);
          padding: 0 20px;
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
        }

        .prose p {
          margin-bottom: 1.5em;
          text-align: justify;
          text-justify: inter-word;
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

        /* Responsive Design for Mobile Devices */
        @media (max-width: 768px) {
          .prose {
            font-size: 16px;
            line-height: 1.7;
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
        }

        @media (max-width: 480px) {
          .prose {
            font-size: 15px;
          }

          .prose h1 {
            font-size: 1.5rem;
          }

          .prose h2 {
            font-size: 1.25rem;
          }

          .prose .image-caption-text {
            padding: 0 12px;
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
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
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
        </div>
      </div>

      {/* Article Content */}
      <article className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200">
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

        <div className="p-8">
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 leading-tight">
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
                    {authorProfile?.role ?
                     (authorProfile.role === "infowriter" ? "InfoWriter" : authorProfile.role === "admin" ? "InfoWriter" : authorProfile.role) :
                     "Author"}
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
                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`}
                />
                <span className="text-sm">{likeCount}</span>
              </button>
            </div>
          </div>

          {/* Article Stats */}
          <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
            

            <div className="flex items-center space-x-2">
              
              <Calendar className="h-4 w-4" />
              <span>Published {formatDistanceToNow(article.updatedAt)} ago</span>
            </div>

            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>{article.views || 0} views</span>
            </div>
          </div>

          {/* Categories and Tags */}
          {(article.categories.length > 0 || article.tags.length > 0) && (
            <div className="mb-4 space-y-4">
              {article.categories.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Folder className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Categories
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.categories.map((category) => (
                      <span
                        key={category}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {article.tags.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="w-full pt-2 pb-6">
            <div
              className="prose prose-lg max-w-none mx-auto px-8"
              style={{
                fontSize: '18px',
                lineHeight: '1.8',
                letterSpacing: '0.01em'
              }}
              dangerouslySetInnerHTML={{ __html: processLayoutSpecificCaptions(article.content) }}
            />
          </div>

          {/* Attachments */}
          {article.attachments && article.attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Download className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Attachments
                </h3>
              </div>
              <div className="space-y-3">
                {article.attachments.map((attachment, index) => (
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
                        {attachment.split("/").pop() || "Download"}
                      </span>
                      <span className="text-xs text-gray-500">
                        Click to download
                      </span>
                    </div>
                  </a>
                ))}
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
    </>
  );
};