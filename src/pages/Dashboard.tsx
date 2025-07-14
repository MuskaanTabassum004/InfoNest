import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  getPublishedArticles,
  getUserArticles,
  Article,
} from "../lib/articles";
import { getUserWriterRequest, WriterRequest } from "../lib/writerRequests";
import { subscribeToSavedArticlesCount } from "../lib/savedArticles";
import { QuickUploadTest } from "../components/QuickUploadTest";
import { SearchBar } from "../components/SearchBar";
import {
  BookOpen,
  PenTool,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
  Star,
  Plus,
  Calendar,
  Tag,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface DashboardData {
  publishedArticles: Article[];
  myArticles: Article[];
  myArticlesTotal: number;
  writerRequest: WriterRequest | null;
  availableCategories: string[];
  availableTags: string[];
}

export const Dashboard: React.FC = () => {
  const { userProfile, isInfoWriter, isUser, refreshProfile, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [savedArticlesCount, setSavedArticlesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [recentlyApprovedCount, setRecentlyApprovedCount] = useState(0);

  // User filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Load all dashboard data asynchronously
  const loadDashboardData = async (): Promise<void> => {
    if (!userProfile) return;

    setDataLoading(true);
    try {
      // Load published articles
      const published = await getPublishedArticles();
      
      // Load user-specific data if InfoWriter
      let myArticles: Article[] = [];
      let myArticlesTotal = 0;
      if (isInfoWriter && userProfile?.uid) {
        const userArticles = await getUserArticles(userProfile.uid);
        myArticles = userArticles.slice(0, 4); // Show 4 recent articles
        myArticlesTotal = userArticles.length; // Store total count
      }

      // Check for writer request status
      let writerRequest: WriterRequest | null = null;
      if (userProfile) {
        writerRequest = await getUserWriterRequest(userProfile.uid);
      }

      // Extract categories and tags for filtering
      const categories = new Set<string>();
      const tags = new Set<string>();

      published.forEach((article) => {
        article.categories?.forEach((cat) => categories.add(cat));
        article.tags?.forEach((tag) => tags.add(tag));
      });

      const availableCategories = Array.from(categories).sort();
      const availableTags = Array.from(tags).sort();

      // Calculate InfoWriters approved in the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      setDashboardData({
        publishedArticles: published,
        myArticles,
        myArticlesTotal,
        writerRequest,
        availableCategories,
        availableTags,
      });

      // Set initial filtered articles
      setFilteredArticles(published.slice(0, 6));

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Error loading dashboard data");
    } finally {
      setDataLoading(false);
    }
  };

  // Wait for auth to complete, then load dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      if (authLoading) return; // Wait for auth to complete
      
      if (userProfile) {
        await loadDashboardData();
      }
      setLoading(false);
    };

    initializeDashboard();
  }, [userProfile, isInfoWriter, authLoading]);

  // Real-time subscription for saved articles count (users only)
  useEffect(() => {
    if (!userProfile?.uid || !isUser) return;

    const unsubscribe = subscribeToSavedArticlesCount(
      userProfile.uid,
      (count) => {
        setSavedArticlesCount(count);
      }
    );

    return unsubscribe;
  }, [userProfile?.uid, isUser]);

  // Filter articles based on selected category and tags
  useEffect(() => {
    if (!dashboardData) return;

    let filtered = dashboardData.publishedArticles;

    if (selectedCategory) {
      filtered = filtered.filter((article) =>
        article.categories?.includes(selectedCategory)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((article) =>
        selectedTags.every((tag) => article.tags?.includes(tag))
      );
    }

    setFilteredArticles(filtered.slice(0, 6));
  }, [dashboardData, selectedCategory, selectedTags]);

  // Helper functions for filtering
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedTags([]);
  };

  const getRequestStatusDisplay = () => {
    if (!dashboardData?.writerRequest) return null;

    const writerRequest = dashboardData.writerRequest;

    switch (writerRequest.status) {
      case "pending":
        return (
          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">
                  InfoWriter Request Under Review
                </h3>
                <p className="text-yellow-700">
                  Your InfoWriter application (ID: {writerRequest.requestId}) is
                  being reviewed by our admin team.
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  Submitted {formatDistanceToNow(writerRequest.submittedAt)} ago
                </p>
              </div>
            </div>
          </div>
        );
      case "approved":
        return (
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  InfoWriter Access Approved!
                </h3>
                <p className="text-green-700">
                  Congratulations! Your InfoWriter application has been
                  approved. You can now create and manage articles.
                </p>
              </div>
            </div>
          </div>
        );
      case "rejected":
        return (
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">
                    InfoWriter Request Not Approved
                  </h3>
                  <p className="text-red-700">
                    Your InfoWriter application was not approved at this time.
                  </p>
                  {writerRequest.adminNotes && (
                    <p className="text-sm text-red-600 mt-1">
                      Admin notes: {writerRequest.adminNotes}
                    </p>
                  )}
                </div>
              </div>
              <Link
                to="/writer-request"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Apply Again
              </Link>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Show loading state while auth or data is loading
  if (loading || authLoading || dataLoading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">
            {authLoading ? "Authenticating..." : dataLoading ? "Loading your data..." : "Preparing your dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  // Ensure data is loaded before rendering
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className="text-center py-16 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat rounded-2xl"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1)),url('/image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <h1 className="text-4xl font-bold text-white mb-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
          Welcome to InfoNest
        </h1>
        <p className="text-xl text-white max-w-2xl mx-auto" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
          Your centralized knowledge management platform. Discover, learn, and
          contribute to our growing library of documentation.
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* First stat card - different for users vs InfoWriters */}
        {isUser ? (
          <Link
            to="/saved-articles"
            className="block bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 hover:border-purple-200 transition-all duration-200 hover:shadow-lg group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Saved Articles
                </p>
                <p className="text-2xl font-bold text-gray-900">{savedArticlesCount}</p>
                <p className="text-xs text-purple-500 mt-1 group-hover:text-purple-600 transition-colors">
                  Click to view saved articles
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total Articles
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.publishedArticles.length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {isInfoWriter && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  My Articles
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.myArticlesTotal}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <PenTool className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Your Role</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">
                {userProfile?.role}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <User className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Writer Request Status */}
      {getRequestStatusDisplay()}

      {/* Writer Access Request for Users */}
      {isUser && !dashboardData.writerRequest && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Want to contribute content?
              </h3>
              <p className="text-gray-600">
                Apply for InfoWriter access to create and manage articles with
                our comprehensive application form.
              </p>
            </div>
            <Link
              to="/writer-request"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Apply Now</span>
            </Link>
          </div>
        </div>
      )}

      {/* Category and Tag Browsing */}
      <div className="space-y-6">
        {/* Browse by Category */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Browse by Category
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {dashboardData.availableCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-blue-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory("")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear category filter
            </button>
          )}
        </div>

        {/* Browse by Tags */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Browse by Tags
            </h2>
            {selectedTags.length > 0 && (
              <span className="text-sm text-purple-600 font-medium">
                {selectedTags.length} tag
                {selectedTags.length !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {dashboardData.availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  selectedTags.includes(tag)
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-purple-100"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear all tags
            </button>
          )}
        </div>

        {/* Active Filters Summary */}
        {(selectedCategory || selectedTags.length > 0) && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  Active filters:
                </span>
                {selectedCategory && (
                  <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">
                    Category: {selectedCategory}
                  </span>
                )}
                {selectedTags.length > 0 && (
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs">
                    Tags: {selectedTags.join(", ")}
                  </span>
                )}
              </div>
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {isInfoWriter && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/article/new"
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl transition-all group"
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Create New Article
                </h3>
                <p className="text-sm text-gray-600">
                  Start writing a new documentation
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 ml-auto" />
            </Link>

            <Link
              to="/my-articles"
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-xl transition-all group"
            >
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Manage Articles</h3>
                <p className="text-sm text-gray-600">
                  Edit and organize your content
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 ml-auto" />
            </Link>
          </div>
        </div>
      )}

      {/* My Recent Articles (InfoWriter) */}
      {isInfoWriter && dashboardData.myArticles.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              My Recent Articles
            </h2>
            <Link
              to="/my-articles"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.myArticles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="block p-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-700 line-clamp-1">
                    {article.title}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      article.status === "published"
                        ? "bg-green-100 text-green-700"
                        : article.status === "draft"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {article.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(article.updatedAt)} ago
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Test for InfoWriters */}
      {isInfoWriter && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <QuickUploadTest />
        </div>
      )}

      {/* Recent Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedCategory || selectedTags.length > 0
              ? "Filtered Articles"
              : "Recent Articles"}
          </h2>
          <Link
            to="/search"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>Browse all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedCategory || selectedTags.length > 0
                ? "No articles match your filters"
                : "No articles yet"}
            </h3>
            <p className="text-gray-600">
              {selectedCategory || selectedTags.length > 0
                ? "Try adjusting your filters to see more articles."
                : "Be the first to contribute to the knowledge base!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="block bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 rounded-xl p-6 border border-gray-200 hover:border-blue-200 transition-all group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {article.excerpt}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {article.categories.slice(0, 2).map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                  {article.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>By {article.authorName}</span>
                  <span>
                    {formatDistanceToNow(
                      article.publishedAt || article.createdAt
                    )}{" "}
                    ago
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};