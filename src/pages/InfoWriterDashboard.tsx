import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  BookOpen,
  PenTool,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  Edit,
  Eye,
  FileText,
  BarChart3,
  Calendar,
  Search,
  ChevronDown,
  Tag,
  MessageCircle,
  Star,
} from "lucide-react";
import { getPublishedArticles, Article } from "../lib/articles";
import { formatDistanceToNow } from "date-fns";
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { firestore } from "../lib/firebase";
import { SearchBar } from "../components/SearchBar";

interface InfoWriterDashboardData {
  publishedArticles: Article[];
  myArticles: Article[];
  myDrafts: Article[];
  unpublishedArticles: Article[];
  availableCategories: string[];
  topTags: { tag: string; count: number }[];
  myStats: {
    totalArticles: number;
    totalViews: number;
    totalDrafts: number;
    totalPublished: number;
    totalUnpublished: number;
  };
}

export const InfoWriterDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [dashboardData, setDashboardData] =
    useState<InfoWriterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load InfoWriter dashboard data with real-time updates
  useEffect(() => {
    if (!userProfile) return;

    // Published articles subscription
    const publishedQuery = query(
      collection(firestore, "articles"),
      where("status", "==", "published")
    );

    const unsubscribePublished = onSnapshot(publishedQuery, (snapshot) => {
      const publishedArticles: Article[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        publishedArticles.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          publishedAt: data.publishedAt?.toDate(),
        } as Article);
      });

      // Sort articles by createdAt in memory
      publishedArticles.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      // My articles subscription
      const myArticlesQuery = query(
        collection(firestore, "articles"),
        where("authorId", "==", userProfile.uid)
      );

      const unsubscribeMyArticles = onSnapshot(
        myArticlesQuery,
        (mySnapshot) => {
          const myArticles: Article[] = [];
          const myDrafts: Article[] = [];
          const unpublishedArticles: Article[] = [];
          const categoriesSet = new Set<string>();
          const tagsMap = new Map<string, number>();
          let totalViews = 0;

          mySnapshot.forEach((doc) => {
            const data = doc.data();
            const article = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate(),
              publishedAt: data.publishedAt?.toDate(),
            } as Article;

            // Collect categories and tags
            article.categories?.forEach((cat) => categoriesSet.add(cat));
            article.tags?.forEach((tag) => {
              tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1);
            });

            if (article.status === "published") {
              myArticles.push(article);
              totalViews += article.views || 0;
            } else if (article.status === "draft") {
              myDrafts.push(article);
            } else {
              unpublishedArticles.push(article);
            }
          });

          // Sort articles by createdAt in memory
          myArticles.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
          myDrafts.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
          unpublishedArticles.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );

          const availableCategories = Array.from(categoriesSet).sort();

          // Get top 10 tags sorted by count
          const topTags = Array.from(tagsMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          setDashboardData({
            publishedArticles,
            myArticles,
            myDrafts,
            unpublishedArticles,
            availableCategories,
            topTags,
            myStats: {
              totalArticles: myArticles.length,
              totalViews,
              totalDrafts: myDrafts.length,
              totalPublished: publishedArticles.length,
              totalUnpublished: unpublishedArticles.length,
            },
          });
          setLoading(false);
        }
      );

      return () => unsubscribeMyArticles();
    });

    return () => unsubscribePublished();
  }, [userProfile]);

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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Unable to load writer dashboard
        </h2>
        <p className="text-gray-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Engine */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="space-y-4">
          {/* Modern Search Bar */}
          <SearchBar
            variant="default"
            placeholder="Search articles..."
            onResultClick={() => {}}
          />

          {/* Category Filter */}
          <div className="flex gap-4">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">All Categories</option>
                {dashboardData.availableCategories
                  .slice(0, 8)
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Top 10 Real-time Tags */}
          <div className="flex flex-wrap gap-2">
            {dashboardData.topTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedTag === tag
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700"
                }`}
              >
                <Tag className="h-3 w-3" />
                <span>{tag}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Dropdown */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="space-y-4">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">
                  Manage your articles and content
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Accordion-style dropdown content */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isDropdownOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-3 space-y-2">
                <Link
                  to="/my-articles"
                  className="flex items-center justify-between p-3 hover:bg-white rounded-lg transition-colors duration-150 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 group-hover:text-blue-700">
                        Total Articles
                      </span>
                      <p className="text-xs text-gray-600">
                        View all your articles
                      </p>
                    </div>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {dashboardData.myStats.totalArticles}
                  </span>
                </Link>

                <Link
                  to="/my-articles?status=published"
                  className="flex items-center justify-between p-3 hover:bg-white rounded-lg transition-colors duration-150 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Eye className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 group-hover:text-green-700">
                        Published
                      </span>
                      <p className="text-xs text-gray-600">Live articles</p>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {dashboardData.myStats.totalPublished}
                  </span>
                </Link>

                <Link
                  to="/my-articles?status=draft"
                  className="flex items-center justify-between p-3 hover:bg-white rounded-lg transition-colors duration-150 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 group-hover:text-orange-700">
                        Drafts
                      </span>
                      <p className="text-xs text-gray-600">Work in progress</p>
                    </div>
                  </div>
                  <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {dashboardData.myStats.totalDrafts}
                  </span>
                </Link>

                <Link
                  to="/my-articles?status=unpublished"
                  className="flex items-center justify-between p-3 hover:bg-white rounded-lg transition-colors duration-150 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-100 p-2 rounded-lg group-hover:bg-red-200 transition-colors">
                      <Clock className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 group-hover:text-red-700">
                        Unpublished
                      </span>
                      <p className="text-xs text-gray-600">Pending articles</p>
                    </div>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {dashboardData.myStats.totalUnpublished}
                  </span>
                </Link>

                {/* Back to Dashboard - Not needed since we're already on the dashboard */}

                <hr className="my-2" />

                <Link
                  to="/article/new"
                  className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg transition-colors duration-150 group"
                >
                  <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Plus className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 group-hover:text-purple-700">
                      Create New Article
                    </span>
                    <p className="text-xs text-gray-600">
                      Start writing new content
                    </p>
                  </div>
                </Link>

                <Link
                  to="/chats"
                  className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg transition-colors duration-150 group"
                >
                  <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <MessageCircle className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 group-hover:text-indigo-700">
                      Chats
                    </span>
                    <p className="text-xs text-gray-600">
                      Messages from Users/Admins
                    </p>
                  </div>
                </Link>

                <Link
                  to="/saved-articles"
                  className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg transition-colors duration-150 group"
                >
                  <div className="bg-yellow-100 p-2 rounded-lg group-hover:bg-yellow-200 transition-colors">
                    <Star className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 group-hover:text-yellow-700">
                      Saved Articles
                    </span>
                    <p className="text-xs text-gray-600">
                      Your bookmarked content
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Recent Articles */}
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

        {dashboardData.myArticles.length === 0 ? (
          <div className="text-center py-12">
            <PenTool className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No articles yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start creating content to see your articles here.
            </p>
            <Link
              to="/article/new"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Article</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.myArticles.slice(0, 6).map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all"
              >
                {article.coverImage && (
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(article.createdAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{article.views || 0} views</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/article/${article.id}`}
                    className="flex-1 text-center py-2 px-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    View
                  </Link>
                  <Link
                    to={`/edit-article/${article.id}`}
                    className="flex-1 text-center py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Platform Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Platform Articles
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{dashboardData.publishedArticles.length} total</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData.publishedArticles.slice(0, 6).map((article) => (
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
                  <span>
                    {formatDistanceToNow(article.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
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
      </div>
    </div>
  );
};
