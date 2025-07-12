import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom"; // ✅ Fix: add Outlet here
import { useAuth } from "../hooks/useAuth";
import { signOut } from "../lib/auth";
import { RoleBadge, PermissionGate } from "./ProtectedRoute";
import { User, LogOut, PenTool, Shield, Search, Bell } from "lucide-react";
import toast from "react-hot-toast";

export const Layout: React.FC = () => {
  const {
    userProfile,
    isAuthenticated,
    isAdmin,
    isInfoWriter,
    canCreateArticles,
    canManageUsers,
  } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

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
            <Link to="/dashboard" className="flex items-center space-x-3">
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                InfoNest
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/dashboard"
                className={getLinkClass("/dashboard", "blue")}
              >
                <span>Dashboard</span>
              </Link>

              <Link to="/search" className={getLinkClass("/search", "blue")}>
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Link>

              <PermissionGate requiredRoles={["infowriter", "admin"]}>
                <Link
                  to="/my-articles"
                  className={getLinkClass("/my-articles", "purple")}
                >
                  <PenTool className="h-4 w-4" />
                  <span>My Articles</span>
                </Link>
              </PermissionGate>

              <PermissionGate requiredRole="admin">
                <Link to="/admin" className={getLinkClass("/admin", "amber")}>
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              </PermissionGate>
            </div>

            <div className="flex items-center space-x-4">
              <Bell className="h-5 w-5 text-gray-500 hover:text-gray-700 cursor-pointer" />

              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-700">
                    {userProfile?.displayName || userProfile?.email}
                  </span>
                  <div className="flex items-center space-x-2">
                    {userProfile?.role && <RoleBadge role={userProfile.role} />}
                  </div>
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
        <Outlet /> {/* ✅ Main place where nested pages render */}
      </main>
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
