import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  getUserSavedArticles,
  unsaveArticle,
  SavedArticle,
  subscribeToUserSavedArticles,
} from "../lib/savedArticles";
import {
  BookOpen,
  Calendar,
  User,
  Bookmark,
  BookmarkX,
  ArrowLeft,
  Tag,
  Folder,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { ShareButton } from "../components/ShareButton";
import { ArticleCard } from "../components/ArticleCard";
import { Article } from "../lib/articles";

// Helper function to convert SavedArticle to Article format for ArticleCard
const convertSavedArticleToArticle = (savedArticle: SavedArticle): Article => ({
  id: savedArticle.articleId,
  title: savedArticle.articleTitle,
  content: "", // Not needed for card display
  excerpt: savedArticle.articleExcerpt || "",
  status: "published" as const, // Saved articles are always published
  authorId: savedArticle.articleAuthorId || "", // Now available for profile loading
  authorName: savedArticle.articleAuthor,
  categories: savedArticle.articleCategories || [],
  tags: savedArticle.articleTags || [],
  createdAt: savedArticle.articleUpdatedAt || savedArticle.savedAt, // Use article's actual creation date
  updatedAt: savedArticle.articleUpdatedAt || savedArticle.savedAt, // Use article's actual updated date
  publishedAt:
    savedArticle.articlePublishedAt ||
    savedArticle.articleUpdatedAt ||
    savedArticle.savedAt,
  slug: "", // Not needed for card display
  coverImage: savedArticle.articleCoverImage, // Now available for display
  views: 0,
  shareCount: 0,
  attachments: [],
});

export const SavedArticles: React.FC = () => {
  // SavedArticles component with real-time updates and proper error handling
  const {
    userProfile,
    isInfoWriter,
    isAdmin,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingArticle, setRemovingArticle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Don't start loading saved articles until auth is complete
    if (authLoading) return;

    // If no user after auth is complete, stop loading
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }

    // Set up real-time subscription
    const unsubscribe = subscribeToUserSavedArticles(
      userProfile.uid,
      (articles) => {
        setSavedArticles(articles);
        setFilteredArticles(articles);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userProfile?.uid, authLoading]);

  // Filter articles based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredArticles(savedArticles);
    } else {
      const filtered = savedArticles.filter(
        (article) =>
          article.articleTitle
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          article.articleAuthor
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (article.articleExcerpt || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (article.articleCategories || []).some((cat) =>
            cat.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          (article.articleTags || []).some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
      setFilteredArticles(filtered);
    }
  }, [searchQuery, savedArticles]);

  const handleUnsaveArticle = async (articleId: string) => {
    if (!userProfile?.uid) return;

    setRemovingArticle(articleId);
    try {
      await unsaveArticle(userProfile.uid, articleId);
      toast.success("Article removed from saved articles");
    } catch (error) {
      toast.error("Failed to remove article");
    } finally {
      setRemovingArticle(null);
    }
  };

  // Show loading while auth is loading or while saved articles are loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? "Loading..." : "Loading saved articles..."}
          </p>
        </div>
      </div>
    );
  }

  // Show access denied if user is not authenticated
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            Please log in to view your saved articles.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
                  <p className="text-xl font-bold text-gray-900">
                    {savedArticles.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          {savedArticles.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
              <ExpandableSearchBar
                variant="default"
                placeholder="Search saved articles by title, author, category, or tag..."
                onResultClick={() => {}}
              />
            </div>
          )}

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
                to="/"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                <span>Browse Articles</span>
              </Link>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or browse all saved articles.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Bookmark className="h-4 w-4" />
                <span>Show All Saved</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((savedArticle) => (
                <div key={savedArticle.id} className="relative group">
                  <ArticleCard
                    article={convertSavedArticleToArticle(savedArticle)}
                    variant="default"
                    showActions={true}
                    className="hover:border-purple-200 pb-12" // Extra padding for saved date badge
                  />

                  {/* Unsave Button - positioned over the card */}
                  <button
                    onClick={() => handleUnsaveArticle(savedArticle.articleId)}
                    disabled={removingArticle === savedArticle.articleId}
                    className="absolute top-3 right-3 p-2 text-purple-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 bg-white/95 backdrop-blur-sm shadow-md border border-purple-200 hover:border-red-200 opacity-0 group-hover:opacity-100"
                    title="Remove from saved articles"
                  >
                    {removingArticle === savedArticle.articleId ? (
                      <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <BookmarkX className="h-4 w-4" />
                    )}
                  </button>

                  {/* Saved Date Badge - positioned at bottom of card */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm border border-purple-200 flex items-center justify-center">
                      <Bookmark className="h-3 w-3 mr-1.5" />
                      Saved {formatDistanceToNow(savedArticle.savedAt)} ago
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
