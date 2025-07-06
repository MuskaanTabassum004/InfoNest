import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { getPublishedArticles, Article } from '../lib/articles';
import Fuse from 'fuse.js';
import { Link } from 'react-router-dom';

interface SearchBarProps {
  onResultClick?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onResultClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = new Fuse(articles, {
    keys: ['title', 'content', 'excerpt', 'tags', 'categories'],
    threshold: 0.3,
    includeScore: true
  });

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const publishedArticles = await getPublishedArticles();
        setArticles(publishedArticles);
      } catch (error) {
        console.error('Error loading articles:', error);
      }
    };

    loadArticles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim() === '') {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    
    // Simulate search delay for better UX
    setTimeout(() => {
      const searchResults = fuse.search(searchQuery).map(result => result.item);
      setResults(searchResults.slice(0, 8)); // Limit to 8 results
      setIsOpen(true);
      setLoading(false);
    }, 200);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    onResultClick?.();
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div ref={searchRef} className="relative max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Search articles, categories, tags..."
          className="w-full pl-12 pr-12 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
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

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  onClick={handleResultClick}
                  className="block p-4 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {highlightText(article.title, query)}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {highlightText(article.excerpt, query)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {article.categories.map((category) => (
                      <span
                        key={category}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : query ? (
            <div className="p-4 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No articles found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};