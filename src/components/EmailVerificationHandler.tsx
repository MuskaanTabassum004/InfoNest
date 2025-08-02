import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { CheckCircle, XCircle, Loader2, Home, Mail, RefreshCw } from "lucide-react";
import { auth } from "../lib/firebase";

export const EmailVerificationHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  const handleResendVerification = async () => {
    setResending(true);
    setMessage("Please sign up again to receive a new verification email.");
    setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 2000);
    setResending(false);
  };

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

        // First, check the action code to get user info
        const info = await checkActionCode(auth, oobCode);
        const userEmail = info.data.email;
        setUserEmail(userEmail || '');

        // Apply the action code to verify the email
        // This works cross-browser/cross-device without requiring user to be signed in
        await applyActionCode(auth, oobCode);

        // CRITICAL: Handle cross-device verification properly
        // If user is signed in on this device, reload their auth state
        if (auth.currentUser && auth.currentUser.email === userEmail) {
          await auth.currentUser.reload();
        }

        // For cross-device verification, the email is verified in Firebase's system
        // The user will be able to login from any device with verified status

        setStatus('success');
        setMessage('🎉 Email verified successfully! Your account is now active and you can sign in with your verified email.');

        // Redirect to login page after 3 seconds with verified email info
        setTimeout(() => {
          navigate('/auth', {
            replace: true,
            state: {
              message: "✅ Email verified successfully! Please log in to continue.",
              verifiedEmail: userEmail,
              showLogin: true
            }
          });
        }, 3000);
      } catch (error: any) {
        setStatus('error');

        if (error.code === 'auth/invalid-action-code') {
          setMessage('This verification link has expired or has already been used. Please sign up again to receive a new verification email.');
        } else if (error.code === 'auth/expired-action-code') {
          setMessage('This verification link has expired. Please sign up again to receive a new verification email.');
        } else if (error.code === 'auth/user-disabled') {
          setMessage('This account has been disabled. Please contact support.');
        } else if (error.code === 'auth/user-not-found') {
          setMessage('No account found for this verification link. Please sign up again.');
        } else {
          setMessage(`Email verification failed: ${error.message}. Please try signing up again.`);
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
              <p className="text-gray-600 mb-4">{message}</p>
              {userEmail && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800 text-sm font-medium">
                    ✅ Verified Email: {userEmail}
                  </p>
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  🎉 Your account is now active! You can now log in with your verified email from any device.
                </p>
              </div>
              <button
                onClick={() => navigate('/auth', {
                  replace: true,
                  state: {
                    message: "✅ Email verified successfully! Please log in to continue.",
                    verifiedEmail: userEmail,
                    showLogin: true
                  }
                })}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                <Home className="h-4 w-4" />
                <span>Go to Login</span>
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
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {resending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Get New Verification Email</span>
                    </>
                  )}
                </button>
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