import React, { useState } from "react";
import { Link } from "react-router-dom";
import { signIn, signUp, signInWithGoogle } from "../lib/auth";
import {
  validateEmail,
  validateEmailRealTime,
  EmailValidationResult,
} from "../utils/emailValidation";
import { BookOpen, Mail, Lock, User, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { applyActionCode, getAuth } from "firebase/auth";

export const AuthForm: React.FC = () => {
  const { refreshProfile, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValidation, setEmailValidation] = useState<EmailValidationResult>(
    { isValid: true }
  );
  const [emailTouched, setEmailTouched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalEmailValidation = validateEmail(formData.email);
      if (!finalEmailValidation.isValid) {
        toast.error(
          finalEmailValidation.error || "Please enter a valid email address"
        );
        setLoading(false);
        return;
      }

      if (isLogin) {
        await signIn(formData.email, formData.password);
        await refreshProfile();
        toast.success("Welcome back!");
        navigate("/"); // Redirect to homepage after successful login
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        const signupResult = await signUp(
          formData.email,
          formData.password,
          formData.displayName
        );
        toast.success(
          "Account created! Please check your email and verify your address from any device."
        );
        // Navigate to email verification page with user data
        navigate("/email-verify", {
          state: {
            email: formData.email,
            displayName: formData.displayName,
          },
        });
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      await refreshProfile();
      toast.success("Signed in with Google!");
      navigate("/"); // Redirect to homepage after successful Google sign-in
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Real-time email validation
    if (name === "email") {
      const validation = validateEmailRealTime(value);
      setEmailValidation(validation);

      if (!emailTouched && value.trim()) {
        setEmailTouched(true);
      }
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (formData.email.trim()) {
      const validation = validateEmail(formData.email);
      setEmailValidation(validation);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, email: suggestion }));
    setEmailValidation({ isValid: true });
  };

  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const mode = queryParams.get("mode");
    const oobCode = queryParams.get("oobCode");

    if (mode === "verifyEmail" && oobCode) {
      navigate(`/verify-email?mode=${mode}&oobCode=${oobCode}`, {
        replace: true,
      });
    }
  }, [location.search, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#EFEDFA" }}
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome to
          </h1>
          <Link
            to="/"
            className="inline-block text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            InfoNest
          </Link>
          <p className="text-gray-600 mt-2">
            {isLogin
              ? "Where Documentation Meets Efficiency"
              : "Join the knowledge community"}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    onBlur={handleEmailBlur}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      emailTouched && !emailValidation.isValid
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                    placeholder="Enter your name"
                    required={!isLogin}
                  />
                </div>
                {emailTouched && !emailValidation.isValid && (
                  <div className="mt-2">
                    <p className="text-red-600 text-sm">
                      {emailValidation.error}
                    </p>
                    {emailValidation.suggestions &&
                      emailValidation.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-1">
                            Did you mean:
                          </p>
                          {emailValidation.suggestions.map(
                            (suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() =>
                                  handleSuggestionClick(suggestion)
                                }
                                className="inline-block bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm mr-2 transition-colors"
                              >
                                {suggestion}
                              </button>
                            )
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      formData.confirmPassword &&
                      formData.password !== formData.confirmPassword
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                    placeholder="Confirm your password"
                    required={!isLogin}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword &&
                  formData.password !== formData.confirmPassword && (
                    <p className="text-red-600 text-sm mt-1">
                      Passwords do not match
                    </p>
                  )}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (!isLogin && formData.password !== formData.confirmPassword) ||
                (emailTouched && !emailValidation.isValid)
              }
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Please wait..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          <div className="mt-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center border border-gray-300 text-gray-700 bg-white py-2 rounded-xl font-medium hover:bg-gray-50 transition-all"
              disabled={loading}
            >
              <LogIn className="h-5 w-5 mr-2" /> Continue with Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Secure knowledge management platform</p>
        </div>

        {!isLogin && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              📧 Email Verification Required
            </h4>
            <p className="text-sm text-blue-800">
              After creating your account, you'll receive a verification email.
              You can verify your email from any device - the verification will
              work across all your devices automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
