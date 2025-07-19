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
  AlertCircle,
  Loader2,
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

interface PersonalDashboardData {
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

export const PersonalDashboard: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [dashboardData, setDashboardData] =
    useState<PersonalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!userProfile || !isAdmin) return;

    const unsubscribes: (() => void)[] = [];

    // Listen to all published articles for general stats
    const publishedQuery = query(
      collection(firestore, "articles"),
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      limit(50)
    );

    const publishedUnsubscribe = onSnapshot(publishedQuery, (snapshot) => {
      const publishedArticles: Article[] = [];
      const categoriesSet = new Set<string>();
      const tagsMap = new Map<string, number>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const article = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          publishedAt: data.publishedAt?.toDate(),
        } as Article;
        publishedArticles.push(article);

        if (article.category) categoriesSet.add(article.category);
        article.tags?.forEach((tag) => {
          tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1);
        });
      });

      // Listen to admin's personal articles
      const myArticlesQuery = query(
        collection(firestore, "articles"),
        where("authorId", "==", userProfile.uid),
        orderBy("createdAt", "desc")
      );

      const myArticlesUnsubscribe = onSnapshot(
        myArticlesQuery,
        (mySnapshot) => {
          const myArticles: Article[] = [];
          const myDrafts: Article[] = [];
          const unpublishedArticles: Article[] = [];

          mySnapshot.forEach((doc) => {
            const data = doc.data();
            const article = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate(),
              publishedAt: data.publishedAt?.toDate(),
            } as Article;

            myArticles.push(article);

            if (article.status === "draft") {
              myDrafts.push(article);
            } else if (article.status === "unpublished") {
              unpublishedArticles.push(article);
            }
          });

          const topTags = Array.from(tagsMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          const myPublishedArticles = myArticles.filter(
            (a) => a.status === "published"
          );

          setDashboardData({
            publishedArticles,
            myArticles,
            myDrafts,
            unpublishedArticles,
            availableCategories: Array.from(categoriesSet),
            topTags,
            myStats: {
              totalArticles: myArticles.length,
              totalViews: myPublishedArticles.reduce(
                (sum, article) => sum + (article.views || 0),
                0
              ),
              totalDrafts: myDrafts.length,
              totalPublished: myPublishedArticles.length,
              totalUnpublished: unpublishedArticles.length,
            },
          });
          setLoading(false);
        }
      );

      unsubscribes.push(myArticlesUnsubscribe);
    });

    unsubscribes.push(publishedUnsubscribe);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [userProfile, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            Only administrators can access the personal dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your personal dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No Data Available
          </h1>
          <p className="text-gray-600">Unable to load dashboard data.</p>
        </div>
      </div>
    );
  }

  const filteredMyArticles = dashboardData.myArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Personal Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {userProfile?.displayName}! Manage your personal
                content creation.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/article/new"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Article</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 mb-8">
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
                        <p className="text-xs text-gray-600">
                          Work in progress
                        </p>
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
                        <p className="text-xs text-gray-600">
                          Pending articles
                        </p>
                      </div>
                    </div>
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {dashboardData.myStats.totalUnpublished}
                    </span>
                  </Link>

                  {/* Back to Dashboard - Not needed since this IS the Admin Personal Dashboard */}

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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Articles Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-500" />
              Recent Articles
            </h2>
            <Link
              to="/my-articles"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {filteredMyArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyArticles.slice(0, 6).map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {formatDistanceToNow(article.createdAt)} ago
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        article.status === "published"
                          ? "bg-green-100 text-green-800"
                          : article.status === "draft"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {article.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {article.category && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {article.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/article/${article.id}`}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="View Article"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/article/edit/${article.id}`}
                        className="text-gray-600 hover:text-gray-700 p-1"
                        title="Edit Article"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No articles yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start creating your first article to see it here.
              </p>
              <Link
                to="/article/new"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Article</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
