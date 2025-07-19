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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { SaveArticleButton } from "../components/SaveArticleButton";
import { ShareButton } from "../components/ShareButton";
import { onSnapshot, doc, updateDoc, increment } from "firebase/firestore";
import { firestore } from "../lib/firebase";

export const ArticleView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, isInfoWriter } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewsIncremented, setViewsIncremented] = useState(false);

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
        if (
          loadedArticle.status !== "published" &&
          loadedArticle.authorId !== userProfile?.uid &&
          userProfile?.role !== "admin"
        ) {
          toast.error("Article not found or not accessible");
          navigate("/dashboard");
          return;
        }
        setArticle(loadedArticle);

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
      }
    });

    return () => unsubscribe();
  }, [id]);

  const canEdit = (article: Article): boolean => {
    if (!isInfoWriter || !userProfile) return false;
    return article.authorId === userProfile.uid || isAdmin;
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
          <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Author Profile & Metadata */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center space-x-4">
              {/* Author Profile */}
              <div className="flex items-center space-x-3">
                {authorProfile?.profilePicture ? (
                  <img
                    src={authorProfile.profilePicture}
                    alt={authorProfile.displayName || article.authorName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {authorProfile?.displayName || article.authorName}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">
                    {authorProfile?.role || "Author"}
                  </p>
                </div>
              </div>
            </div>

            {/* Article Actions */}
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Comment</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                <Share2 className="h-4 w-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>
          </div>

          {/* Article Stats */}
          <div className="flex flex-wrap items-center gap-6 mb-8 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                Published{" "}
                {formatDistanceToNow(article.publishedAt || article.createdAt)}{" "}
                ago
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Updated {formatDistanceToNow(article.updatedAt)} ago</span>
            </div>

            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>{article.views || 0} views</span>
            </div>
          </div>

          {/* Categories and Tags */}
          {(article.categories.length > 0 || article.tags.length > 0) && (
            <div className="mb-8 space-y-4">
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

          {/* Attachments */}
          {article.attachments && article.attachments.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-3">
                <Download className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Attachments
                </span>
              </div>
              <div className="space-y-2">
                {article.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600 hover:text-blue-800">
                      {attachment.split("/").pop() || "Download"}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </article>
    </div>
  );
};
