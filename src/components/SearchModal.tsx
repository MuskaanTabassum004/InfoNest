import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, Tag } from "lucide-react";
import { Article } from "../lib/articles";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import Fuse from "fuse.js";
import { stripHtmlTags, createFuseQuery, highlightSearchTerms } from "../utils/searchUtils";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { firestore } from "../lib/firebase";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [fuse, setFuse] = useState<Fuse<Article> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load articles and recent searches on mount with real-time updates
  useEffect(() => {
    if (!isOpen) return;

    // Set up real-time listener for published articles
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

        setArticles(publishedArticles);

        // Initialize Fuse.js with fuzzy search configuration
        const fuseInstance = new Fuse(publishedArticles, {
          keys: [
            { name: 'title', weight: 0.4 },
            { name: 'categories', weight: 0.3 },
            { name: 'tags', weight: 0.2 },
            { name: 'authorName', weight: 0.15 },
            {
              name: 'excerpt',
              weight: 0.1,
              getFn: (article) => stripHtmlTags(article.excerpt || '')
            },
            {
              name: 'content',
              weight: 0.05,
              getFn: (article) => stripHtmlTags(article.content || '')
            }
          ],
          includeScore: true,
          includeMatches: true,
          threshold: 0.3,
          ignoreLocation: true,
          minMatchCharLength: 1,
          useExtendedSearch: true,
          shouldSort: true
        });

        setFuse(fuseInstance);
      } catch (error) {
        console.error("Error loading articles:", error);
      }
    });

    loadRecentSearches();

    return () => unsubscribe();
  }, [isOpen]);

  // Load recent searches when user profile changes
  useEffect(() => {
    if (userProfile) {
      loadRecentSearches();
    }
  }, [userProfile]);

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
      } else if (e.key === "Enter" && searchQuery.trim()) {
        // Save search when Enter is pressed
        saveRecentSearch(searchQuery);
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
  }, [isOpen, onClose, searchQuery]);

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
          .map(result => result.item)
          .slice(0, 8); // Limit to top 8 results
        
        setResults(sortedResults);
      } catch (error) {
        console.error('Search error:', error);
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
      const userId = userProfile?.uid || 'anonymous';
      const stored = localStorage.getItem(`recent_searches_${userId}`);
      if (stored) {
        const searches: RecentSearch[] = JSON.parse(stored);
        // Filter out old searches (older than 30 days) and keep only 5 most recent
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const validSearches = searches
          .filter(search => search.timestamp > thirtyDaysAgo)
          .slice(0, 5);
        setRecentSearches(validSearches);

        // Update localStorage with cleaned data
        if (validSearches.length !== searches.length) {
          localStorage.setItem(`recent_searches_${userId}`, JSON.stringify(validSearches));
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
      const userId = userProfile?.uid || 'anonymous';
      const stored = localStorage.getItem(`recent_searches_${userId}`);
      let searches: RecentSearch[] = stored ? JSON.parse(stored) : [];

      // Remove existing search if it exists (case-insensitive)
      searches = searches.filter(s => s.query.toLowerCase() !== searchTerm.toLowerCase());

      // Add new search at the beginning
      searches.unshift({
        query: searchTerm,
        timestamp: Date.now()
      });

      // Keep only last 5 searches
      searches = searches.slice(0, 5);

      localStorage.setItem(`recent_searches_${userId}`, JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  // Handle result click
  const handleResultClick = (article: Article) => {
    saveRecentSearch(searchQuery);
    onResultClick?.();
    onClose();
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
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search articles, authors, categories..."
              className="w-full pl-12 pr-12 py-4 text-lg border-none outline-none bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
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
          {!searchQuery && (
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
          {searchQuery && (
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
                            {highlightSearchTerms(article.title, query)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {highlightSearchTerms(article.excerpt, query)}
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
                                  {highlightSearchTerms(tag, query)}
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