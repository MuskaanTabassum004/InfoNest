import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Clock, Tag, ArrowRight } from "lucide-react";
import { getPublishedArticles, Article } from "../lib/articles";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface ExpandableSearchBarProps {
  placeholder?: string;
  className?: string;
  onResultClick?: () => void;
  variant?: "default" | "minimal" | "hero";
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

export const ExpandableSearchBar: React.FC<ExpandableSearchBarProps> = ({
  placeholder = "Search articles...",
  className = "",
  onResultClick,
  variant = "default"
}) => {
  const { userProfile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load articles on mount
  useEffect(() => {
    const loadArticles = async () => {
      try {
        const publishedArticles = await getPublishedArticles();
        setArticles(publishedArticles);
      } catch (error) {
        console.error("Error loading articles:", error);
      }
    };

    loadArticles();
    loadRecentSearches();
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150); // Wait for animation to start
    }
  }, [isExpanded]);

  // Handle clicks outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setQuery("");
        setResults([]);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

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

      setResults(filteredResults.slice(0, 6));
      setLoading(false);
    }, 300),
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
        setRecentSearches(searches.slice(0, 3));
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
      
      // Keep only last 3 searches
      searches = searches.slice(0, 3);
      
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
    setIsExpanded(false);
    setQuery("");
    setResults([]);
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

  // Handle search bar click
  const handleSearchBarClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case "minimal":
        return "bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-blue-300 hover:shadow-md";
      case "hero":
        return "bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl";
      default:
        return "bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-blue-300 hover:shadow-md";
    }
  };

  const getInputSize = () => {
    switch (variant) {
      case "hero":
        return "px-6 py-5 text-lg";
      case "minimal":
        return "px-4 py-2";
      default:
        return "px-4 py-3";
    }
  };

  const getIconSize = () => {
    switch (variant) {
      case "hero":
        return "h-6 w-6";
      default:
        return "h-5 w-5";
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full transition-all duration-300 ease-out ${className}`}
      style={{
        zIndex: isExpanded ? 50 : 'auto'
      }}
    >
      {/* Search Input */}
      <div
        onClick={handleSearchBarClick}
        className={`
          w-full flex items-center space-x-3 cursor-pointer transition-all duration-300 ease-out rounded-xl
          ${getVariantStyles()}
          ${getInputSize()}
          ${isExpanded ? 'shadow-lg border-blue-400' : ''}
        `}
      >
        <Search className={`text-gray-400 flex-shrink-0 ${getIconSize()}`} />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-500"
          
        />
        {query && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearSearch();
            }}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
        {!isExpanded && (
          <div className="hidden md:flex items-center space-x-1 text-xs text-gray-400 flex-shrink-0">
            <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs"></kbd>
            <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs"></kbd>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-out bg-white rounded-b-xl border-l border-r border-b border-gray-200 shadow-lg
          ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}
        `}
        style={{
          transformOrigin: 'top',
          transform: isExpanded ? 'scaleY(1)' : 'scaleY(0.95)'
        }}
      >
        <div className="p-4 max-h-80 overflow-y-auto">
          {!query && (
            <div className="space-y-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Recent</span>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchClick(search.query)}
                        className="flex items-center justify-between w-full p-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
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
                Wh
                <div className="flex flex-wrap gap-2">
                  {RECOMMENDED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
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
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-gray-600">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-500 mb-3">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </div>
                  {results.map((article) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.id}`}
                      onClick={() => handleResultClick(article)}
                      className="block p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <div className="flex items-start space-x-3">
                        {article.coverImage && (
                          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={article.coverImage}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                            {highlightText(article.title, query)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {highlightText(article.excerpt, query)}
                          </p>
                          <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                            <span>By {article.authorName}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(article.publishedAt || article.createdAt)} ago</span>
                          </div>
                          {/* Tags */}
                          {article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                                >
                                  {highlightText(tag, query)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    No results found
                  </h3>
                  <p className="text-xs text-gray-600">
                    Try adjusting your search terms or browse our recommended topics above.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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