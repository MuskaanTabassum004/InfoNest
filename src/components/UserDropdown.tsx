import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import { getRecentSearches } from '../lib/search';
import { getUnreadNotificationCount } from '../lib/notifications';
import { getUnreadMessageCount } from '../lib/messaging';
import { 
  User, 
  ChevronDown, 
  Home,
  Bookmark, 
  Search, 
  FileText, 
  Settings, 
  LogOut,
  Shield,
  Bell,
  MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const UserDropdown: React.FC = () => {
  const { userProfile, isUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!userProfile) return;

      try {
        const [searches, notifications, messages] = await Promise.all([
          getRecentSearches(userProfile.uid),
          getUnreadNotificationCount(userProfile.uid),
          getUnreadMessageCount(userProfile.uid)
        ]);

        setRecentSearches(searches.slice(0, 5));
        setUnreadNotifications(notifications);
        setUnreadMessages(messages);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    if (isOpen) {
      loadUserData();
    }
  }, [isOpen, userProfile]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'infowriter':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!userProfile) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-gray-700">
            {userProfile.displayName || userProfile.email}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getRoleColor(userProfile.role)}`}>
            {userProfile.role}
          </span>
        </div>

        {userProfile.profilePicture ? (
          <img
            src={userProfile.profilePicture}
            alt={userProfile.displayName || 'Profile'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-full">
            <User className="h-4 w-4 text-white" />
          </div>
        )}

        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              {userProfile.profilePicture ? (
                <img
                  src={userProfile.profilePicture}
                  alt={userProfile.displayName || 'Profile'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {userProfile.displayName || 'User'}
                </h3>
                <p className="text-sm text-gray-600">{userProfile.email}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Shield className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-500 capitalize">{userProfile.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="py-2">
            {/* Home */}
            <Link
              to="/home"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>

            {/* Dashboard (Role-based) */}
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            {/* Saved Articles */}
            <Link
              to="/saved-articles"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Bookmark className="h-4 w-4" />
              <span>Saved Articles</span>
            </Link>

            {/* Messages */}
            <Link
              to="/messages"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-4 w-4" />
                <span>Messages</span>
              </div>
              {unreadMessages > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadMessages}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </div>
              {unreadNotifications > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadNotifications}
                </span>
              )}
            </Link>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <>
                <div className="border-t border-gray-100 my-2"></div>
                <div className="px-4 py-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Recent Searches
                  </h4>
                  {recentSearches.map((search, index) => (
                    <Link
                      key={index}
                      to={`/search?q=${encodeURIComponent(search)}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Search className="h-3 w-3" />
                      <span className="truncate">{search}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Request InfoWriter Access (for users only) */}
            {isUser && (
              <>
                <div className="border-t border-gray-100 my-2"></div>
                <Link
                  to="/writer-request"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>Request InfoWriter Access</span>
                </Link>
              </>
            )}

            <div className="border-t border-gray-100 my-2"></div>

            {/* Profile */}
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>

            {/* Settings */}
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>

            <div className="border-t border-gray-100 my-2"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};