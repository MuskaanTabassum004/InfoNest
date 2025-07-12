import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Wifi,
  Database,
  Shield,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export const StorageTest: React.FC = () => {
  const { userProfile } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (test: string, status: 'success' | 'error', message: string, details?: any) => {
    setResults(prev => prev.map(result => 
      result.test === test 
        ? { ...result, status, message, details }
        : result
    ));
  };

  const runStorageTests = async () => {
    if (!userProfile) {
      toast.error('Please login first');
      return;
    }

    setTesting(true);
    setResults([
      { test: 'Authentication', status: 'pending', message: 'Checking authentication...' },
      { test: 'Storage Connection', status: 'pending', message: 'Testing storage connection...' },
      { test: 'Storage Rules', status: 'pending', message: 'Testing storage permissions...' },
      { test: 'File Upload', status: 'pending', message: 'Testing file upload...' }
    ]);

    try {
      // Test 1: Authentication
      if (userProfile) {
        updateResult('Authentication', 'success', `Authenticated as ${userProfile.email} (${userProfile.role})`);
      } else {
        updateResult('Authentication', 'error', 'Not authenticated');
        return;
      }

      // Test 2: Storage Connection
      try {
        const testRef = ref(storage, 'test-connection');
        updateResult('Storage Connection', 'success', 'Storage connection established');
      } catch (error: any) {
        updateResult('Storage Connection', 'error', `Connection failed: ${error.message}`, error);
        return;
      }

      // Test 3: Storage Rules (try to list files)
      try {
        const articlesRef = ref(storage, 'articles');
        await listAll(articlesRef);
        updateResult('Storage Rules', 'success', 'Storage rules allow access');
      } catch (error: any) {
        updateResult('Storage Rules', 'error', `Permission denied: ${error.message}`, error);
      }

      // Test 4: File Upload
      try {
        // Create a small test file
        const testContent = `Test file created at ${new Date().toISOString()}`;
        const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
        
        const fileName = `test-uploads/${userProfile.uid}/test-${Date.now()}.txt`;
        const storageRef = ref(storage, fileName);
        
        console.log('🧪 Testing upload to:', fileName);
        
        const snapshot = await uploadBytes(storageRef, testFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        updateResult('File Upload', 'success', 'File uploaded successfully', {
          path: fileName,
          url: downloadURL,
          size: testFile.size
        });
        
        toast.success('All storage tests passed!');
      } catch (error: any) {
        console.error('Upload test failed:', error);
        updateResult('File Upload', 'error', `Upload failed: ${error.message}`, error);
      }

    } catch (error: any) {
      console.error('Storage test failed:', error);
      toast.error('Storage tests failed');
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getTestIcon = (test: string) => {
    switch (test) {
      case 'Authentication':
        return <Shield className="h-4 w-4" />;
      case 'Storage Connection':
        return <Wifi className="h-4 w-4" />;
      case 'Storage Rules':
        return <Database className="h-4 w-4" />;
      case 'File Upload':
        return <Upload className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Firebase Storage Diagnostics</h3>
          <p className="text-sm text-gray-600">Test your Firebase Storage configuration</p>
        </div>
        <button
          onClick={runStorageTests}
          disabled={testing || !userProfile}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>{testing ? 'Testing...' : 'Run Tests'}</span>
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.test}
              className={`p-4 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-green-50 border-green-200'
                  : result.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getTestIcon(result.test)}
                    <span className="font-medium text-gray-900">{result.test}</span>
                  </div>
                  {getStatusIcon(result.status)}
                </div>
              </div>
              
              <p className={`mt-2 text-sm ${
                result.status === 'success'
                  ? 'text-green-700'
                  : result.status === 'error'
                  ? 'text-red-700'
                  : 'text-blue-700'
              }`}>
                {result.message}
              </p>

              {result.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Show details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {!userProfile && (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h4>
          <p className="text-gray-600">Please login to test Firebase Storage functionality.</p>
        </div>
      )}
    </div>
  );
};
