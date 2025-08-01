import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Clock, Tag, ArrowRight } from "lucide-react";
import { getPublishedArticles, getUserArticles, Article } from "../lib/articles";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import Fuse from "fuse.js";
import {
  stripHtmlTags,
  createFuseQuery,
  highlightSearchTerms,
} from "../utils/searchUtils";

interface ExpandableSearchBarProps {
  placeholder?: string;
  className?: string;
  onResultClick?: () => void;
  variant?: "default" | "minimal" | "hero";
  filterByCurrentUser?: boolean; // New prop to filter articles by current user
  isHeaderSearch?: boolean; // New prop to indicate if this is the header search bar
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
  "News & Updates",
];

export const ExpandableSearchBar: React.FC<ExpandableSearchBarProps> = ({
  placeholder = "Search articles...",
  className = "",
  onResultClick,
  variant = "default",
  filterByCurrentUser = false,
  isHeaderSearch = false,
}) => {
  const { userProfile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [fuse, setFuse] = useState<Fuse<Article> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load articles on mount
  useEffect(() => {
    const loadArticles = async () => {
      try {
        let articlesToSearch: Article[];

        if (filterByCurrentUser && userProfile?.uid) {
          // Get only articles by the current user
          articlesToSearch = await getUserArticles(userProfile.uid);
        } else {
          // Get all published articles (default behavior)
          articlesToSearch = await getPublishedArticles();
        }

        setArticles(articlesToSearch);

        // Initialize Fuse.js with fuzzy search configuration
        const fuseInstance = new Fuse(articlesToSearch, {
          keys: [
            { name: "title", weight: 0.4 },
            { name: "categories", weight: 0.3 },
            { name: "tags", weight: 0.2 },
            { name: "authorName", weight: 0.15 },
            {
              name: "excerpt",
              weight: 0.1,
              getFn: (article) => stripHtmlTags(article.excerpt || ""),
            },
            {
              name: "content",
              weight: 0.05,
              getFn: (article) => stripHtmlTags(article.content || ""),
            },
          ],
          includeScore: true,
          includeMatches: true,
          threshold: 0.3,
          ignoreLocation: true,
          minMatchCharLength: 1,
          useExtendedSearch: true,
          shouldSort: true,
        });

        setFuse(fuseInstance);
      } catch (error) {
        console.error("Error loading articles:", error);
      }
    };

    loadArticles();
    loadRecentSearches();
  }, [filterByCurrentUser, userProfile?.uid]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150); // Wait for animation to start
    }
    loadRecentSearches();
  }, [isExpanded]);

  // Load recent searches when user profile changes
  useEffect(() => {
    if (userProfile) {
      loadRecentSearches();
    }
  }, [userProfile]);

  // Handle clicks outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        setSearchQuery("");
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
      if (!searchQuery.trim() || !fuse) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Create Fuse.js query with exact and fuzzy matching
        const fuseQuery = createFuseQuery(searchQuery);

        // Perform fuzzy search
        const searchResults = fuse.search(fuseQuery);

        // Extract articles and sort by score (lower score = better match)
        const sortedResults = searchResults
          .sort((a, b) => (a.score || 0) - (b.score || 0))
          .map((result) => result.item)
          .slice(0, 6); // Limit to top 6 results

        setResults(sortedResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      }

      setLoading(false);
    }, 300),
    [fuse]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    try {
      const userId = userProfile?.uid || "anonymous";
      const stored = localStorage.getItem(`recent_searches_${userId}`);
      if (stored) {
        const searches: RecentSearch[] = JSON.parse(stored);
        // Filter out old searches (older than 30 days) and keep only 5 most recent
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const validSearches = searches
          .filter((search) => search.timestamp > thirtyDaysAgo)
          .slice(0, 5);
        setRecentSearches(validSearches);

        // Update localStorage with cleaned data
        if (validSearches.length !== searches.length) {
          localStorage.setItem(
            `recent_searches_${userId}`,
            JSON.stringify(validSearches)
          );
        }
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
    }
  };

  // Save search to recent searches
  const saveRecentSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    try {
      const userId = userProfile?.uid || "anonymous";
      const stored = localStorage.getItem(`recent_searches_${userId}`);
      let searches: RecentSearch[] = stored ? JSON.parse(stored) : [];

      // Remove existing search if it exists (case-insensitive)
      searches = searches.filter(
        (s) => s.query.toLowerCase() !== searchTerm.toLowerCase()
      );

      // Add new search at the beginning
      searches.unshift({
        query: searchTerm,
        timestamp: Date.now(),
      });

      // Keep only last 5 searches
      searches = searches.slice(0, 5);

      localStorage.setItem(
        `recent_searches_${userId}`,
        JSON.stringify(searches)
      );
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  // Handle result click
  const handleResultClick = (article: Article) => {
    saveRecentSearch(searchQuery);
    onResultClick?.();
    setIsExpanded(false);
    setSearchQuery("");
    setResults([]);
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    debouncedSearch(searchTerm);
  };

  // Handle tag click
  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    debouncedSearch(tag);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setResults([]);
  };

  // Handle search bar click
  const handleSearchBarClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  // Get variant styles with InfoNest gradient colors
  const getVariantStyles = () => {
    switch (variant) {
      case "minimal":
        return "bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#EC4899] p-[1px] rounded-xl hover:shadow-md";
      case "hero":
        return "bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#EC4899] p-[2px] rounded-2xl shadow-lg hover:shadow-xl";
      default:
        return "bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#EC4899] p-[1px] rounded-xl hover:shadow-md";
    }
  };

  // Get inner container styles
  const getInnerContainerStyles = () => {
    switch (variant) {
      case "minimal":
        return "bg-white/95 backdrop-blur-sm rounded-xl";
      case "hero":
        return "bg-white/95 backdrop-blur-sm rounded-2xl";
      default:
        return "bg-white/95 backdrop-blur-sm rounded-xl";
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
      className={`w-full transition-all duration-300 ease-out ${isHeaderSearch ? 'relative' : ''} ${className}`}
      style={{
        zIndex: isExpanded ? 9999 : "auto",
      }}
    >
      {/* Search Input with Gradient Border */}
      <div
        onClick={handleSearchBarClick}
        className={`
          w-full cursor-pointer transition-all duration-300 ease-out
          ${getVariantStyles()}
          ${isExpanded ? "shadow-xl transform scale-[1.01]" : "shadow-sm hover:shadow-md"}
        `}
        style={{
          zIndex: isExpanded ? 9999 : "auto",
        }}
      >
        <div
          className={`
          flex items-center space-x-3 transition-all duration-300 ease-out
          ${getInnerContainerStyles()}
          ${getInputSize()}
        `}
        >
          <Search className={`text-gray-400 flex-shrink-0 transition-all duration-300 ease-out ${getIconSize()} ${isExpanded ? 'text-blue-500' : ''}`} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-500 transition-all duration-300 ease-out"
          />
          {searchQuery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearSearch();
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-all duration-200 flex-shrink-0 transform hover:scale-110"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {!isExpanded && (
            <div className="hidden md:flex items-center space-x-1 text-xs text-gray-400 flex-shrink-0 transition-opacity duration-300">
              <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs transition-all duration-200 hover:bg-gray-200">
                ⌘
              </kbd>
              <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs transition-all duration-200 hover:bg-gray-200">
                K
              </kbd>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content with Gradient Border - Dropdown */}
      <div
        className={`
          overflow-hidden
          bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#EC4899] p-[1px] rounded-b-xl
          transition-all duration-300 ease-out
          ${isHeaderSearch ? 'absolute top-full left-0 right-0 mt-1' : ''}
          ${isExpanded ? "opacity-100 shadow-2xl" : "opacity-0 shadow-none pointer-events-none"}
          ${!isHeaderSearch && isExpanded ? "mt-2" : ""}
          ${!isHeaderSearch && !isExpanded ? "mt-0" : ""}
        `}
        style={{
          transformOrigin: "top center",
          transform: isExpanded ? "scaleY(1)" : "scaleY(0)",
          height: isHeaderSearch ? (isExpanded ? "auto" : "0") : (isExpanded ? "auto" : "0"),
          zIndex: isHeaderSearch ? 9998 : "auto",
        }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-b-xl transition-all duration-300 ease-out">
          <div className="p-4 max-h-80 overflow-y-auto transition-all duration-300 ease-out">
            {!searchQuery && (
              <div className="space-y-4">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        Recent
                      </span>
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
            {searchQuery && (
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-600">Searching...</span>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500 mb-3">
                      {results.length} result{results.length !== 1 ? "s" : ""}{" "}
                      found
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
                              {highlightSearchTerms(article.title, searchQuery)}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {highlightSearchTerms(
                                article.excerpt,
                                searchQuery
                              )}
                            </p>
                            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                              <span>By {article.authorName}</span>
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(
                                  article.publishedAt || article.createdAt
                                )}{" "}
                                ago
                              </span>
                            </div>
                            {/* Tags */}
                            {article.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {article.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                                  >
                                    {highlightSearchTerms(tag, searchQuery)}
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
                      Try adjusting your search terms or browse our recommended
                      topics above.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
