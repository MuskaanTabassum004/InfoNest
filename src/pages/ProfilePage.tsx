import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateDoc, doc, onSnapshot } from "firebase/firestore";
import { firestore } from "../lib/firebase";
import {
  uploadFile,
  deleteFile,
  extractFilePathFromUrl,
} from "../lib/fileUpload";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Camera,
  Save,
  Loader2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Twitter,
  Linkedin,
  Github,
  Globe,
  MessageSquare,
  ArrowLeft,
  Home,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface ProfileFormData {
  displayName: string;
  profilePicture?: string;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}

export const ProfilePage: React.FC = () => {
  const { userProfile, refreshProfile, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: "",
    profilePicture: "",
    bio: "",
    socialLinks: {
      twitter: "",
      linkedin: "",
      github: "",
      website: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState("");

  const [nameError, setNameError] = useState("");
  const [realtimeUpdateReceived, setRealtimeUpdateReceived] = useState(false);

  // Initialize form data when user profile loads and set up real-time listener
  useEffect(() => {
    if (!userProfile) return;

    // Set initial form data
    const updateFormData = (profile: typeof userProfile) => {
      setFormData({
        displayName: profile.displayName || "",
        profilePicture: profile.profilePicture || "",
        bio: profile.bio || "",
        socialLinks: {
          twitter: profile.socialLinks?.twitter || "",
          linkedin: profile.socialLinks?.linkedin || "",
          github: profile.socialLinks?.github || "",
          website: profile.socialLinks?.website || "",
        },
      });
      setPreviewUrl(profile.profilePicture || "");
      setTempDisplayName(profile.displayName || "");
    };

    updateFormData(userProfile);

    // Set up real-time listener for profile changes
    const userRef = doc(firestore, "users", userProfile.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const updatedProfile = {
          ...userProfile,
          displayName: data.displayName || "",
          profilePicture: data.profilePicture || "",
          bio: data.bio || "",
          socialLinks: data.socialLinks || {},
          updatedAt: data.updatedAt?.toDate(),
        };

        // Show real-time update indicator
        setRealtimeUpdateReceived(true);
        setTimeout(() => setRealtimeUpdateReceived(false), 2000);

        // Only update form if user is not currently editing to avoid overwriting their changes
        if (!isEditing && !loading) {
          updateFormData(updatedProfile);
          console.log("📡 Real-time profile update received and applied");
        } else {
          console.log(
            "📡 Real-time profile update received but not applied (user is editing)"
          );
        }
      }
    });

    return () => unsubscribe();
  }, [userProfile?.uid]); // Only depend on uid to avoid unnecessary re-subscriptions

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!selectedFile || !userProfile) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFile(
        selectedFile,
        userProfile.uid,
        "profiles",
        (progress) => setUploadProgress(progress)
      );

      return result.url;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      return;
    }

    // Validate required fields
    if (!formData.displayName.trim()) {
      return;
    }

    setLoading(true);

    try {
      let profilePictureUrl = formData.profilePicture;
      const oldProfilePictureUrl = userProfile.profilePicture;

      // Upload new profile picture if selected
      if (selectedFile) {
        const uploadedUrl = await handleImageUpload();
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        } else {
          // If upload failed, don't proceed with profile update
          setLoading(false);
          return;
        }
      }

      console.log("🔄 Updating profile:", {
        userId: userProfile.uid,
        displayName: formData.displayName,
        bio: formData.bio,
        socialLinks: formData.socialLinks,
      });

      // Update user profile in Firestore
      const userRef = doc(firestore, "users", userProfile.uid);
      const updateData = {
        displayName: formData.displayName.trim(),
        profilePicture: profilePictureUrl,
        bio: formData.bio?.trim() || "",
        socialLinks: formData.socialLinks,
        updatedAt: new Date(),
      };

      await updateDoc(userRef, updateData);
      console.log("✅ Profile updated successfully in Firestore");

      // Refresh the profile in auth context to ensure immediate sync
      await refreshProfile();
      console.log("✅ Profile refresh completed");

      // Clean up old profile picture if a new one was uploaded
      if (
        selectedFile &&
        oldProfilePictureUrl &&
        oldProfilePictureUrl !== profilePictureUrl
      ) {
        try {
          // Extract file path from old URL and delete it
          const oldFilePath = extractFilePathFromUrl(oldProfilePictureUrl);
          if (oldFilePath && oldFilePath.startsWith("profiles/")) {
            await deleteFile(oldFilePath);
            console.log("✅ Deleted old profile picture:", oldFilePath);
          }
        } catch (error) {
          console.error("⚠️ Failed to delete old profile picture:", error);
          // Don't throw error - profile update was successful
        }
      }

      // Update form data to reflect the new profile picture URL
      setFormData((prev) => ({
        ...prev,
        profilePicture: profilePictureUrl,
      }));

      setSelectedFile(null);
      setPreviewUrl("");
    } catch (error: any) {
      console.error("❌ Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateDisplayName = (name: string): string => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return "Display name cannot be empty";
    }

    if (trimmedName.length < 2) {
      return "Display name must be at least 2 characters long";
    }

    if (trimmedName.length > 50) {
      return "Display name cannot exceed 50 characters";
    }

    // Check for valid characters (letters, numbers, spaces, basic punctuation)
    const validNameRegex = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validNameRegex.test(trimmedName)) {
      return "Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods";
    }

    return "";
  };

  const handleDisplayNameEdit = () => {
    if (!userProfile) {
      setNameError("User not authenticated");
      return;
    }

    // Validate the display name
    const validationError = validateDisplayName(tempDisplayName);
    if (validationError) {
      setNameError(validationError);
      return;
    }

    // Update local form data only - don't save to Firestore yet
    setFormData((prev) => ({
      ...prev,
      displayName: tempDisplayName.trim(),
    }));

    setNameError("");
    setIsEditing(false);
    console.log(
      "✅ Display name updated locally, will save when 'Save Changes' is clicked"
    );
  };

  const cancelEdit = () => {
    setTempDisplayName(formData.displayName || "");
    setIsEditing(false);
    setNameError("");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "infowriter":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Profile not found
        </h2>
        <p className="text-gray-600">
          Unable to load your profile information.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Navigation Bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Homepage</span>
        </Link>
        <Link
          to="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors group"
        >
          <Home className="h-5 w-5" />
          <span className="font-medium">Home</span>
        </Link>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1D4ED8] via-[#7C3AED] to-[#EC4899] px-8 py-6">
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-blue-100 mt-1">
            Manage your account information and preferences
          </p>
        </div>

        <div className="p-8">
          {/* Real-time Update Indicator */}
          {realtimeUpdateReceived && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-green-700 text-sm font-medium">
                Profile updated in real-time
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Picture Section */}
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                    {previewUrl || userProfile?.profilePicture ? (
                      <img
                        src={previewUrl || userProfile?.profilePicture || ""}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
                        <User className="h-10 w-10 text-white" />
                      </div>
                    )}
                  </div>

                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Profile Picture
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Upload a profile picture to personalize your account.
                  Supported formats: JPG, PNG, GIF, WebP (max 5MB)
                </p>

                {uploading && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading... {uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={tempDisplayName}
                          onChange={(e) => {
                            setTempDisplayName(e.target.value);
                            // Clear error when user starts typing
                            if (nameError) setNameError("");
                          }}
                          className={`flex-1 pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all ${
                            nameError
                              ? "border-red-300 focus:ring-red-500 bg-red-50"
                              : "border-blue-300 focus:ring-blue-500"
                          }`}
                          placeholder="Enter your display name"
                          autoFocus
                          disabled={false}
                          maxLength={50}
                        />
                        <button
                          type="button"
                          onClick={handleDisplayNameEdit}
                          disabled={!tempDisplayName.trim()}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={false}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {nameError && (
                        <p className="text-red-600 text-sm pl-10 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {nameError}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 pl-10">
                        {tempDisplayName.length}/50 characters
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={formData.displayName || "Not set"}
                          className="flex-1 pl-10 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed"
                          disabled
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTempDisplayName(formData.displayName || "");
                            setIsEditing(true);
                          }}
                          className="absolute right-3 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Click to edit your display name"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 pl-10">
                        💡 Click the edit icon to change your display name.
                        Changes will update across the entire application in
                        real-time.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={userProfile.email}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <div className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                        userProfile.role
                      )}`}
                    >
                      {userProfile.role.charAt(0).toUpperCase() +
                        userProfile.role.slice(1)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Role is managed by administrators
                </p>
              </div>
            </div>

            {/* Bio Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Tell others about yourself..."
                  rows={3}
                  maxLength={100}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.bio?.length || 0}/100 characters
              </p>
            </div>

            {/* Social Links Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Social Links
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Twitter
                  </label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={formData.socialLinks?.twitter || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialLinks: {
                            ...formData.socialLinks,
                            twitter: e.target.value,
                          },
                        })
                      }
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    LinkedIn
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={formData.socialLinks?.linkedin || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialLinks: {
                            ...formData.socialLinks,
                            linkedin: e.target.value,
                          },
                        })
                      }
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    GitHub
                  </label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={formData.socialLinks?.github || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialLinks: {
                            ...formData.socialLinks,
                            github: e.target.value,
                          },
                        })
                      }
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={formData.socialLinks?.website || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialLinks: {
                            ...formData.socialLinks,
                            website: e.target.value,
                          },
                        })
                      }
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Add your social media profiles and website (optional)
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
