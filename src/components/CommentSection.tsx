// src/components/CommentSection.tsx
import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { Comment, subscribeToComments } from "../lib/comments";
import { CommentInput } from "./CommentInput";
import { CommentList } from "./CommentList";

interface CommentSectionProps {
  articleId: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  articleId,
  isOpen,
  onToggle,
  className = "",
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Subscribe to comments in real-time
  useEffect(() => {
    if (!articleId) return;

    console.log("Subscribing to comments for article:", articleId);
    setLoading(true);
    const unsubscribe = subscribeToComments(articleId, (newComments) => {
      console.log("Received comments:", newComments);
      setComments(newComments);
      setCommentCount(newComments.length);
      setLoading(false);
    });

    return unsubscribe;
  }, [articleId]);

  // Smooth scroll to comment section when opened
  useEffect(() => {
    if (isOpen && sectionRef.current) {
      const element = sectionRef.current;
      const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementTop - 100; // 100px offset from top

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, [isOpen]);

  const handleCommentAdded = () => {
    // Comments will be updated via real-time listener
    // No need to manually refresh
  };

  const handleCommentDeleted = () => {
    // Comments will be updated via real-time listener
    // No need to manually refresh
  };

  return (
    <div
      ref={sectionRef}
      className={`transition-all duration-500 ease-out transform ${
        isOpen
          ? "opacity-100 max-h-screen translate-y-0 scale-100"
          : "opacity-0 max-h-0 overflow-hidden translate-y-4 scale-95"
      } ${className}`}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg shadow-gray-200/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100/80 bg-gradient-to-r from-blue-50/30 to-purple-50/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Comments
              {commentCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({commentCount})
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onToggle}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition-all duration-200 hover:scale-105"
            title="Close comments"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comment Input */}
        <div className="p-6 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/30 to-blue-50/20">
          <CommentInput
            articleId={articleId}
            onCommentAdded={handleCommentAdded}
            placeholder="Add a comment..."
          />
        </div>

        {/* Comments List */}
        <div className="p-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <CommentList
            comments={comments}
            articleId={articleId}
            loading={loading}
            onCommentDeleted={handleCommentDeleted}
          />
        </div>
      </div>
    </div>
  );
};

// Compact comment button component for article actions
interface CommentButtonProps {
  commentCount: number;
  onClick: () => void;
  className?: string;
}

export const CommentButton: React.FC<CommentButtonProps> = ({
  commentCount,
  onClick,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105 ${className}`}
      data-comment-button
    >
      <MessageCircle className="h-4 w-4 group-hover:animate-pulse" />
      <span className="text-sm font-medium">
        {commentCount > 0 ? `${commentCount} Comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
      </span>
    </button>
  );
};

// Hook for managing comment section state
export const useCommentSection = (articleId: string) => {
  const [isOpen, setIsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Subscribe to comments to get count
  useEffect(() => {
    if (!articleId) return;

    const unsubscribe = subscribeToComments(articleId, (comments) => {
      setCommentCount(comments.length);
    });

    return unsubscribe;
  }, [articleId]);

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  const open = () => {
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  // Close when clicking outside (if needed)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('[data-comment-section]')) {
        // Only close if clicking outside and not on comment-related elements
        if (!target.closest('button[data-comment-button]')) {
          close();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return {
    isOpen,
    commentCount,
    toggle,
    open,
    close,
  };
};
