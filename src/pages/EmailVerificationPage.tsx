import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Mail, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const EmailVerificationPage: React.FC = () => {
  const { user, refreshProfile, emailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const handleResendVerification = async () => {
    if (!user) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        toast.error('Too many requests. Please wait before trying again.');
      } else {
        toast.error('Failed to send verification email.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;
    setChecking(true);
    try {
      await user.reload();
      await refreshProfile();
      if (emailVerified) {
        toast.success('Email verified successfully!');
        navigate('/auth'); // Redirect to login page as requested
      } else {
        toast.error('Email not yet verified.');
      }
    } catch (error) {
      toast.error('Error checking verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/'); // Redirect to homepage as requested
    } catch {
      toast.error('Sign out failed');
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user) return;
      await user.reload();
      await refreshProfile();
      if (user.emailVerified) {
        toast.success('Email verified! Welcome to InfoNest.');
        navigate('/dashboard'); // Auto-redirect to dashboard
        clearInterval(interval);
      }
    },);
    return () => clearInterval(interval);
  }, [user, refreshProfile, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#EFEDFA' }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600">
            We've sent a verification link to your email address.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800 text-sm">
                  Please verify your email address to continue using InfoNest.
                </p>
              </div>
            </div>

            <p className="text-gray-700 mb-2">We sent a verification email to:</p>
            <p className="font-semibold text-gray-900 mb-6">{user?.email}</p>

            <p className="text-sm text-gray-600 mb-6">
              Click the verification link in your email to activate your account.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Don't see the email? Check your spam folder or request a new one.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {checking ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>I've Verified My Email</span>
                </>
              )}
            </button>

            <button
              onClick={handleResendVerification}
              disabled={sending}
              className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>

            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-red-600 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Having trouble? Contact support for help.</p>
        </div>
      </div>
    </div>
  );
};