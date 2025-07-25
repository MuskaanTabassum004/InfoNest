// src/components/CommentInput.tsx
import React, { useState, useRef, useEffect } from "react";
import { Send, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { createComment, createReply } from "../lib/comments";
import toast from "react-hot-toast";

interface CommentInputProps {
  articleId: string;
  onCommentAdded?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

interface ReplyInputProps {
  articleId: string;
  commentId: string;
  onReplyAdded?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  articleId,
  onCommentAdded,
  placeholder = "Add a comment...",
  autoFocus = false,
  className = "",
}) => {
  const { userProfile } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile) {
      toast.error("Please log in to comment");
      return;
    }

    if (!content.trim()) {
      return;
    }

    console.log("Submitting comment:", {
      articleId,
      userId: userProfile.uid,
      userName: userProfile.displayName || "Anonymous",
      userProfilePicture: userProfile.profilePicture,
      content: content.trim()
    });

    setIsSubmitting(true);
    try {
      await createComment(
        articleId,
        userProfile.uid,
        userProfile.displayName || "Anonymous",
        userProfile.profilePicture,
        content
      );

      setContent("");
      toast.success("Comment added!");
      onCommentAdded?.();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!userProfile) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-600 text-sm">Please log in to comment</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex items-start space-x-3 ${className}`}>
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {userProfile.profilePicture ? (
          <img
            src={userProfile.profilePicture}
            alt={userProfile.displayName || "User"}
            className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 hover:border-blue-300 transition-colors"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSubmitting}
          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm bg-gray-50/50 hover:bg-white transition-all duration-200 shadow-sm"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />

        {/* Submit Button */}
        {content.trim() && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </form>
  );
};

export const ReplyInput: React.FC<ReplyInputProps> = ({
  articleId,
  commentId,
  onReplyAdded,
  onCancel,
  placeholder = "Write a reply...",
  autoFocus = true,
  className = "",
}) => {
  const { userProfile } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) {
      toast.error("Please log in to reply");
      return;
    }

    if (!content.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createReply(
        articleId,
        commentId,
        userProfile.uid,
        userProfile.displayName || "Anonymous",
        userProfile.profilePicture,
        content
      );
      
      setContent("");
      toast.success("Reply added!");
      onReplyAdded?.();
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      onCancel?.();
    }
  };

  if (!userProfile) {
    return null;
  }

  return (
    <div className={`mt-3 ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {userProfile.profilePicture ? (
            <img
              src={userProfile.profilePicture}
              alt={userProfile.displayName || "User"}
              className="w-6 h-6 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style={{ minHeight: "36px", maxHeight: "120px" }}
          />
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Replying..." : "Reply"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
