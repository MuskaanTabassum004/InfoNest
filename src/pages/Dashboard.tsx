import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPublishedArticles, getUserArticles, Article } from '../lib/articles';
import { getUserWriterRequest, WriterRequest } from '../lib/writerRequests';
import { SearchBar } from '../components/SearchBar';
import { 
  BookOpen, 
  PenTool, 
  Clock, 
  User,
  ArrowRight,
  TrendingUp,
  Star,
  Plus,
  Calendar,
  Tag,
  FileText,
  CheckCircle,
  XCircle,
  Folder,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const { userProfile, isInfoWriter, isUser, isAdmin, refreshProfile } = useAuth();
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [myArticles, setMyArticles] = useState<Article[]>([]);
  const [writerRequest, setWriterRequest] = useState<WriterRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const published = await getPublishedArticles();
        setPublishedArticles(published);
        setFilteredArticles(published.slice(0, 6));

        // Extract categories and tags for filtering
        const allCategories = new Set<string>();
        const allTags = new Set<string>();
        
        published.forEach(article => {
          article.categories.forEach(cat => allCategories.add(cat));
          article.tags.forEach(tag => allTags.add(tag));
        });
        
        setCategories(Array.from(allCategories).sort());
        setTags(Array.from(allTags).sort());

        if (isInfoWriter && userProfile?.uid) {
          const my = await getUserArticles(userProfile.uid);
          setMyArticles(my);
        }

        // Check for writer request status
        if (userProfile) {
          const request = await getUserWriterRequest(userProfile.uid);
          setWriterRequest(request);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    if (userProfile) {
      loadData();
    }
  }, [isInfoWriter, userProfile]);

  useEffect(() => {
    filterArticles();
  }, [publishedArticles, selectedCategory, selectedTags]);

  const filterArticles = () => {
    let filtered = publishedArticles;

    if (selectedCategory) {
      filtered = filtered.filter(article => 
        article.categories.includes(selectedCategory)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(article => 
        selectedTags.every(tag => article.tags.includes(tag))
      );
    }

    setFilteredArticles(filtered.slice(0, 6));
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? '' : category);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedTags([]);
  };

  const getRequestStatusDisplay = () => {
    if (!writerRequest) return null;

    switch (writerRequest.status) {
      case 'pending':
        return (
          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">
                  InfoWriter Request Under Review
                </h3>
                <p className="text-yellow-700">
                  Your InfoWriter application (ID: {writerRequest.requestId}) is being reviewed by our admin team.
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  Submitted {formatDistanceToNow(writerRequest.submittedAt)} ago
                </p>
              </div>
            </div>
          </div>
        );
      case 'approved':
        return (
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  InfoWriter Access Approved!
                </h3>
                <p className="text-green-700">
                  Congratulations! Your InfoWriter application has been approved. You can now create and manage articles.
                </p>
              </div>
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">
                    InfoWriter Request Not Approved
                  </h3>
                  <p className="text-red-700">
                    Your InfoWriter application was not approved at this time.
                  </p>
                  {writerRequest.adminNotes && (
                    <p className="text-sm text-red-600 mt-1">
                      Admin notes: {writerRequest.adminNotes}
                    </p>
                  )}
                </div>
              </div>
              <Link
                to="/writer-request"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Apply Again
              </Link>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Welcome to InfoNest
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {isUser && "Your centralized knowledge management platform. Discover, learn, and contribute to our growing library of documentation."}
          {isInfoWriter && "Create, manage, and share your knowledge with the community."}
          {isAdmin && "Manage the platform and oversee all content and users."}
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* First stat - different for each role */}
        {isUser && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Saved Articles</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500 mt-1">Feature coming soon</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {isInfoWriter && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">My Articles</p>
                <p className="text-2xl font-bold text-gray-900">{myArticles.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900">{publishedArticles.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {/* Second stat */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Folder className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Third stat */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Your Role</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{userProfile?.role}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <User className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Writer Request Status */}
      {getRequestStatusDisplay()}

      {/* Writer Access Request for Users */}
      {isUser && !writerRequest && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Want to contribute content?
              </h3>
              <p className="text-gray-600">
                Apply for InfoWriter access to create and manage articles with our comprehensive application form.
              </p>
            </div>
            <Link
              to="/writer-request"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Apply Now</span>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions for InfoWriter */}
      {isInfoWriter && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/article/new"
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl transition-all group"
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create New Article</h3>
                <p className="text-sm text-gray-600">Start writing a new documentation</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 ml-auto" />
            </Link>

            <Link
              to="/my-articles"
              className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-xl transition-all group"
            >
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Manage Articles</h3>
                <p className="text-sm text-gray-600">Edit and organize your content</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 ml-auto" />
            </Link>
          </div>
        </div>
      )}

      {/* Category Browsing for Users */}
      {isUser && categories.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Folder className="h-5 w-5 mr-2 text-blue-500" />
              Browse by Category
            </h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory('')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 12).map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
      )}

      {/* Tag Browsing for Users */}
      {isUser && tags.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-purple-500" />
              Browse by Tags
              {selectedTags.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {selectedTags.length} selected
                </span>
              )}
            </h2>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 20).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Display for Users */}
      {isUser && (selectedCategory || selectedTags.length > 0) && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-blue-800 font-medium">Active filters:</span>
              {selectedCategory && (
                <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs flex items-center space-x-1">
                  <span>{selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('')}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedTags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs flex items-center space-x-1">
                  <span>#{tag}</span>
                  <button onClick={() => handleTagToggle(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* My Recent Articles (InfoWriter) */}
      {isInfoWriter && myArticles.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Recent Articles</h2>
            <Link
              to="/my-articles"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myArticles.slice(0, 4).map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="block p-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-700 line-clamp-1">
                    {article.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    article.status === 'published' 
                      ? 'bg-green-100 text-green-700'
                      : article.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {article.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(article.updatedAt)} ago
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Articles */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isUser && (selectedCategory || selectedTags.length > 0) ? 'Filtered Articles' : 'Recent Articles'}
            {!isUser && 'Recent Articles'}
          </h2>
          <Link
            to="/search"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>Browse all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {publishedArticles.length === 0 ? 'No articles yet' : 'No articles match your filters'}
            </h3>
            <p className="text-gray-600">
              {publishedArticles.length === 0 
                ? 'Be the first to contribute to the knowledge base!'
                : 'Try adjusting your filter criteria.'}
            </p>
            {isUser && (selectedCategory || selectedTags.length > 0) && (
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
                className="block bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 rounded-xl p-6 border border-gray-200 hover:border-blue-200 transition-all group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {article.categories.slice(0, 2).map((category) => (
                    <span
                      key={category}
                      className={`px-2 py-1 text-xs rounded-full ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {category}
                    </span>
                  ))}
                  {article.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-1 text-xs rounded-full ${
                        selectedTags.includes(tag)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>By {article.authorName}</span>
                  <span>{formatDistanceToNow(article.publishedAt || article.createdAt)} ago</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};