import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { Layout } from "./components/Layout";
import { AuthForm } from "./components/AuthForm";
import { EmailVerificationPage } from "./pages/EmailVerificationPage";
import { EmailVerificationHandler } from "./components/EmailVerificationHandler";
import { HomePage } from "./pages/HomePage";
import { Dashboard } from "./pages/Dashboard";
import { ArticleEditor } from "./pages/ArticleEditor";
import { ArticleView } from "./pages/ArticleView";
import { MyArticles } from "./pages/MyArticles";

import { SearchPage } from "./pages/SearchPage";
import { AdminPanel } from "./pages/AdminPanel";
import { WriterRequestPage } from "./pages/WriterRequestPage";
import { SavedArticles } from "./pages/SavedArticles";
import { ProfilePage } from "./pages/ProfilePage";
import { AuthorProfilePage } from "./pages/AuthorProfilePage";
import { ActiveWritersPage } from "./pages/ActiveWritersPage";
import { RemovedWritersPage } from "./pages/RemovedWritersPage";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { GlobalUploadNotifications } from "./components/GlobalUploadNotifications";
import {
  ProtectedRoute,
  AdminRoute,
  UserRoute,
} from "./components/ProtectedRoute";

// Global keyboard shortcut for search
const useGlobalSearchShortcut = () => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Trigger search modal open
        const event = new CustomEvent('openGlobalSearch');
        window.dispatchEvent(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
function App() {
  // Main application component with notification system integrated
  useGlobalSearchShortcut();

  return (
    <Router>
      <ProfileProvider>
        <AppWithAuth />
      </ProfileProvider>
    </Router>
  );
}

// Component that handles auth state and provides it to the rest of the app
function AppWithAuth() {
  const { loading, isAuthenticated, emailVerified } = useAuth();

  return (
    <NotificationProvider>
      {loading ? (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "#EFEDFA" }}
        >
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : (
        <AppContent
          isAuthenticated={isAuthenticated}
          emailVerified={emailVerified}
        />
      )}
    </NotificationProvider>
  );
}

// Separate component for the main app content
function AppContent({
  isAuthenticated,
  emailVerified,
}: {
  isAuthenticated: boolean;
  emailVerified: boolean;
}) {
  return (
    <div
      className="App"
      style={{ backgroundColor: "#EFEDFA", minHeight: "100vh" }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#374151",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          },
        }}
      />

      {/* Global Offline Indicator */}
      <OfflineIndicator />

      {/* Global Upload Notifications */}
      <GlobalUploadNotifications />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/verify-email" element={<EmailVerificationHandler />} />
        <Route
          path="/auth"
          element={
            !isAuthenticated ? <AuthForm /> : <Navigate to="/" replace />
          }
        />
        <Route 
          path="/email-verify" 
          element={
            isAuthenticated && !emailVerified ? (
              <EmailVerificationPage />
            ) : isAuthenticated && emailVerified ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/auth" replace />
            )
          } 
        />

        {/* Author Profile - Public route (viewable by anyone) */}
        <Route path="/author/:authorId" element={<AuthorProfilePage />} />

        {/* Protected Routes */}
        {isAuthenticated ? (
          <Route path="/*" element={<Layout />}>
            {/* Routes accessible to all authenticated users */}
            <Route
              path="dashboard"
              element={
                emailVerified ? (
                  <UserRoute>
                    <Dashboard />
                  </UserRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="article/:id"
              element={
                emailVerified ? (
                  <UserRoute>
                    <ArticleView />
                  </UserRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="writer-request"
              element={
                emailVerified ? (
                  <UserRoute>
                    <WriterRequestPage />
                  </UserRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="saved-articles"
              element={
                emailVerified ? (
                  <UserRoute>
                    <SavedArticles />
                  </UserRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="profile"
              element={
                emailVerified ? (
                  <UserRoute>
                    <ProfilePage />
                  </UserRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            
            

            {/* InfoWriter and Admin only routes */}
            <Route
              path="search"
              element={
                emailVerified ? (
                  <ProtectedRoute requiredRoles={["infowriter", "admin"]}>
                    <SearchPage />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="article/new"
              element={
                emailVerified ? (
                  <ProtectedRoute requiredRoles={["infowriter", "admin"]}>
                    <ArticleEditor />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="article/edit/:id"
              element={
                emailVerified ? (
                  <ProtectedRoute requiredRoles={["infowriter", "admin"]}>
                    <ArticleEditor />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="my-articles"
              element={
                emailVerified ? (
                  <ProtectedRoute requiredRoles={["infowriter", "admin"]}>
                    <MyArticles />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />

            {/* Admin only routes */}
            <Route
              path="admin"
              element={
                emailVerified ? (
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="admin/writer-requests"
              element={
                emailVerified ? (
                  <AdminRoute>
                    <WriterRequestPage />
                  </AdminRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="admin/active-writers"
              element={
                emailVerified ? (
                  <AdminRoute>
                    <ActiveWritersPage />
                  </AdminRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
            <Route
              path="admin/removed-writers"
              element={
                emailVerified ? (
                  <AdminRoute>
                    <RemovedWritersPage />
                  </AdminRoute>
                ) : (
                  <Navigate to="/email-verify" replace />
                )
              }
            />
          

            <Route path="*" element={
              emailVerified ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/email-verify" replace />
              )
            } />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/auth" replace />} />
        )}
      </Routes>
    </div>
  );
}

export default App;
