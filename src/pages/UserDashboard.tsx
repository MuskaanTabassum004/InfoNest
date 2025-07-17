import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SearchBar } from "../components/SearchBar";
import { 
  BookOpen, 
  Star, 
  PenTool, 
  MessageCircle, 
  ChevronDown,
  Folder,
  TrendingUp,
  ArrowRight,
  Clock,
  User as UserIcon
} from "lucide-react";
import { getPublishedArticles, Article } from "../lib/articles";
import { formatDistanceToNow } from "date-fns";
import { onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { firestore } from "../lib/firebase";

interface DashboardData {
  publishedArticles: Article[];
  availableCategories: string[];
  recentArticles: Article[];
}

export const UserDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load dashboard data with real-time updates
  useEffect(() => {
    if (!userProfile) return;

    const articlesQuery = query(
      collection(firestore, "articles"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(articlesQuery, (snapshot) => {
      const articles: Article[] = [];
      const categoriesSet = new Set<string>();

      snapshot.forEach((doc) => {
        const article = { id: doc.id, ...doc.data() } as Article;
        articles.push(article);
        
        // Collect categories
        article.categories?.forEach(cat => categoriesSet.add(cat));
      });

      const availableCategories = Array.from(categoriesSet).sort();
      const recentArticles = articles.slice(0, 6);

      setDashboardData({
        publishedArticles: articles,
        availableCategories,
        recentArticles
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Filter articles based on selected category
  useEffect(() => {
    if (!dashboardData) return;

    let filtered = dashboardData.publishedArticles;
    if (selectedCategory) {
      filtered = filtered.filter(article => 
        article.categories?.includes(selectedCategory)
      );
    }
    setFilteredArticles(filtered.slice(0, 6));
  }, [dashboardData, selectedCategory]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to load dashboard</h2>
        <p className="text-gray-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <SearchBar />

      {/* Category Filter */}
      {dashboardData.availableCategories.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Folder className="h-5 w-5 text-blue-600" />
              <span>Browse by Category</span>
            </h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory("")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {/* Dashboard Dropdown */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">Access your saved content and features</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-10">
              <div className="p-2 space-y-1">
                <Link
                  to="/saved-articles"
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Star className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="font-medium text-gray-900">Saved Articles</span>
                    <p className="text-xs text-gray-600">View your bookmarked content</p>
                  </div>
                </Link>

                <Link
                  to="/writer-request"
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <PenTool className="h-4 w-4 text-purple-600" />
                  <div>
                    <span className="font-medium text-gray-900">Apply for InfoWriter</span>
                    <p className="text-xs text-gray-600">Request content creation access</p>
                  </div>
                </Link>

                <Link
                  to="/chats"
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <span className="font-medium text-gray-900">Chats</span>
                    <p className="text-xs text-gray-600">Connect with other users</p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedCategory ? `Articles in "${selectedCategory}"` : "Recent Articles"}
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{filteredArticles.length} articles</span>
          </div>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedCategory ? "No articles in this category" : "No articles yet"}
            </h3>
            <p className="text-gray-600">
              {selectedCategory 
                ? "Try selecting a different category or clear the filter." 
                : "Be the first to contribute to the knowledge base!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="block bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                {article.coverImage && (
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(article.createdAt, { addSuffix: true })}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {article.categories?.slice(0, 2).map((category) => (
                      <span
                        key={category}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
