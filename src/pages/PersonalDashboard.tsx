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
  const [dashboardData, setDashboardData] = useState<PersonalDashboardData | null>(null);
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
        where("author.uid", "==", userProfile.uid),
        orderBy("createdAt", "desc")
      );

      const myArticlesUnsubscribe = onSnapshot(myArticlesQuery, (mySnapshot) => {
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

        const myPublishedArticles = myArticles.filter(a => a.status === "published");

        setDashboardData({
          publishedArticles,
          myArticles,
          myDrafts,
          unpublishedArticles,
          availableCategories: Array.from(categoriesSet),
          topTags,
          myStats: {
            totalArticles: myArticles.length,
            totalViews: myPublishedArticles.reduce((sum, article) => sum + (article.views || 0), 0),
            totalDrafts: myDrafts.length,
            totalPublished: myPublishedArticles.length,
            totalUnpublished: unpublishedArticles.length,
          },
        });
        setLoading(false);
      });

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only administrators can access the personal dashboard.</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h1>
          <p className="text-gray-600">Unable to load dashboard data.</p>
        </div>
      </div>
    );
  }

  const filteredMyArticles = dashboardData.myArticles.filter(article =>
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
                Welcome back, {userProfile?.displayName}! Manage your personal content creation.
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.myStats.totalArticles}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Published</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData.myStats.totalPublished}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Drafts</p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardData.myStats.totalDrafts}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <Edit className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Unpublished</p>
                <p className="text-2xl font-bold text-purple-600">
                  {dashboardData.myStats.totalUnpublished}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Views</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {dashboardData.myStats.totalViews.toLocaleString()}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-xl">
                <Eye className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Actions</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    to="/article/new"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors duration-150 group"
                  >
                    <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <PenTool className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Create New Article</p>
                      <p className="text-sm text-gray-600">Start writing a new article</p>
                    </div>
                  </Link>
                  
                  <Link
                    to="/my-articles"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors duration-150 group"
                  >
                    <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                      <BookOpen className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">My Articles</p>
                      <p className="text-sm text-gray-600">Manage your content</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
