import React, {useState, useEffect} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {getPublishedArticles, Article} from '../lib/articles';
import {
  Search, BookOpen, ArrowRight, Users, Shield, Zap, Clock, Tag,
  Folder, Star, TrendingUp, Eye, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';

interface HomePageData {
  articles: Article[];
  featuredArticles: Article[];
  categories: {name: string; count: number}[];
  tags: string[];
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [homeData, setHomeData] = useState<HomePageData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadHomePageData = async (): Promise<void> => {
    setLoading(true);
    try {
      const publishedArticles = await getPublishedArticles();
      const featuredArticles = publishedArticles.slice(0, 6);
      
      const categoryMap = new Map<string, number>();
      const allTags = new Set<string>();
      
      publishedArticles.forEach(article => {
        article.categories.forEach(cat => {
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        });
        article.tags.forEach(tag => allTags.add(tag));
      });
      
      const categories = Array.from(categoryMap.entries())
        .map(([name, count]) => ({name, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      
      const tags = Array.from(allTags).slice(0, 20);

      setHomeData({
        articles: publishedArticles,
        featuredArticles,
        categories,
        tags
      });
    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomePageData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleDocumentClick = () => {
    navigate('/auth?redirect=dashboard');
  };

  const nextSlide = () => {
    if (!homeData) return;
    setCurrentSlide(prev => (prev + 1) % Math.ceil(homeData.featuredArticles.length / 3));
  };

  const prevSlide = () => {
    if (!homeData) return;
    setCurrentSlide(prev => (prev - 1 + Math.ceil(homeData.featuredArticles.length / 3)) % Math.ceil(homeData.featuredArticles.length / 3));
  };

  // Show loading state while data is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#EFEDFA'}}>
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading InfoNest</h2>
          <p className="text-gray-600">Preparing your knowledge base...</p>
        </div>
      </div>
    );
  }

  // Ensure data is loaded before rendering
  if (!homeData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#EFEDFA'}}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#EFEDFA'}}>
      <header className="backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50" style={{backgroundColor: '#EFEDFA'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">InfoNest</h1>
                <p className="text-xs text-gray-500 -mt-1">Where Documentation Meets Efficiency</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-10 pr-8 ml-auto">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#categories" className="text-gray-600 hover:text-blue-600 transition-colors">Categories</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors">About</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Link to="/auth" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all">Login</Link>
            </div>
          </div>
        </div>
      </header>
      
      <section
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1)),url('/image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-7xl font-bold text-white mb-6" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>Welcome to InfoNest</h1>
          <p className="text-2xl md:text-3xl text-white mb-4 font-light" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>Where Documentation Meets Efficiency</p>
          <p className="text-xl text-white max-w-3xl mx-auto mb-12 leading-relaxed" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>Centralized knowledge hub for your organization's documentation. Discover, search, and access all your important documents in one secure, organized platform.</p>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-16">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400"/>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search articles, guides, documentation..."
                className="w-full pl-16 pr-6 py-5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all"
              >Search</button>
            </div>
          </form>
          <div className="mt-8">
            <Link
              to="/auth"
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <span>Login or Signup to Access Documents</span>
              <ArrowRight className="h-5 w-5"/>
            </Link>
          </div>
        </div>
      </section>
      
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Documentation</h2>
            <p className="text-gray-600 text-lg">Discover our most popular and recently updated articles</p>
          </div>
          
          {homeData.featuredArticles.length > 0 ? (
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{transform: `translateX(-${currentSlide * 100}%)`}}
                >
                  {Array.from({length: Math.ceil(homeData.featuredArticles.length / 3)}).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {homeData.featuredArticles.slice(slideIndex * 3, (slideIndex + 1) * 3).map(article => (
                          <div
                            key={article.id}
                            onClick={handleDocumentClick}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:border-blue-200 transition-all cursor-pointer group hover:shadow-lg"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-3 rounded-xl">
                                <BookOpen className="h-6 w-6 text-blue-600"/>
                              </div>
                              <div className="flex items-center space-x-1 text-yellow-500">
                                <Star className="h-4 w-4 fill-current"/>
                                <span className="text-sm text-gray-600">Featured</span>
                              </div>
                            </div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-3 line-clamp-2">{article.title}</h3>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{article.excerpt}</p>
                            <div className="flex flex-wrap gap-1 mb-4">
                              {article.categories.slice(0, 2).map(category => (
                                <span
                                  key={category}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                >{category}</span>
                              ))}
                              {article.tags.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                >#{tag}</span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>By {article.authorName}</span>
                              <span>{formatDistanceToNow(article.publishedAt || article.createdAt)} ago</span>
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
                  ><ChevronLeft className="h-6 w-6 text-gray-600"/></button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-all"
                  ><ChevronRight className="h-6 w-6 text-gray-600"/></button>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
              <p className="text-gray-500">No featured articles available yet.</p>
            </div>
          )}
        </div>
      </section>
      
      <section id="categories" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-gray-600 text-lg">Explore documentation organized by topics and departments</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {homeData.categories.map(category => (
              <div
                key={category.name}
                onClick={handleDocumentClick}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:border-blue-200 transition-all cursor-pointer group hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-3 rounded-xl">
                    <Folder className="h-6 w-6 text-blue-600"/>
                  </div>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-medium">{category.count}</span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-2">{category.name}</h3>
                <p className="text-gray-600 text-sm">{category.count} article{category.count !== 1 ? 's' : ''} available</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Tags</h2>
            <p className="text-gray-600 text-lg">Quick access to trending topics and keywords</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {homeData.tags.map(tag => (
              <button
                key={tag}
                onClick={handleDocumentClick}
                className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
              >
                <Tag className="h-3 w-3 inline mr-1"/>{tag}
              </button>
            ))}
          </div>
        </div>
      </section>
      
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose InfoNest?</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Powerful features designed to streamline your documentation workflow and enhance team collaboration</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-2xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Search className="h-8 w-8 text-blue-600"/>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Powerful Search</h3>
              <p className="text-gray-600">Find any document instantly with our advanced full-text search across titles, content, and metadata.</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-2xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Shield className="h-8 w-8 text-purple-600"/>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Role-Based Access</h3>
              <p className="text-gray-600">Secure permissions system with User, InfoWriter, and Admin roles to control access and editing rights.</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-2xl w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Zap className="h-8 w-8 text-green-600"/>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Real-time Updates</h3>
              <p className="text-gray-600">Stay current with live updates, version tracking, and instant notifications when content changes.</p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Recently Updated</h2>
            <p className="text-gray-600 text-lg">Stay up-to-date with the latest documentation changes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homeData.articles.slice(0, 6).map(article => (
              <div
                key={article.id}
                onClick={handleDocumentClick}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:border-blue-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1"/>{formatDistanceToNow(article.updatedAt)} ago
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Eye className="h-3 w-3 mr-1"/>v{article.version}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-2 line-clamp-2">{article.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>By {article.authorName}</span>
                  <div className="flex space-x-1">
                    {article.categories.slice(0, 1).map(category => (
                      <span
                        key={category}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                      >{category}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <section id="about" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">About InfoNest</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            InfoNest is a comprehensive documentation platform designed to centralize your organization's
            knowledge base. From SOPs and guides to FAQs and technical documentation, InfoNest provides
            a secure, searchable, and organized environment for all your important information.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{homeData.articles.length}+</div>
              <div className="text-gray-600">Documents Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">{homeData.categories.length}+</div>
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
                  <p className="text-gray-400 text-sm">Where Documentation Meets Efficiency</p>
                </div>
              </div>
              <p className="text-gray-400 max-w-md">
                Streamline your organization's knowledge management with our secure,
                searchable documentation platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#categories" className="hover:text-white transition-colors">Categories</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><Link to="/auth" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
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