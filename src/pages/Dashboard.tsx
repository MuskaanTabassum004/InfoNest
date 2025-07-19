import React, { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { UserDashboard } from "./UserDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { InfoWriterDashboard } from "./InfoWriterDashboard";

export const Dashboard: React.FC = () => {
  const { userProfile, isAdmin, isInfoWriter, isUser, loading, permissions } =
    useAuth();

  // Memoized dashboard component selection for performance
  const DashboardComponent = useMemo(() => {
    if (!userProfile) return null;

    // Use cached permissions for faster routing
    if (isAdmin) {
      return AdminDashboard;
    }

    if (isInfoWriter) {
      return InfoWriterDashboard;
    }

    if (isUser) {
      return UserDashboard;
    }

    return null;
  }, [userProfile, isAdmin, isInfoWriter, isUser]);

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
