import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPublishedArticles, Article, incrementViewCount } from '../lib/articles';
import { getPopularTags, getPopularCategories, PopularTag, PopularCategory } from '../lib/search';
import { SearchBar } from '../components/SearchBar';
import { 
  BookOpen, 
  Calendar, 
  User, 
  Tag, 
  Folder, 
  TrendingUp,
  Clock,
  Eye,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HomePageData {
  articles: Article[];
  popularTags: PopularTag[];
  popularCategories: PopularCategory[];
}

export const HomePage: React.FC = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const loadHomeData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [articles, popularTags, popularCategories] = await Promise.all([
        getPublishedArticles(),
        getPopularTags(10),
        getPopularCategories(8)
      ]);

      setHomeData({
        articles,
        popularTags,
        popularCategories
      });
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && userProfile) {
      loadHomeData();
    }
  }, [authLoading, userProfile]);

  const handleArticleClick = async (articleId: string) => {
    await incrementViewCount(articleId);
    navigate(`/article/${articleId}`);
  };

  const filteredArticles = selectedCategory 
    ? homeData?.articles.filter(article => 
        article.categories.includes(selectedCategory)
      ) || []
    : homeData?.articles || [];

  // Show loading state while auth or data is loading
  if (loading || authLoading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDFA' }}>
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading InfoNest</h2>
          <p className="text-gray-600">
            {authLoading ? "Authenticating..." : "Loading your personalized content..."}
          </p>
        </div>
      </div>
    );
  }

  // Ensure data is loaded before rendering
  if (!homeData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDFA' }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEDFA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Welcome back, {userProfile.displayName || userProfile.email}!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover the latest articles and documentation from our knowledge base.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <SearchBar />
        </div>

        {/* Popular Categories */}
        <div className="mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Folder className="h-6 w-6 mr-2 text-blue-600" />
                Popular Categories
              </h2>
              <Link
                to="/search"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {homeData.popularCategories.map((category) => (
                <button
                  key={category.category}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.category ? '' : category.category
                  )}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedCategory === category.category
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 ${
                      selectedCategory === category.category ? 'text-white' : 'text-blue-600'
                    }`}>
                      {category.count}
                    </div>
                    <div className={`text-sm font-medium ${
                      selectedCategory === category.category ? 'text-blue-100' : 'text-gray-700'
                    }`}>
                      {category.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedCategory && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Showing articles in: <strong>{selectedCategory}</strong>
                </span>
                <button
                  onClick={() => setSelectedCategory('')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Popular Tags */}
        <div className="mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Tag className="h-6 w-6 mr-2 text-purple-600" />
              Trending Tags
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {homeData.popularTags.map((tag) => (
                <Link
                  key={tag.tag}
                  to={`/search?tag=${encodeURIComponent(tag.tag)}`}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
                >
                  <span>#{tag.tag}</span>
                  <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {tag.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <BookOpen className="h-6 w-6 mr-2 text-green-600" />
              {selectedCategory ? `${selectedCategory} Articles` : 'Latest Articles'}
            </h2>
            <div className="text-sm text-gray-600">
              {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} available
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedCategory ? 'No articles in this category' : 'No articles available'}
              </h3>
              <p className="text-gray-600">
                {selectedCategory 
                  ? 'Try selecting a different category or clear the filter.'
                  : 'Check back later for new content.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.slice(0, 12).map((article) => (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article.id)}
                  className="bg-white/80 backdrop-blur-sm hover:bg-white/90 rounded-2xl border border-gray-200 hover:border-blue-200 transition-all cursor-pointer group overflow-hidden"
                >
                  {/* Cover Image */}
                  {article.coverImage && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-3 line-clamp-2">
                      {article.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                    
                    {/* Author Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      {article.authorProfilePicture ? (
                        <img
                          src={article.authorProfilePicture}
                          alt={article.authorName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{article.authorName}</p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(article.publishedAt || article.createdAt)} ago
                        </p>
                      </div>
                    </div>
                    
                    {/* Categories and Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {article.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                      {article.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {article.viewCount || 0}
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {article.searchCount || 0}
                        </span>
                      </div>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        v{article.version}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredArticles.length > 12 && (
            <div className="text-center mt-8">
              <Link
                to="/search"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                <span>View All Articles</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};