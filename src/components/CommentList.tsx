// src/components/CommentList.tsx
import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, MessageCircle, User, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Comment, Reply, deleteComment, deleteReply, subscribeToReplies } from "../lib/comments";
import { ReplyInput } from "./CommentInput";
import toast from "react-hot-toast";

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  onCommentDeleted?: () => void;
}

interface ReplyItemProps {
  reply: Reply;
  articleId: string;
  onReplyDeleted?: () => void;
}

const ReplyItem: React.FC<ReplyItemProps> = ({ reply, articleId, onReplyDeleted }) => {
  const { userProfile, isAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = userProfile && (userProfile.uid === reply.userId || isAdmin);

  const handleDelete = async () => {
    if (!canDelete) return;

    if (window.confirm("Are you sure you want to delete this reply?")) {
      setIsDeleting(true);
      try {
        await deleteReply(articleId, reply.commentId, reply.id);
        toast.success("Reply deleted");
        onReplyDeleted?.();
      } catch (error) {
        console.error("Error deleting reply:", error);
        toast.error("Failed to delete reply");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="flex items-start space-x-3 py-3 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors duration-200">
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {reply.userProfilePicture ? (
          <img
            src={reply.userProfilePicture}
            alt={reply.userName}
            className="w-6 h-6 rounded-full object-cover border border-gray-200 hover:border-blue-300 transition-colors"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
            <User className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Reply Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-semibold text-sm text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
            {reply.userName}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {formatDistanceToNow(reply.createdAt)} ago
          </span>
        </div>
        <p className="text-sm text-gray-800 break-words leading-relaxed">{reply.content}</p>
      </div>

      {/* Delete Button */}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110"
          title="Delete reply"
        >
          {isDeleting ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
};

const CommentItem: React.FC<CommentItemProps> = ({ comment, articleId, onCommentDeleted }) => {
  const { userProfile, isAdmin } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const canDelete = userProfile && (userProfile.uid === comment.userId || isAdmin);

  // Subscribe to replies when showing them
  useEffect(() => {
    if (!showReplies) return;

    setLoadingReplies(true);
    const unsubscribe = subscribeToReplies(articleId, comment.id, (newReplies) => {
      setReplies(newReplies);
      setLoadingReplies(false);
    });

    return unsubscribe;
  }, [showReplies, articleId, comment.id]);

  const handleDelete = async () => {
    if (!canDelete) return;

    if (window.confirm("Are you sure you want to delete this comment and all its replies?")) {
      setIsDeleting(true);
      try {
        await deleteComment(articleId, comment.id);
        toast.success("Comment deleted");
        onCommentDeleted?.();
      } catch (error) {
        console.error("Error deleting comment:", error);
        toast.error("Failed to delete comment");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleReplyAdded = () => {
    setShowReplyInput(false);
    if (!showReplies) {
      setShowReplies(true);
    }
  };

  const handleToggleReplies = () => {
    setShowReplies(!showReplies);
  };

  return (
    <div className="py-4 border-b border-gray-100/60 last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/20 rounded-xl px-3 -mx-3 transition-all duration-300">
      {/* Main Comment */}
      <div className="flex items-start space-x-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {comment.userProfilePicture ? (
            <img
              src={comment.userProfilePicture}
              alt={comment.userName}
              className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 hover:border-blue-300 transition-colors shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
              <User className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
              {comment.userName}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {formatDistanceToNow(comment.createdAt)} ago
            </span>
          </div>
          <p className="text-gray-800 break-words mb-3 leading-relaxed">{comment.content}</p>

          {/* Comment Actions */}
          <div className="flex items-center space-x-4 text-sm">
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors hover:scale-105 transform"
            >
              Reply
            </button>

            {comment.replyCount > 0 && (
              <button
                onClick={handleToggleReplies}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 font-medium transition-all duration-200 hover:scale-105 transform"
              >
                <MessageCircle className="h-3 w-3" />
                <span>{comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}</span>
                {showReplies ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Delete Button */}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-110"
            title="Delete comment"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Reply Input */}
      {showReplyInput && (
        <div className="ml-11 mt-3">
          <ReplyInput
            articleId={articleId}
            commentId={comment.id}
            onReplyAdded={handleReplyAdded}
            onCancel={() => setShowReplyInput(false)}
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="ml-11 mt-3 space-y-2">
          {loadingReplies ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : replies.length > 0 ? (
            replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                articleId={articleId}
                onReplyDeleted={() => {
                  // Replies will be updated via real-time listener
                }}
              />
            ))
          ) : (
            <p className="text-sm text-gray-500 py-2">No replies yet</p>
          )}
        </div>
      )}
    </div>
  );
};

interface CommentListProps {
  comments: Comment[];
  articleId: string;
  loading?: boolean;
  onCommentDeleted?: () => void;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  articleId,
  loading = false,
  onCommentDeleted,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          articleId={articleId}
          onCommentDeleted={onCommentDeleted}
        />
      ))}
    </div>
  );
};
