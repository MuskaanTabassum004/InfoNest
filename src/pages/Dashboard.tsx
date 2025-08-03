import React, { useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { UserDashboard } from "./UserDashboard";
import { AdminDashboard } from "./AdminDashboard";

export const Dashboard: React.FC = () => {
  const { userProfile, isAdmin, isInfoWriter, isUser, loading, permissions } =
    useAuth();
  const navigate = useNavigate();

  // Redirect InfoWriters to My Articles page
  useEffect(() => {
    if (userProfile && isInfoWriter && !isAdmin) {
      navigate("/my-articles", { replace: true });
    }
  }, [userProfile, isInfoWriter, isAdmin, navigate]);

  // Memoized dashboard component selection for performance
  const DashboardComponent = useMemo(() => {
    if (!userProfile) return null;

    // Use cached permissions for faster routing
    if (isAdmin) {
      return AdminDashboard;
    }

    // InfoWriters are now redirected to My Articles, so this won't be reached
    // unless they are also admins
    if (isUser) {
      return UserDashboard;
    }

    return null;
  }, [userProfile, isAdmin, isUser]);

  // Loading state - only show on initial load, not on cached data
  if (loading && !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // No user profile
  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">Please log in to access the dashboard.</p>
      </div>
    );
  }

  // No dashboard component found
  if (!DashboardComponent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Unknown Role</h2>
        <p className="text-gray-600">
          Your account role is not recognized. Please contact support.
        </p>
      </div>
    );
  }

  // Render the appropriate dashboard with cached permissions
  return <DashboardComponent />;
};
