import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { handleEmailVerification } from "../lib/auth";
import { CheckCircle, XCircle, Loader2, Home } from "lucide-react";
import toast from "react-hot-toast";

export const EmailVerificationHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const mode = searchParams.get('mode');
      const oobCode = searchParams.get('oobCode');

      if (mode !== 'verifyEmail' || !oobCode) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        setStatus('loading');
        setMessage('Verifying your email address...');
        

        const success = await handleEmailVerification(oobCode);
        
        if (success) {
          setStatus('success');
          setMessage('Email verified successfully! Your account is now active and you can sign in.');
          toast.success('Email verified! Welcome to InfoNest.');
          
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Email verification failed. The verification link may be invalid or expired. Please try signing up again.');
        }
      } catch (error: any) {
        console.error('Email verification error:', error.code || 'Unknown error');
        setStatus('error');
        
        if (error.code === 'auth/invalid-action-code') {
          setMessage('This verification link has expired or has already been used. Please sign up again to receive a new verification email.');
        } else if (error.code === 'auth/user-disabled') {
          setMessage('This account has been disabled. Please contact support.');
        } else if (error.code === 'auth/user-not-found') {
          setMessage('No account found for this verification link. Please sign up again.');
        } else {
          setMessage(error.message || 'Email verification failed. Please try again or contact support.');
        }
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#EFEDFA" }}
    >
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Verifying Email
              </h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Email Verified!
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  🎉 Your account is now active! You'll be redirected to the homepage in a few seconds.
                </p>
              </div>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                <Home className="h-4 w-4" />
                <span>Go to Homepage</span>
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="bg-red-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Verification Failed
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/auth', { replace: true })}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Sign Up Again
                </button>
                <button
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Go to Homepage
                </button>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Having trouble? Contact support for assistance.</p>
        </div>
      </div>
    </div>
  );
};