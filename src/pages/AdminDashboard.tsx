import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SearchBar } from "../components/SearchBar";
import { 
  BookOpen, 
  Users, 
  Shield, 
  PenTool, 
  Clock, 
  TrendingUp,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Settings
} from "lucide-react";
import { getPublishedArticles, Article } from "../lib/articles";
import { formatDistanceToNow } from "date-fns";
import { onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { firestore } from "../lib/firebase";

interface AdminDashboardData {
  publishedArticles: Article[];
  totalUsers: number;
  pendingWriterRequests: number;
  recentArticles: Article[];
  systemStats: {
    totalArticles: number;
    totalCategories: number;
    totalTags: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load admin dashboard data with real-time updates
  useEffect(() => {
    if (!userProfile) return;

    // Articles subscription
    const articlesQuery = query(
      collection(firestore, "articles"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeArticles = onSnapshot(articlesQuery, (snapshot) => {
      const articles: Article[] = [];
      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      snapshot.forEach((doc) => {
        const article = { id: doc.id, ...doc.data() } as Article;
        articles.push(article);
        
        article.categories?.forEach(cat => categoriesSet.add(cat));
        article.tags?.forEach(tag => tagsSet.add(tag));
      });

      const recentArticles = articles.slice(0, 6);

      // Users subscription
      const usersQuery = query(collection(firestore, "users"));
      const unsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
        let totalUsers = 0;
        let pendingWriterRequests = 0;

        usersSnapshot.forEach((doc) => {
          totalUsers++;
          const userData = doc.data();
          if (userData.requestedWriterAccess && userData.role === "user") {
            pendingWriterRequests++;
          }
        });

        setDashboardData({
          publishedArticles: articles,
          totalUsers,
          pendingWriterRequests,
          recentArticles,
          systemStats: {
            totalArticles: articles.length,
            totalCategories: categoriesSet.size,
            totalTags: tagsSet.size
          }
        });
        setLoading(false);
      });

      return () => unsubscribeUsers();
    });

    return () => unsubscribeArticles();
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to load admin dashboard</h2>
        <p className="text-gray-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <SearchBar />

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.systemStats.totalArticles}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.totalUsers}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <Link
          to="/admin/writer-requests"
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-orange-100 hover:border-orange-200 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.pendingWriterRequests}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Link>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.systemStats.totalCategories}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all group"
          >
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600">User roles and permissions</p>
            </div>
          </Link>

          <Link
            to="/admin/writer-requests"
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl hover:from-orange-100 hover:to-red-100 transition-all group"
          >
            <div className="bg-orange-600 p-2 rounded-lg group-hover:bg-orange-700 transition-colors">
              <PenTool className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Writer Requests</h3>
              <p className="text-sm text-gray-600">{dashboardData.pendingWriterRequests} pending</p>
            </div>
          </Link>

          <Link
            to="/admin/system"
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:from-gray-100 hover:to-slate-100 transition-all group"
          >
            <div className="bg-gray-600 p-2 rounded-lg group-hover:bg-gray-700 transition-colors">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">System Settings</h3>
              <p className="text-sm text-gray-600">Configure platform</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Articles</h2>
          <Link
            to="/admin/articles"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>Manage all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {dashboardData.recentArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles yet</h3>
            <p className="text-gray-600">Articles will appear here once published.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.recentArticles.map((article) => (
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
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Published</span>
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
