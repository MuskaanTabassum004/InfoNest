import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { updateArticle, Article } from "../lib/articles";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { firestore } from "../lib/firebase";
import {
  Plus,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  Search,
  Filter,
  Send,
  FileText,
  MoreVertical,
  CheckCircle,
  Clock,
  Loader2,
  Shield,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { ArticleCard } from "../components/ArticleCard";
import { ExpandableSearchBar } from "../components/ExpandableSearchBar";

export const MyArticles: React.FC = () => {
  const {
    userProfile,
    isInfoWriter,
    isAdmin,
    loading: authLoading,
    canCreateArticles,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published" | "unpublished" | "archive"
  >("all");

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Handle URL parameters for filtering
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (
      statusParam &&
      ["draft", "published", "unpublished", "archive"].includes(statusParam)
    ) {
      setStatusFilter(
        statusParam as "draft" | "published" | "unpublished" | "archive"
      );
    } else {
      setStatusFilter("all");
    }
  }, [searchParams]);

  // Determine if we should show loading, access denied, or content
  const shouldShowLoading = authLoading || (!userProfile && !authLoading);
  const shouldShowAccessDenied =
    userProfile && !authLoading && canCreateArticles === false;
  const shouldShowContent =
    userProfile && !authLoading && canCreateArticles === true;

  // Real-time articles loading with Firebase snapshots
  useEffect(() => {
    if (!shouldShowContent || !userProfile?.uid) return;

    setArticlesLoading(true);

    const articlesQuery = query(
      collection(firestore, "articles"),
      where("authorId", "==", userProfile.uid)
    );

    const unsubscribe = onSnapshot(
      articlesQuery,
      (snapshot) => {
        const userArticles: Article[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userArticles.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            publishedAt: data.publishedAt?.toDate(),
          } as Article);
        });

        // Sort articles by createdAt in memory
        userArticles.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        setArticles(userArticles);
        setArticlesLoading(false);
      },
      (error) => {
        console.error("Error loading articles:", error);
        toast.error("Error loading articles");
        setArticlesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shouldShowContent, userProfile?.uid]);

  // Filter articles whenever articles, search, or status filter changes
  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        const target = event.target as Element;
        const dropdown = document.querySelector(
          `[data-dropdown-id="${activeDropdown}"]`
        );
        const button = document.querySelector(
          `[data-dropdown-button="${activeDropdown}"]`
        );

        if (
          dropdown &&
          !dropdown.contains(target) &&
          button &&
          !button.contains(target)
        ) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown]);

  const filterArticles = () => {
    let filtered = articles;

    // Filter by status
    if (statusFilter !== "all") {
      // Each status filter shows only articles with that exact status
      filtered = filtered.filter((article) => article.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query) ||
          article.categories.some((cat) => cat.toLowerCase().includes(query)) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredArticles(filtered);
  };

  const handleCardClick = (
    status: "all" | "published" | "unpublished" | "draft" | "archive"
  ) => {
    if (status === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ status });
    }
  };



  const handleStatusChange = async (
    id: string,
    newStatus: "draft" | "published" | "unpublished" | "archive"
  ) => {
    console.log(`Changing article ${id} status to ${newStatus}`);

    // Check authentication
    if (!userProfile?.uid) {
      toast.error("You must be logged in to update articles");
      return;
    }

    // Check if user can create articles (infowriter role)
    if (!canCreateArticles) {
      toast.error("You don't have permission to update articles");
      return;
    }

    setUpdatingStatus(id);
    try {
      const updateData: any = {
        status: newStatus,
      };

      // Only set publishedAt when transitioning to published
      if (newStatus === "published") {
        updateData.publishedAt = new Date();
      }

      console.log("Calling updateArticle with:", {
        id,
        updateData,
      });

      await updateArticle(id, updateData);

      console.log("Article updated successfully, updating local state");

      setArticles((prev) =>
        prev.map((article) =>
          article.id === id
            ? {
                ...article,
                status: newStatus,
                publishedAt:
                  newStatus === "published" ? new Date() : article.publishedAt,
              }
            : article
        )
      );

      const statusText =
        newStatus === "published"
          ? "published"
          : newStatus === "unpublished"
          ? "marked as unpublished"
          : newStatus === "archive"
          ? "archived"
          : "saved as draft";
      toast.success(`Article ${statusText} successfully`);
    } catch (error) {
      console.error("Error updating article status:", error);
      toast.error(
        `Error updating article status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setUpdatingStatus(null);
      setActiveDropdown(null);
    }
  };

  const toggleDropdown = (articleId: string) => {
    setActiveDropdown(activeDropdown === articleId ? null : articleId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "unpublished":
        return "bg-red-100 text-red-800";
      case "archive":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Show loading state while checking authentication and role
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
            <Shield className="h-6 w-6 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Verifying Access
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Checking your InfoWriter permissions and loading your articles...
          </p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div
              className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></div>
            <div
              className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied only after role verification is complete
  if (shouldShowAccessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            InfoWriter Access Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need InfoWriter privileges to create and manage articles.
            {userProfile?.role === "user" &&
              " Apply for InfoWriter access to get started."}
          </p>
          <div className="space-y-3">
            {userProfile?.role === "user" && (
              <Link
                to="/writer-request"
                className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Apply for InfoWriter Access
              </Link>
            )}
            <Link
              to="/dashboard"
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show content only after successful role verification
  if (!shouldShowContent) {
    return null; // This should never happen, but just in case
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            {/* Back Button */}
            <button
              onClick={() =>
                navigate(isInfoWriter && !isAdmin ? "/" : "/dashboard")
              }
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={
                isInfoWriter && !isAdmin ? "Back to Home" : "Back to Dashboard"
              }
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              My Articles
            </h1>
          </div>
          <p className="text-gray-600">
            Create, edit, and manage your documentation
          </p>
        </div>
        <Link
          to="/article/new"
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          <span>New Article</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <ExpandableSearchBar
              variant="minimal"
              placeholder="Search my articles..."
              onResultClick={() => {}}
              filterByCurrentUser={true}
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
              <option value="archive">Archive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button
          onClick={() => handleCardClick("all")}
          className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border transition-all duration-200 text-left hover:shadow-md hover:scale-105 ${
            statusFilter === "all"
              ? "border-blue-300 bg-blue-50"
              : "border-gray-200"
          }`}
        >
          <div className="text-2xl font-bold text-gray-900">
            {articles.length}
          </div>
          <div className="text-sm text-gray-600">Total Articles</div>
        </button>
        <button
          onClick={() => handleCardClick("published")}
          className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border transition-all duration-200 text-left hover:shadow-md hover:scale-105 ${
            statusFilter === "published"
              ? "border-green-300 bg-green-50"
              : "border-green-200"
          }`}
        >
          <div className="text-2xl font-bold text-green-700">
            {articles.filter((a) => a.status === "published").length}
          </div>
          <div className="text-sm text-green-600">Published</div>
        </button>
        <button
          onClick={() => handleCardClick("draft")}
          className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border transition-all duration-200 text-left hover:shadow-md hover:scale-105 ${
            statusFilter === "draft"
              ? "border-yellow-300 bg-yellow-50"
              : "border-yellow-200"
          }`}
        >
          <div className="text-2xl font-bold text-yellow-700">
            {articles.filter((a) => a.status === "draft").length}
          </div>
          <div className="text-sm text-yellow-600">Drafts</div>
        </button>
        <button
          onClick={() => handleCardClick("unpublished")}
          className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border transition-all duration-200 text-left hover:shadow-md hover:scale-105 ${
            statusFilter === "unpublished"
              ? "border-red-300 bg-red-50"
              : "border-red-200"
          }`}
        >
          <div className="text-2xl font-bold text-red-700">
            {articles.filter((a) => a.status === "unpublished").length}
          </div>
          <div className="text-sm text-red-600">Unpublished</div>
        </button>
        <button
          onClick={() => handleCardClick("archive")}
          className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border transition-all duration-200 text-left hover:shadow-md hover:scale-105 ${
            statusFilter === "archive"
              ? "border-purple-300 bg-purple-50"
              : "border-purple-200"
          }`}
        >
          <div className="text-2xl font-bold text-purple-700">
            {articles.filter((a) => a.status === "archive").length}
          </div>
          <div className="text-sm text-purple-600">Archive</div>
        </button>
      </div>

      {/* Articles Loading State */}
      {articlesLoading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-gray-200">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Loading Your Articles
            </h3>
            <p className="text-gray-600">
              Fetching your latest articles and drafts...
            </p>
          </div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {articles.length === 0
              ? "No articles yet"
              : "No articles match your filters"}
          </h3>
          <p className="text-gray-600 mb-6">
            {articles.length === 0
              ? "Start creating your first article to share knowledge with your team."
              : "Try adjusting your search or filter criteria."}
          </p>
          {articles.length === 0 && (
            <Link
              to="/article/new"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Article</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div key={article.id} className="relative">
              <ArticleCard
                article={article}
                variant="default"
                showStatus={true}
                showActions={true}
                showEditButton={true}
              />

              {/* Status Quick Actions */}
              <div className="absolute top-4 right-4 flex items-center space-x-2">
                {article.status === "draft" && (
                  <button
                    onClick={() => handleStatusChange(article.id, "published")}
                    disabled={updatingStatus === article.id}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 bg-white/90 backdrop-blur-sm shadow-sm"
                    title="Publish Article"
                  >
                    {updatingStatus === article.id ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                )}

                {/* More Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown(article.id)}
                    data-dropdown-button={article.id}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors bg-white/90 backdrop-blur-sm shadow-sm"
                    title="More Actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {activeDropdown === article.id && (
                    <div
                      data-dropdown-id={article.id}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                    >
                      <div className="py-1">
                        {article.status !== "published" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(article.id, "published");
                            }}
                            disabled={updatingStatus === article.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center space-x-2 disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                            <span>Publish</span>
                          </button>
                        )}

                        {article.status !== "draft" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(article.id, "draft");
                            }}
                            disabled={updatingStatus === article.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center space-x-2 disabled:opacity-50"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Save as Draft</span>
                          </button>
                        )}

                        {article.status === "published" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(article.id, "unpublished");
                            }}
                            disabled={updatingStatus === article.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center space-x-2 disabled:opacity-50"
                          >
                            <EyeOff className="h-4 w-4" />
                            <span>Unpublish</span>
                          </button>
                        )}

                        {(article.status === "published" ||
                          article.status === "unpublished" ||
                          article.status === "draft") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(article.id, "archive");
                            }}
                            disabled={updatingStatus === article.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-2 disabled:opacity-50"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Archive</span>
                          </button>
                        )}


                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


    </div>
  );
};
