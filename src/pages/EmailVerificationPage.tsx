import React, { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import {
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { Mail, RefreshCw, LogOut, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";

export const EmailVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sending, setSending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>("");
  const [verificationDisplayName, setVerificationDisplayName] =
    useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Get email and displayName from navigation state (passed from signup)
  useEffect(() => {
    const state = location.state as { email?: string; displayName?: string };
    if (state?.email) {
      setVerificationEmail(state.email);
      setVerificationDisplayName(state.displayName || "");
    } else {
      // If no email in state, redirect to auth page
      navigate("/auth");
    }
  }, [location.state, navigate]);

  const handleResendVerification = async () => {
    if (!currentUser) {
      toast.error("Please sign in first to resend verification email.");
      return;
    }

    setSending(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully");
      navigate("/");
    } catch {
      toast.error("Sign out failed");
    }
  };

  // Real-time Firebase Auth state listener with cross-device verification detection
  useEffect(() => {
    console.log("🔄 Setting up verification listener");

    // Real-time Firebase Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        console.log("🔍 Auth state changed");

        // Force reload user to get latest verification status
        try {
          await firebaseUser.reload();
        } catch (error) {
          console.error("Error reloading user:", error);
        }
        if (firebaseUser.emailVerified && !isVerified) {
          console.log("✅ Email verification detected");
          setIsVerified(true);

          // Show success message
          toast.success("Email verified! Welcome to InfoNest.");

          // Navigate to homepage
          navigate("/", {
            replace: true,
          });
        }
      } else {
        // User signed out
        setCurrentUser(null);
      }
    });

    // Set up periodic check for cross-device verification
    const checkInterval = setInterval(async () => {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        try {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified && !isVerified) {
            setIsVerified(true);
            toast.success(
              "Email verified from another device! Welcome to InfoNest."
            );
            navigate("/", { replace: true }); // Navigate to homepage after verification
          }
        } catch (error) {
          console.error("Error checking verification status:", error);
        }
      }
    }, 3000); // Check every 3 seconds
    return () => {
      unsubscribe();
      clearInterval(checkInterval);
    };
  }, [isVerified, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#EFEDFA" }}
    >
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

            <p className="text-gray-700 mb-2">
              We sent a verification email to:
            </p>
            <p className="font-semibold text-gray-900 mb-6">
              {verificationEmail}
            </p>

            <p className="text-sm text-gray-600 mb-6">
              Click the verification link in your email to activate your
              account.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Don't see the email? Check your spam folder or request a new one.
            </p>
          </div>

          {/* Real-time Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse h-3 w-3 bg-blue-500 rounded-full"></div>
              <p className="text-blue-800 text-sm font-medium">
                Waiting for email verification... This will happen automatically
                when you click the link from any device.
              </p>
            </div>
            <p className="text-blue-700 text-xs mt-2">
              💡 You can verify your email from any device - mobile, tablet, or
              computer. Once verified, this page will automatically update.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleResendVerification}
              disabled={sending || !currentUser}
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

            {!currentUser && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  ⚠️ You've been signed out. Please sign in again to resend the
                  verification email.
                </p>
              </div>
            )}

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
          <p>
            Having trouble? You can verify your email from any device. Contact
            support if you need help.
          </p>
        </div>
      </div>
    </div>
  );
};
