import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { doc, updateDoc, increment, onSnapshot } from "firebase/firestore";
import { firestore } from "../lib/firebase";
import toast from "react-hot-toast";

interface LikeButtonProps {
  articleId: string;
  articleStatus?: string;
  articleAuthorId?: string;
  initialLikes?: number;
  initialLikedBy?: string[];
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  articleId,
  articleStatus,
  articleAuthorId,
  initialLikes = 0,
  initialLikedBy = [],
  size = "md",
  showLabel = true,
  className = "",
}) => {
  const { userProfile } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [currentLikedBy, setCurrentLikedBy] = useState<string[]>(initialLikedBy);

  // Initialize like state based on Firestore data
  useEffect(() => {
    setLikeCount(initialLikes);
    setCurrentLikedBy(initialLikedBy);
    if (userProfile?.uid) {
      setIsLiked(initialLikedBy.includes(userProfile.uid));
    } else {
      setIsLiked(false);
    }
  }, [initialLikes, initialLikedBy, userProfile?.uid]);

  // Real-time listener for like updates - ensures persistent state across sessions
  useEffect(() => {
    if (!articleId) return;

    // Check if user has permission to read this article based on Firestore rules
    const hasReadPermission = () => {
      if (!userProfile) return false;
      
      // Published articles can be read by anyone (including unauthenticated users)
      if (articleStatus === 'published') return true;
      
      // Authors can read their own articles (any status)
      if (userProfile.uid === articleAuthorId) return true;
      
      // Admins can read all articles (any status)
      if (userProfile.role === 'admin') return true;
      
      return false;
    };

    // Only set up listener if user has read permission
    if (!hasReadPermission()) {
      // For articles without read permission, just use the initial values
      setLikeCount(initialLikes);
      setCurrentLikedBy(initialLikedBy);
      if (userProfile?.uid) {
        setIsLiked(initialLikedBy.includes(userProfile.uid));
      }
      return;
    }

    const articleRef = doc(firestore, "articles", articleId);
    const unsubscribe = onSnapshot(
      articleRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const newLikeCount = data.likes || 0;
          const newLikedBy = data.likedBy || [];

          setLikeCount(newLikeCount);
          setCurrentLikedBy(newLikedBy);

          // Determine like state based on current user's presence in likedBy array
          if (userProfile?.uid) {
            setIsLiked(newLikedBy.includes(userProfile.uid));
          } else {
            setIsLiked(false);
          }
        }
      },
      (error) => {
        // Handle permission errors silently
        if (error.code === "permission-denied") {
          // Silently handle permission denied errors
          return;
        }
        console.error("Error listening to article updates:", error);
      }
    );

    return () => unsubscribe();
  }, [articleId, userProfile?.uid, userProfile?.role, articleStatus, articleAuthorId, initialLikes, initialLikedBy]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if button is inside a Link
    e.stopPropagation(); // Prevent event bubbling

    if (!userProfile) {
      toast.error("Please log in to like articles");
      return;
    }

    if (likingInProgress) return;

    setLikingInProgress(true);
    try {
      const articleRef = doc(firestore, "articles", articleId);
      const userId = userProfile.uid;

      if (isLiked) {
        // Unlike: remove user from likedBy array and decrement likes
        await updateDoc(articleRef, {
          likes: increment(-1),
          likedBy: currentLikedBy.filter(id => id !== userId)
        });
      } else {
        // Like: add user to likedBy array and increment likes
        await updateDoc(articleRef, {
          likes: increment(1),
          likedBy: [...currentLikedBy, userId]
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like. Please try again.");
    } finally {
      setLikingInProgress(false);
    }
  };

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const buttonSizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <button
      onClick={handleLikeToggle}
      disabled={likingInProgress}
      className={`${buttonSizeClasses[size]} ${
        isLiked 
          ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
      } rounded-lg transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={isLiked ? "Unlike article" : "Like article"}
    >
      {likingInProgress ? (
        <div
          className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
        />
      ) : (
        <Heart 
          className={`${sizeClasses[size]} ${isLiked ? 'fill-current' : ''}`} 
        />
      )}
      {showLabel && (
        <span className={textSizeClasses[size]}>{likeCount}</span>
      )}
    </button>
  );
};
