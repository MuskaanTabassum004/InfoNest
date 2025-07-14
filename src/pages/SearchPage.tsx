import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublishedArticles, Article } from '../lib/articles';
import { SearchBar } from '../components/SearchBar';
import { useAuth } from '../hooks/useAuth';
import { 
  BookOpen,
  Calendar,
  User,
  Tag,
  Folder,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface SearchPageData {
  articles: Article[];
  categories: string[];
  tags: string[];
}

export const SearchPage: React.FC = () => {
  const { isUser, loading: authLoading } = useAuth();
  const [searchData, setSearchData] = useState<SearchPageData | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const loadSearchData = async (): Promise<void> => {
    setLoading(true);
    try {
      const publishedArticles = await getPublishedArticles();
      
      // Extract unique categories and tags
      const allCategories = new Set<string>();
      const allTags = new Set<string>();
      
      publishedArticles.forEach(article => {
        article.categories.forEach(cat => allCategories.add(cat));
        article.tags.forEach(tag => allTags.add(tag));
      });
      
      setSearchData({
        articles: publishedArticles,
        categories: Array.from(allCategories).sort(),
        tags: Array.from(allTags).sort()
      });
    } catch (error) {
      toast.error('Error loading articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeSearch = async () => {
      if (authLoading) return; // Wait for auth to complete
      await loadSearchData();
    };

    initializeSearch();
  }, [authLoading]);

  useEffect(() => {
    if (!searchData) return;

    let filtered = searchData.articles;

    if (selectedCategory) {
      filtered = filtered.filter(article => 
        article.categories.includes(selectedCategory)
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(article => 
        article.tags.includes(selectedTag)
      );
    }

    setFilteredArticles(filtered);
  }, [searchData, selectedCategory, selectedTag]);

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedTag('');
  };

  // Show loading state while auth or data is loading
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Knowledge Base</h2>
          <p className="text-gray-600">
            {authLoading ? "Authenticating..." : "Loading articles and categories..."}
          </p>
        </div>
      </div>
    );
  }

  // Ensure data is loaded before rendering
  if (!searchData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading search data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Knowledge Base
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Search and discover documentation, guides, and knowledge articles.
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar />

      {/* Stats - Hidden for regular users */}
      {!isUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900">{searchData.articles.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{searchData.categories.length}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Folder className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Tags</p>
                <p className="text-2xl font-bold text-gray-900">{searchData.tags.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Tag className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Categories */}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Folder className="h-4 w-4 mr-2" />
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {searchData.categories.slice(0, 10).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category ? '' : category
                  )}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {searchData.tags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(
                    selectedTag === tag ? '' : tag
                  )}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTag === tag
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(selectedCategory || selectedTag) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Filtering by:</span>
                {selectedCategory && (
                  <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs">
                    {selectedCategory}
                  </span>
                )}
                {selectedTag && (
                  <span className="px-2 py-1 bg-gray-700 text-white rounded-full text-xs">
                    #{selectedTag}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchData.articles.length === 0 ? 'No articles published yet' : 'No articles match your filters'}
          </h3>
          <p className="text-gray-600">
            {searchData.articles.length === 0 
              ? 'Check back later for new content.'
              : 'Try adjusting your filter criteria.'}
          </p>
          {(selectedCategory || selectedTag) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              to={`/article/${article.id}`}
              className="block bg-white/80 backdrop-blur-sm hover:bg-white/90 rounded-2xl p-6 border border-gray-200 hover:border-blue-200 transition-all group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-3 line-clamp-2">
                {article.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {article.excerpt}
              </p>
              
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

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{article.authorName}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(article.publishedAt || article.createdAt)} ago</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};