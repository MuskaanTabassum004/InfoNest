@@ .. @@
      const updateData = {
        displayName: tempDisplayName.trim(),
        updatedAt: new Date(),
      };

      console.log("🔄 Updating Firestore profile");

      await updateDoc(userRef, updateData);
      console.log("✅ Firestore update successful");

      // Refresh the profile to ensure immediate sync across all components
      await refreshProfile();
      console.log("✅ Profile refresh completed");

      setIsEditing(false);
      toast.success("Name updated successfully!");

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
                  Supports resumable uploads with automatic retry.
                  Formats: JPG, PNG, GIF, WebP (max 5MB)
                </p>

                {uploading && (