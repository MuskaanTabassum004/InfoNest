import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from '../hooks/useAuth';
import { getUserArticles, Article } from '../lib/articles';
import { ArticleCard } from '../components/ArticleCard';
import {
  FileText,
  Plus,
  Filter,
  Search,
  ArrowLeft,
  Eye,
  Edit,
  Calendar,
  BarChart3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { firestore } from "../lib/firebase";

export default function MyArticles() {
  const { userProfile, isInfoWriter, isAdmin } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time articles listener
  useEffect(() => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }

    const articlesQuery = query(
      collection(firestore, "articles"),
      where("authorId", "==", userProfile.uid)
    );

    const unsubscribe = onSnapshot(articlesQuery, (snapshot) => {
      const userArticles: Article[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        userArticles.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          publishedAt: data.publishedAt?.toDate(),
        } as Article);
      });

      // Sort by updatedAt (newest first)
      userArticles.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setArticles(userArticles);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  // Filter articles based on status and search
  useEffect(() => {
    let filtered = articles;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((article) => article.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query) ||
          article.categories.some((cat) =>
            cat.toLowerCase().includes(query)
          ) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredArticles(filtered);
  }, [articles, statusFilter, searchQuery]);

  const getStatusCounts = () => {
    return {
      all: articles.length,
      published: articles.filter((a) => a.status === "published").length,
      draft: articles.filter((a) => a.status === "draft").length,
      unpublished: articles.filter((a) => a.status === "unpublished").length,
    };
  };

  const statusCounts = getStatusCounts();

  if (!userProfile || (!isInfoWriter && !isAdmin)) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600">
          You need InfoWriter or Admin privileges to access this page.
        </p>
        <Link
          to="/writer-request"
          className="inline-flex items-center space-x-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Apply for InfoWriter Access</span>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading your articles...</p>
        </div>
      </div>
    );
  }

  return (
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
              My Articles
            </h1>
          </div>
          <p className="text-gray-600">
            Create, edit, and manage your articles
          </p>
        </div>

        <Link
          to="/article/new"
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Article</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.published}</p>
            </div>
            <Eye className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.draft}</p>
            </div>
            <Edit className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Unpublished</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.unpublished}</p>
            </div>
            <Calendar className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title, excerpt, category, or tag..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Articles ({statusCounts.all})</option>
              <option value="published">Published ({statusCounts.published})</option>
              <option value="draft">Drafts ({statusCounts.draft})</option>
              <option value="unpublished">Unpublished ({statusCounts.unpublished})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {articles.length === 0
              ? "No articles yet"
              : searchQuery || statusFilter !== "all"
              ? "No articles match your filters"
              : "No articles found"}
          </h3>
          <p className="text-gray-600 mb-6">
            {articles.length === 0
              ? "Start creating your first article to share your knowledge."
              : "Try adjusting your search or filter criteria."}
          </p>
          {articles.length === 0 ? (
            <Link
              to="/article/new"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Article</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="default"
              showStatus={true}
              showActions={true}
              showEditButton={true}
              showManagementMenu={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">My Articles</h1>
          </div>
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Article
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No articles yet</h2>
            <p className="text-gray-500 mb-6">Start writing your first article to see it here.</p>
            <Link
              to="/editor"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Write Your First Article
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}