import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { updateUserProfile, uploadProfilePicture, UserProfile } from '../lib/profile';
import { 
  User, 
  Mail, 
  Shield, 
  Camera, 
  Save, 
  ArrowLeft,
  Calendar,
  Clock,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { userProfile, refreshProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        email: userProfile.email || ''
      });
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    try {
      await updateUserProfile(userProfile.uid, {
        displayName: formData.displayName.trim()
      });
      
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    setUploading(true);
    try {
      await uploadProfilePicture(userProfile.uid, file);
      await refreshProfile();
      toast.success('Profile picture updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Error uploading profile picture');
    } finally {
      setUploading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'infowriter':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    return <Shield className="h-4 w-4" />;
  };

  if (authLoading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#EFEDFA' }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Profile</h2>
          <p className="text-gray-600">Please wait while we load your profile information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEDFA' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/home"
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Profile
              </h1>
              <p className="text-gray-600">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Picture & Basic Info */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
              <div className="text-center">
                {/* Profile Picture */}
                <div className="relative inline-block mb-6">
                  {userProfile.profilePicture ? (
                    <img
                      src={userProfile.profilePicture}
                      alt={userProfile.displayName || 'Profile'}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                      <User className="h-16 w-16 text-white" />
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {userProfile.displayName || 'User'}
                </h2>
                
                <div className="flex items-center justify-center mb-4">
                  <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(userProfile.role)}`}>
                    {getRoleIcon(userProfile.role)}
                    <span className="capitalize">{userProfile.role}</span>
                  </span>
                </div>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{userProfile.email}</span>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDistanceToNow(userProfile.createdAt)} ago</span>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Last active {formatDistanceToNow(userProfile.lastActive || userProfile.updatedAt)} ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Profile</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your display name"
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      readOnly
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Email address cannot be changed
                  </p>
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                      readOnly
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Role is managed by administrators
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Account Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Created
                  </label>
                  <p className="text-gray-900">
                    {userProfile.createdAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {userProfile.updatedAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Verified
                  </label>
                  <div className="flex items-center space-x-2">
                    {userProfile.emailVerified ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 text-sm">Verified</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-700 text-sm">Not Verified</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 text-sm">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};