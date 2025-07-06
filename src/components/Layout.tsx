import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Settings, 
  PenTool,
  Shield,
  Search,
  Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userProfile, isAuthenticated, isAdmin, isInfoWriter } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EFEDFA' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEDFA' }}>
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <Link to="/dashboard" className="flex items-center space-x-3">
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                InfoNest
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActiveRoute('/dashboard')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <span>Dashboard</span>
              </Link>

              <Link
                to="/search"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActiveRoute('/search')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Link>

              {isInfoWriter && (
                <Link
                  to="/my-articles"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActiveRoute('/my-articles')
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <PenTool className="h-4 w-4" />
                  <span>My Articles</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActiveRoute('/admin')
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="h-5 w-5 text-gray-500 hover:text-gray-700 cursor-pointer" />
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-700">
                    {userProfile?.displayName || userProfile?.email}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {userProfile?.role}
                  </span>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-full">
                  <User className="h-4 w-4 text-white" />
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};