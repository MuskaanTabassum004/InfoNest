import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SearchBar } from "../components/SearchBar";
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
  Calendar
} from "lucide-react";
import { getPublishedArticles, Article } from "../lib/articles";
import { formatDistanceToNow } from "date-fns";
import { onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { firestore } from "../lib/firebase";

interface InfoWriterDashboardData {
  publishedArticles: Article[];
  myArticles: Article[];
  myDrafts: Article[];
  myStats: {
    totalArticles: number;
    totalViews: number;
    totalDrafts: number;
  };
}

export const InfoWriterDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [dashboardData, setDashboardData] = useState<InfoWriterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load InfoWriter dashboard data with real-time updates
  useEffect(() => {
    if (!userProfile) return;

    // Published articles subscription
    const publishedQuery = query(
      collection(firestore, "articles"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );

    const unsubscribePublished = onSnapshot(publishedQuery, (snapshot) => {
      const publishedArticles: Article[] = [];
      snapshot.forEach((doc) => {
        publishedArticles.push({ id: doc.id, ...doc.data() } as Article);
      });

      // My articles subscription
      const myArticlesQuery = query(
        collection(firestore, "articles"),
        where("authorId", "==", userProfile.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribeMyArticles = onSnapshot(myArticlesQuery, (mySnapshot) => {
        const myArticles: Article[] = [];
        const myDrafts: Article[] = [];
        let totalViews = 0;

        mySnapshot.forEach((doc) => {
          const article = { id: doc.id, ...doc.data() } as Article;
          if (article.status === "published") {
            myArticles.push(article);
            totalViews += article.views || 0;
          } else if (article.status === "draft") {
            myDrafts.push(article);
          }
        });

        setDashboardData({
          publishedArticles,
          myArticles,
          myDrafts,
          myStats: {
            totalArticles: myArticles.length,
            totalViews,
            totalDrafts: myDrafts.length
          }
        });
        setLoading(false);
      });

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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to load writer dashboard</h2>
        <p className="text-gray-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <SearchBar />

      {/* Writer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">My Articles</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.myStats.totalArticles}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.myStats.totalViews}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.myStats.totalDrafts}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Writer Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/create-article"
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all group"
          >
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Create Article</h3>
              <p className="text-sm text-gray-600">Write new content</p>
            </div>
          </Link>

          <Link
            to="/my-articles"
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all group"
          >
            <div className="bg-purple-600 p-2 rounded-lg group-hover:bg-purple-700 transition-colors">
              <Edit className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">My Articles</h3>
              <p className="text-sm text-gray-600">Manage your content</p>
            </div>
          </Link>

          <Link
            to="/analytics"
            className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl hover:from-green-100 hover:to-teal-100 transition-all group"
          >
            <div className="bg-green-600 p-2 rounded-lg group-hover:bg-green-700 transition-colors">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600">View performance</p>
            </div>
          </Link>
        </div>
      </div>

      {/* My Recent Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My Recent Articles</h2>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles yet</h3>
            <p className="text-gray-600 mb-4">Start creating content to see your articles here.</p>
            <Link
              to="/create-article"
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
                    <span>{formatDistanceToNow(article.createdAt, { addSuffix: true })}</span>
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
          <h2 className="text-xl font-semibold text-gray-900">Recent Platform Articles</h2>
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
      </div>
    </div>
  );
};
