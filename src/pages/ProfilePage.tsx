import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateDoc, doc } from "firebase/firestore";
import { firestore } from "../lib/firebase";
import { uploadFile } from "../lib/fileUpload";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

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
  const [nameEditLoading, setNameEditLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        profilePicture: userProfile.profilePicture || "",
        bio: userProfile.bio || "",
        socialLinks: {
          twitter: userProfile.socialLinks?.twitter || "",
          linkedin: userProfile.socialLinks?.linkedin || "",
          github: userProfile.socialLinks?.github || "",
          website: userProfile.socialLinks?.website || "",
        },
      });
      setPreviewUrl(userProfile.profilePicture || "");
      setTempDisplayName(userProfile.displayName || "");
    }
  }, [userProfile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
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

      toast.success("Profile picture uploaded successfully!");
      return result.url;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to upload profile picture");
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);

    try {
      let profilePictureUrl = formData.profilePicture;

      // Upload new profile picture if selected
      if (selectedFile) {
        const uploadedUrl = await handleImageUpload();
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        }
      }

      // Update user profile in Firestore
      const userRef = doc(firestore, "users", userProfile.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        profilePicture: profilePictureUrl,
        bio: formData.bio,
        socialLinks: formData.socialLinks,
        updatedAt: new Date(),
      });

      // Refresh the profile in auth context
      await refreshProfile();

      toast.success("Profile updated successfully!");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
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

  const handleDisplayNameEdit = async () => {
    if (!userProfile) return;

    // Validate the display name
    const validationError = validateDisplayName(tempDisplayName);
    if (validationError) {
      setNameError(validationError);
      return;
    }

    setNameEditLoading(true);
    setNameError("");

    try {
      const userRef = doc(firestore, "users", userProfile.uid);
      const updateData = {
        displayName: tempDisplayName.trim(),
        updatedAt: new Date(),
      };

      console.log("🔄 Updating Firestore profile:", {
        userId: userProfile.uid,
        oldName: userProfile.displayName,
        newName: tempDisplayName.trim(),
        updateData,
      });

      await updateDoc(userRef, updateData);
      console.log("✅ Firestore update successful");

      // Refresh the profile to ensure immediate sync across all components
      await refreshProfile();
      console.log("✅ Profile refresh completed");

      setIsEditing(false);
      toast.success("Name updated successfully!");
    } catch (error) {
      console.error("❌ Error updating name:", error);
      setNameError("Failed to update name. Please try again.");
      toast.error("Failed to update name");
    } finally {
      setNameEditLoading(false);
    }
  };

  const cancelEdit = () => {
    setTempDisplayName(userProfile?.displayName || "");
    setIsEditing(false);
    setNameError("");
    setNameEditLoading(false);
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
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-blue-100 mt-1">
            Manage your account information and preferences
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Picture Section */}
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
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
                          disabled={nameEditLoading}
                          maxLength={50}
                        />
                        <button
                          type="button"
                          onClick={handleDisplayNameEdit}
                          disabled={nameEditLoading || !tempDisplayName.trim()}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {nameEditLoading ? (
                            <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={nameEditLoading}
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
                          value={userProfile?.displayName || "Not set"}
                          className="flex-1 pl-10 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed"
                          disabled
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTempDisplayName(userProfile?.displayName || "");
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
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
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
                      onChange={(e) => setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                      })}
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
                      onChange={(e) => setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                      })}
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
                      onChange={(e) => setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, github: e.target.value }
                      })}
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
                      onChange={(e) => setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, website: e.target.value }
                      })}
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
