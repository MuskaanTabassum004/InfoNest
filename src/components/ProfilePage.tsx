@@ .. @@
       const updateData = {
         displayName: tempDisplayName.trim(),
         updatedAt: new Date(),
       };

-      console.log("🔄 Updating Firestore profile:", {
-        userId: userProfile.uid,
-        oldName: userProfile.displayName,
-        newName: tempDisplayName.trim(),
-        updateData,
-      });
+      console.log("🔄 Updating Firestore profile");

       await updateDoc(userRef, updateData);
-      console.log("✅ Firestore update successful");
+      console.log("✅ Firestore update successful");

       // Refresh the profile to ensure immediate sync across all components
       await refreshProfile();
-      console.log("✅ Profile refresh completed");
+      console.log("✅ Profile refresh completed");

       setIsEditing(false);
       toast.success("Name updated successfully!");