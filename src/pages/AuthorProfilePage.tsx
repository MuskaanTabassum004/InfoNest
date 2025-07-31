import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { useUserProfile } from "../contexts/ProfileContext";
import { getArticles, Article } from "../lib/articles";
import { ArticleCard } from "../components/ArticleCard";
import {
  User,
  MapPin,
  Calendar,
  BookOpen,
  Twitter,
  Linkedin,
  Github,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { firestore } from "../lib/firebase";

export const AuthorProfilePage: React.FC = () => {
  const { authorId } = useParams<{ authorId: string }>();
  const { userProfile: currentUser, loading: authLoading } = useAuth();
  const authorProfile = useUserProfile(authorId);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // Profile is now loaded via real-time hook
  useEffect(() => {
    if (authorProfile) {
      setLoading(false);
    }
  }, [authorProfile]);

  // Real-time articles listener
  useEffect(() => {
    if (!authorId) return;

    setArticlesLoading(true);

    // Query for published articles by this author (excluding archived)
    const articlesQuery = query(
      collection(firestore, "articles"),
      where("authorId", "==", authorId),
      where("status", "==", "published")
    );

    const unsubscribe = onSnapshot(
      articlesQuery,
      (snapshot) => {
        const authorArticles: Article[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          authorArticles.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
            publishedAt: data.publishedAt?.toDate(),
          } as Article);
        });

        // Sort articles by publishedAt or createdAt (newest first)
        authorArticles.sort((a, b) => {
          const dateA = a.publishedAt || a.createdAt || new Date(0);
          const dateB = b.publishedAt || b.createdAt || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setArticles(authorArticles);
        setArticlesLoading(false);
      },
      (error) => {
        console.error("Error loading author articles:", error);
        setArticles([]);
        setArticlesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authorId]);

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "twitter":
        return <Twitter className="h-4 w-4" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      case "github":
        return <Github className="h-4 w-4" />;
      case "website":
        return <Globe className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authorProfile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Author not found
        </h2>
        <Link
          to="/dashboard"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Author Profile Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {authorProfile.profilePicture ? (
                  <img
                    src={authorProfile.profilePicture}
                    alt={authorProfile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Author Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">
                {authorProfile.displayName || "Unknown Author"}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                    authorProfile.role === "admin" ||
                    authorProfile.role === "infowriter"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  } bg-white/90`}
                >
                  {authorProfile.role === "infowriter"
                    ? "InfoWriter"
                    : authorProfile.role === "admin"
                    ? "InfoWriter"
                    : authorProfile.role}
                </span>
              </div>

              {authorProfile.bio && (
                <p className="text-blue-100 text-lg mb-4 max-w-2xl">
                  {authorProfile.bio}
                </p>
              )}

              {/* Social Links */}
              {authorProfile.socialLinks &&
                Object.entries(authorProfile.socialLinks).some(
                  ([_, url]) => url
                ) && (
                  <div className="flex items-center justify-center md:justify-start space-x-3">
                    {Object.entries(authorProfile.socialLinks).map(
                      ([platform, url]) => {
                        if (!url) return null;
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                            title={`${
                              platform.charAt(0).toUpperCase() +
                              platform.slice(1)
                            }`}
                          >
                            {getSocialIcon(platform)}
                          </a>
                        );
                      }
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Articles Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BookOpen className="h-6 w-6 mr-2" />
            Published Articles
            <span className="ml-2 text-lg font-normal text-gray-500">
              ({articles.length})
            </span>
          </h2>
        </div>

        {articlesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="ml-4 text-gray-600">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No articles yet
            </h3>
            <p className="text-gray-600">
              This author hasn't published any articles yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="default"
                  showActions={!!currentUser} // Only show actions if user is authenticated
                />
              ))}
            </div>

            {!currentUser && articles.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 text-center">
                  <Link to="/auth" className="font-medium hover:underline">
                    Sign in
                  </Link>{" "}
                  to like and save articles
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
