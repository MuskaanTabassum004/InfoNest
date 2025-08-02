import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Article } from "../lib/articles";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { firestore } from "../lib/firebase";
import {
  Search,
  BookOpen,
  ArrowRight,
  Shield,
  Zap,
  Loader2,
  User,
  LogOut,
  Bookmark,
} from "lucide-react";
import { signOut } from "../lib/auth";
import { ArticleCard } from "../components/ArticleCard";
import { ExpandableSearchBar } from "../components/ExpandableSearchBar";

interface HomePageData {
  articles: Article[];
  featuredArticles: Article[];
  categories: { name: string; count: number }[];
  tags: string[];
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userProfile, loading: authLoading } = useAuth();
  const [homeData, setHomeData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const loadHomePageData = (): (() => void) => {
    setLoading(true);

    // Set up real-time listener for published articles (excluding archived)
    const articlesQuery = query(
      collection(firestore, "articles"),
      where("status", "==", "published")
    );

    const unsubscribe = onSnapshot(articlesQuery, (snapshot) => {
      try {
        const publishedArticles: Article[] = [];

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
        });

        // Enhanced Featured Articles Selection with Priority System
        const featuredArticles = selectFeaturedArticles(publishedArticles);

        const categoryMap = new Map<string, number>();
        const allTags = new Set<string>();

        publishedArticles.forEach((article) => {
          article.categories.forEach((cat) => {
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
          });
          article.tags.forEach((tag) => allTags.add(tag));
        });

        const categories = Array.from(categoryMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        const tags = Array.from(allTags).slice(0, 20);

        setHomeData({
          articles: publishedArticles,
          featuredArticles,
          categories,
          tags,
        });
        setLoading(false);
      } catch (error) {
        console.error("Error loading homepage data:", error);
        setLoading(false);
      }
    });

    return unsubscribe;
  };

  // Enhanced Featured Articles Selection Function with Priority System
  const selectFeaturedArticles = (articles: Article[]): Article[] => {
    // Define application categories for priority ranking
    const applicationCategories = [
      "Technology",
      "Business",
      "Education",
      "Health",
      "Finance",
      "Marketing",
      "Development",
      "Design",
      "Management",
      "Research",
    ];

    // Priority scoring function based on specified criteria
    const calculatePriority = (article: Article): number => {
      let score = 0;

      // Priority 1: Articles with cover images and infowriter info (highest priority)
      if (article.coverImage && article.authorId) {
        score += 10000;

        // Additional bonus for articles with author information
        score += 1000;
      }

      // Priority 2: Categories mentioned in the application (highest priority)
      const hasApplicationCategory = article.categories.some((category) =>
        applicationCategories.some((appCat) =>
          category.toLowerCase().includes(appCat.toLowerCase())
        )
      );
      if (hasApplicationCategory) {
        score += 5000;

        // Bonus for multiple application categories
        const appCategoryCount = article.categories.filter((category) =>
          applicationCategories.some((appCat) =>
            category.toLowerCase().includes(appCat.toLowerCase())
          )
        ).length;
        score += appCategoryCount * 500;
      }

      // Priority 3: Articles with proper tags
      if (article.tags && article.tags.length > 0) {
        score += 1000;

        // Bonus for more tags (up to 5 tags)
        score += Math.min(article.tags.length * 100, 500);

        // Bonus for relevant tags
        const relevantTags = article.tags.filter(
          (tag) => tag.length > 2 && !tag.includes(" ")
        );
        score += relevantTags.length * 50;
      }

      // Priority 4: Articles with proper title
      if (article.title && article.title.trim().length > 10) {
        score += 500;

        // Bonus for descriptive titles (20-80 characters)
        const titleLength = article.title.trim().length;
        if (titleLength >= 20 && titleLength <= 80) {
          score += 200;
        }

        // Bonus for titles with keywords
        const titleKeywords = [
          "guide",
          "tutorial",
          "how to",
          "best practices",
          "tips",
        ];
        const hasKeywords = titleKeywords.some((keyword) =>
          article.title.toLowerCase().includes(keyword)
        );
        if (hasKeywords) {
          score += 150;
        }
      }

      // Priority 5: Content quality
      if (article.content && article.content.trim().length > 100) {
        score += 200;

        // Bonus for substantial content (500+ characters)
        if (article.content.trim().length >= 500) {
          score += 100;
        }

        // Bonus for very detailed content (1000+ characters)
        if (article.content.trim().length >= 1000) {
          score += 100;
        }
      }

      // Additional factors
      // Bonus for recent articles
      if (article.publishedAt) {
        const daysSincePublished =
          (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePublished < 7) {
          score += 300; // Recent articles get priority
        } else if (daysSincePublished < 30) {
          score += 150;
        }
      }

      // Bonus for engagement metrics
      if (article.views && article.views > 0) {
        score += Math.min(article.views * 0.5, 200);
      }

      if (article.likes && article.likes > 0) {
        score += Math.min(article.likes * 2, 100);
      }

      return score;
    };

    // Sort articles by priority score and select top 12 for grid display
    return articles
      .map((article) => ({
        article,
        priority: calculatePriority(article),
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 12) // Increased to 12 for better grid display (4 rows of 3)
      .map(({ article }) => article);
  };

  useEffect(() => {
    const unsubscribe = loadHomePageData();
    return () => unsubscribe();
  }, []);

  const handleDocumentClick = (articleId?: string) => {
    if (isAuthenticated) {
      if (articleId) {
        navigate(`/article/${articleId}`);
      }
    } else {
      navigate("/auth?redirect=dashboard");
    }
  };

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false);
      // Navigate immediately to prevent auth page flash
      navigate("/", { replace: true });
      // Then sign out in the background
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
      // Ensure we still navigate even if signOut fails
      navigate("/", { replace: true });
    }
  };

  // Show loading state while data is loading
  if (loading || authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#EFEDFA" }}
      >
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Loading InfoNest
          </h2>
          <p className="text-gray-600">Preparing your knowledge base...</p>
        </div>
      </div>
    );
  }

  // Ensure data is loaded before rendering
  if (!homeData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#EFEDFA" }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#EFEDFA" }}>
      <header
        className="backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50"
        style={{ backgroundColor: "#EFEDFA" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link to="/" className="cursor-pointer">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent">
                    InfoNest
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">
                    Where Documentation Meets Efficiency
                  </p>
                </div>
              </Link>
            </div>
            <nav className="hidden md:flex items-center space-x-10 pr-8 ml-auto">
              <a
                href="#features"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Docs
              </a>

              <a
                href="#about"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                About
              </a>
            </nav>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                // Authenticated user dropdown
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        {userProfile?.displayName || userProfile?.email}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {userProfile?.role}
                      </div>
                    </div>
                    {userProfile?.profilePicture ? (
                      <img
                        src={userProfile.profilePicture}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-full">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        to="/saved-articles"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Bookmark className="h-4 w-4" />
                        <span>Saved Articles</span>
                      </Link>

                      <div className="border-t border-gray-200 my-2"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Unauthenticated user login button
                <Link
                  to="/auth"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <section
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1)),url('/image.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1
            className="text-4xl md:text-7xl font-bold text-white mb-6"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
          >
            Welcome to InfoNest
          </h1>
          <p
            className="text-2xl md:text-3xl text-white mb-4 font-light"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
          >
            Where Documentation Meets Efficiency
          </p>
          <p
            className="text-xl text-white max-w-3xl mx-auto mb-12 leading-relaxed"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
          >
            Centralized knowledge hub for your organization's documentation.
            Discover, search, and access all your important documents in one
            secure, organized platform.
          </p>

          <div className="mt-8">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <span>Login or Signup to Access Documents</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
      </section>
      {/* Hero Search Bar */}
      <div className="max-w-2xl mx-auto mb-8 mt-10 mb-16">
        <ExpandableSearchBar
          variant="hero"
          placeholder="Search articles, guides, documentation..."
          onResultClick={() => {}}
        />
      </div>

      {/* Featured Articles Section with Grid Layout */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Articles
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Discover our top-quality articles, prioritized by content quality,
              categories, and community engagement
            </p>
          </div>

          {homeData.featuredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
              {homeData.featuredArticles.map((article, index) => (
                <div
                  key={article.id}
                  className={`
                    ${index % 3 === 0 ? "md:col-start-1" : ""}
                    ${index % 3 === 1 ? "md:col-start-2" : ""}
                    ${index % 3 === 2 ? "md:col-start-3" : ""}
                    cursor-pointer transition-transform hover:scale-105
                  `}
                  onClick={() => handleDocumentClick(article.id)}
                >
                  <ArticleCard
                    article={article}
                    variant="featured"
                    showActions={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                No featured articles available yet.
              </p>
            </div>
          )}

          {/* Show More Button if there are more articles */}
          {homeData.articles.length > homeData.featuredArticles.length && (
            <div className="text-center mt-12">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    navigate("/dashboard");
                  } else {
                    navigate("/auth?redirect=dashboard");
                  }
                }}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <span>View All Articles</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose InfoNest?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Powerful features designed to streamline your documentation
              workflow and enhance team collaboration
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-2xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Powerful Search
              </h3>
              <p className="text-gray-600">
                Find any document instantly with our advanced full-text search
                across titles, content, and metadata.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-2xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Role-Based Access
              </h3>
              <p className="text-gray-600">
                Secure permissions system with User, InfoWriter, and Admin roles
                to control access and editing rights.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-2xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Real-time Updates
              </h3>
              <p className="text-gray-600">
                Stay current with live updates, version tracking, and instant
                notifications when content changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            About InfoNest
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            InfoNest is a comprehensive documentation platform designed to
            centralize your organization's knowledge base. From SOPs and guides
            to FAQs and technical documentation, InfoNest provides a secure,
            searchable, and organized environment for all your important
            information.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {homeData.articles.length}+
              </div>
              <div className="text-gray-600">Documents Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {homeData.categories.length}+
              </div>
              <div className="text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
              <div className="text-gray-600">Access Available</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold">InfoNest</h3>
                  <p className="text-gray-400 text-sm">
                    Where Documentation Meets Efficiency
                  </p>
                </div>
              </div>
              <p className="text-gray-400 max-w-md">
                Streamline your organization's knowledge management with our
                secure, searchable documentation platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#categories"
                    className="hover:text-white transition-colors"
                  >
                    Categories
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    className="hover:text-white transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <Link
                    to="/auth"
                    className="hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 InfoNest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
