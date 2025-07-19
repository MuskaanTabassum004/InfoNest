@@ .. @@
      const updateData = {
        displayName: tempDisplayName.trim(),
        updatedAt: new Date(),
      };

      await refreshProfile();
      console.log("✅ Profile refresh completed");
      setIsEditing(false);
      toast.success("Name updated successfully!");

                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
      console.error("Error updating name:", error);
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
                )
                }