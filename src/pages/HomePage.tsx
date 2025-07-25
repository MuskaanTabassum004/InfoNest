import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getPublishedArticles, Article } from "../lib/articles";
import {
  Search,
  BookOpen,
  ArrowRight,
  Shield,
  Zap,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  LogOut,
  Settings,
  MessageCircle,
  Bookmark,
} from "lucide-react";
import { signOut } from "../lib/auth";
import toast from "react-hot-toast";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const loadHomePageData = async (): Promise<void> => {
    setLoading(true);
    try {
      const publishedArticles = await getPublishedArticles();

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
    } catch (error) {
      console.error("Error loading homepage data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Featured Articles Selection Function
  const selectFeaturedArticles = (articles: Article[]): Article[] => {
    // Calculate category frequency for priority ranking
    const categoryFrequency = new Map<string, number>();
    articles.forEach((article) => {
      article.categories.forEach((category) => {
        categoryFrequency.set(
          category,
          (categoryFrequency.get(category) || 0) + 1
        );
      });
    });

    // Sort categories by frequency (most frequent = higher priority)
    const sortedCategories = Array.from(categoryFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);

    // Priority scoring function
    const calculatePriority = (article: Article): number => {
      let score = 0;

      // Primary criteria: Category assignment + Cover image (highest priority)
      if (article.categories.length > 0 && article.coverImage) {
        score += 1000;
      }
      // Secondary criteria: Category assignment without cover image (medium priority)
      else if (article.categories.length > 0) {
        score += 500;
      }
      // Tertiary criteria: Articles from less frequent categories (lowest priority)
      else {
        score += 100;
      }

      // Bonus points for popularity metrics
      if (article.views) {
        score += Math.min(article.views * 0.1, 100); // Cap at 100 bonus points
      }

      // Bonus points for category popularity (higher for more popular categories)
      article.categories.forEach((category) => {
        const categoryIndex = sortedCategories.indexOf(category);
        if (categoryIndex !== -1) {
          // More popular categories get higher scores
          score += Math.max(50 - categoryIndex * 2, 10);
        }
      });

      // Bonus for recent articles (recency factor)
      if (article.publishedAt) {
        const daysSincePublished =
          (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePublished < 30) {
          score += Math.max(20 - daysSincePublished * 0.5, 0);
        }
      }

      return score;
    };

    // Sort articles by priority score and select top 6
    return articles
      .map((article) => ({
        article,
        priority: calculatePriority(article),
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6)
      .map(({ article }) => article);
  };

  useEffect(() => {
    loadHomePageData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (isAuthenticated) {
        navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate(
          `/auth?redirect=dashboard&search=${encodeURIComponent(
            searchQuery.trim()
          )}`
        );
      }
    }
  };

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
      await signOut();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Error logging out:", error);
      window.location.href = "/";
    }
  };

  const nextSlide = () => {
    if (!homeData) return;
    setCurrentSlide(
      (prev) => (prev + 1) % Math.ceil(homeData.featuredArticles.length / 3)
    );
  };

  const prevSlide = () => {
    if (!homeData) return;
    setCurrentSlide(
      (prev) =>
        (prev - 1 + Math.ceil(homeData.featuredArticles.length / 3)) %
        Math.ceil(homeData.featuredArticles.length / 3)
    );
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
                Features
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
                      <Link
                        to="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
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

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Documentation
            </h2>
            <p className="text-gray-600 text-lg">
              Discover our most popular and high-quality documentation
            </p>
          </div>

          {homeData.featuredArticles.length > 0 ? (
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {Array.from({
                    length: Math.ceil(homeData.featuredArticles.length / 3),
                  }).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {homeData.featuredArticles
                          .slice(slideIndex * 3, (slideIndex + 1) * 3)
                          .map((article) => (
                            <div
                              key={article.id}
                              onClick={() => handleDocumentClick(article.id)}
                              className="cursor-pointer"
                            >
                              <ArticleCard
                                article={article}
                                variant="featured"
                                showActions={true}
                                className="relative"
                              />
                              {/* Featured Badge */}
                              <div className="absolute top-4 right-4 flex items-center space-x-1 text-yellow-500 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="text-xs text-gray-600 font-medium">
                                  Featured
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {homeData.featuredArticles.length > 3 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-all"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-600" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-all"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-600" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                No featured articles available yet.
              </p>
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
