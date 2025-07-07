import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { AuthForm } from './components/AuthForm';
import { HomePage } from './pages/HomePage';
import { Dashboard } from './pages/Dashboard';
import { ArticleEditor } from './pages/ArticleEditor';
import { ArticleView } from './pages/ArticleView';
import { MyArticles } from './pages/MyArticles';
import { SearchPage } from './pages/SearchPage';
import { AdminPanel } from './pages/AdminPanel';
import { WriterRequestPage } from './pages/WriterRequestPage';

function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDFA' }}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App" style={{ backgroundColor: '#EFEDFA', minHeight: '100vh' }}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#374151',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={!isAuthenticated ? <AuthForm /> : <Navigate to="/dashboard" replace />} />
          
          {/* Protected Routes */}
          {isAuthenticated ? (
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/article/new" element={<ArticleEditor />} />
                  <Route path="/article/edit/:id" element={<ArticleEditor />} />
                  <Route path="/article/:id" element={<ArticleView />} />
                  <Route path="/my-articles" element={<MyArticles />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/writer-request" element={<WriterRequestPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            } />
          ) : (
            <Route path="*" element={<Navigate to="/auth" replace />} />
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;