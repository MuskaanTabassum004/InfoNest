import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { WriterRequestForm } from '../components/WriterRequestForm';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const WriterRequestPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#EFEDFA' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        
        <WriterRequestForm onClose={() => navigate('/dashboard')} />
      </div>
    </div>
  );
};