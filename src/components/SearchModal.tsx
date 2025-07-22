import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, Tag } from "lucide-react";
import { getPublishedArticles, Article } from "../lib/articles";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick?: () => void;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

const RECOMMENDED_TAGS = [
  "Technology",
  "Business", 
  "Tutorials",
  "Science",
  "News & Updates"
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onResultClick
}) => {
  const { userProfile } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load articles and recent searches on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const publishedArticles = await getPublishedArticles();
        setArticles(publishedArticles);
      } catch (error) {
        console.error("Error loading articles:", error);
      }
    };

    if (isOpen) {
      loadData();
      loadRecentSearches();
    }
  }, [isOpen]);

  // Global search shortcut listener
  useEffect(() => {
    const handleGlobalSearch = () => {
      if (!isOpen) {
        // Find and trigger the search modal
        const searchTrigger = document.querySelector('[data-search-trigger]') as HTMLElement;
        if (searchTrigger) {
          searchTrigger.click();
        }
      }
    };

    window.addEventListener('openGlobalSearch', handleGlobalSearch);
    return () => window.removeEventListener('openGlobalSearch', handleGlobalSearch);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Split query into words and search
      const words = searchQuery.toLowerCase().trim().split(/\s+/);
      
      const filteredResults = articles.filter(article => {
        return words.every(word => 
          article.title.toLowerCase().includes(word) ||
          article.excerpt.toLowerCase().includes(word) ||
          article.content.toLowerCase().includes(word) ||
          article.authorName.toLowerCase().includes(word) ||
          article.categories.some(cat => cat.toLowerCase().includes(word)) ||
          article.tags.some(tag => tag.toLowerCase().includes(word))
        );
      });

      setResults(filteredResults.slice(0, 8));
      setLoading(false);
    }, 500),
    [articles]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    try {
      const stored = localStorage.getItem(`recent_searches_${userProfile?.uid || 'anonymous'}`);
      if (stored) {
        const searches: RecentSearch[] = JSON.parse(stored);
        setRecentSearches(searches.slice(0, 4));
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
    }
  };

  // Save search to recent searches
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      const userId = userProfile?.uid || 'anonymous';
      const stored = localStorage.getItem(`recent_searches_${userId}`);
      let searches: RecentSearch[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing search if it exists
      searches = searches.filter(s => s.query !== searchQuery);
      
      // Add new search at the beginning
      searches.unshift({
        query: searchQuery,
        timestamp: Date.now()
      });
      
      // Keep only last 4 searches
      searches = searches.slice(0, 4);
      
      localStorage.setItem(`recent_searches_${userId}`, JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  // Handle result click
  const handleResultClick = (article: Article) => {
    saveRecentSearch(query);
    onResultClick?.();
    onClose();
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    debouncedSearch(searchQuery);
  };

  // Handle tag click
  const handleTagClick = (tag: string) => {
    setQuery(tag);
    debouncedSearch(tag);
  };

  // Clear search
  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-2xl mx-4 mt-16 md:mt-24 bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'
        } md:max-h-[80vh] max-h-[90vh] overflow-hidden`}
        style={{
          animation: isOpen ? 'slideInDown 0.3s ease-out' : undefined
        }}
      >
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-100">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search articles, authors, categories..."
              className="w-full pl-12 pr-12 py-4 text-lg border-none outline-none bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {!query && (
            <div className="p-6 space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Recent</span>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchClick(search.query)}
                        className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700 group-hover:text-gray-900">
                            {search.query}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(search.timestamp)} ago
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Tags */}
              <div>
                <div className="flex flex-wrap gap-2">
                  {RECOMMENDED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="inline-flex items-center space-x-1 px-4 py-2 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
                    >
                      <Tag className="h-3 w-3" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-gray-600">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-500 mb-4">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </div>
                  {results.map((article) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.id}`}
                      onClick={() => handleResultClick(article)}
                      className="block p-4 hover:bg-gray-50 rounded-xl transition-colors group"
                    >
                      <div className="flex items-start space-x-4">
                        {article.coverImage && (
                          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={article.coverImage}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                            {highlightText(article.title, query)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {highlightText(article.excerpt, query)}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>By {article.authorName}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(article.publishedAt || article.createdAt)} ago</span>
                          </div>
                          {/* Tags */}
                          {article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                >
                                  {highlightText(tag, query)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or browse our recommended topics above.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translate3d(0, -100%, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

// Utility function to highlight search terms
const highlightText = (text: string, highlight: string) => {
  if (!highlight.trim()) return text;

  const words = highlight.toLowerCase().trim().split(/\s+/);
  let highlightedText = text;

  words.forEach(word => {
    const regex = new RegExp(`(${word})`, "gi");
    highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
  });

  return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}