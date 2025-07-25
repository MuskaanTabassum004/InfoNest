import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom"; // ✅ Fix: add Outlet here
import { useAuth } from "../hooks/useAuth";
import { signOut } from "../lib/auth";
import { RoleBadge, PermissionGate } from "./ProtectedRoute";
import { SearchBar } from "./SearchBar";
import {
  User,
  LogOut,
  PenTool,
  Shield,
  Search,
  MessageCircle,
  UserCog,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { NotificationDropdown } from "./NotificationDropdown";
import { NetworkStatus } from "./NetworkStatus";
import { UploadManager } from "./UploadManager";
import { resumableUploadManager } from "../lib/resumableUpload";

export const Layout: React.FC = () => {
  const { userProfile, isAuthenticated, isInfoWriter, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showUploadManager, setShowUploadManager] = useState(false);
  const [hasActiveUploads, setHasActiveUploads] = useState(false);

  // Monitor active uploads
  useEffect(() => {
    const interval = setInterval(() => {
      const activeUploads = resumableUploadManager.getActiveUploads();
      const hasActive = activeUploads.length > 0;
      setHasActiveUploads(hasActive);

      // Auto-show upload manager when uploads are active
      if (hasActive && !showUploadManager) {
        setShowUploadManager(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [showUploadManager]);

  const handleLogout = async () => {
    try {
      // Use regular signOut function
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#EFEDFA" }}>
        <Outlet />{" "}
        {/* ✅ Still render nested routes for unauthenticated pages */}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#EFEDFA" }}>
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3">
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                InfoNest
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-6 flex-1 max-w-md mx-8">
              {/* Header Search Bar */}
              <SearchBar
                variant="minimal"
                placeholder="Search..."
                onResultClick={() => {}}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-4">
              <NotificationDropdown />

              {/* Upload Manager Toggle */}
              {hasActiveUploads && (
                <button
                  onClick={() => setShowUploadManager(!showUploadManager)}
                  className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Upload Manager"
                >
                  <Upload className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                    {resumableUploadManager.getActiveUploads().length}
                  </span>
                </button>
              )}

              <div className="relative" data-dropdown>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {userProfile?.displayName || userProfile?.email}
                    </div>
                    <div className="flex items-center justify-end space-x-2">
                      {userProfile?.role && (
                        <RoleBadge role={userProfile.role} />
                      )}
                    </div>
                  </div>

                  {userProfile?.profilePicture ? (
                    <img
                      src={userProfile.profilePicture}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/personal-dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserCog className="h-4 w-4" />
                        <span>Personal Dashboard</span>
                      </Link>
                    )}
                    {isInfoWriter && !isAdmin && (
                      <Link
                        to="/article/new"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <PenTool className="h-4 w-4" />
                        <span>Create New Article</span>
                      </Link>
                    )}
                    
                    
                    <hr className="my-2" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet /> {/* ✅ Main place where nested pages render */}
      </main>

      {/* Global Upload Manager */}
      <UploadManager
        isOpen={showUploadManager}
        onClose={() => setShowUploadManager(false)}
      />
    </div>
  );

  function getLinkClass(path: string, color: "blue" | "purple" | "amber") {
    const isActive = isActiveRoute(path);
    const base =
      "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors";

    const activeColors: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700",
      purple: "bg-purple-100 text-purple-700",
      amber: "bg-amber-100 text-amber-700",
    };

    const inactiveColors: Record<string, string> = {
      blue: "text-gray-600 hover:text-blue-600 hover:bg-blue-50",
      purple: "text-gray-600 hover:text-purple-600 hover:bg-purple-50",
      amber: "text-gray-600 hover:text-amber-600 hover:bg-amber-50",
    };

    return `${base} ${isActive ? activeColors[color] : inactiveColors[color]}`;
  }
};
