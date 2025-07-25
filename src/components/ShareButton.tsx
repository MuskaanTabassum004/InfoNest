import React, { useState } from "react";
import { Share2, Twitter, Facebook, Linkedin, Mail, Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  recordShareEvent,
  shareToTwitter,
  shareToFacebook,
  shareToLinkedIn,
  shareViaEmail,
  copyToClipboard,
} from "../lib/articles";
import { useAuth } from "../hooks/useAuth";

interface ShareButtonProps {
  articleId: string;
  articleTitle: string;
  articleUrl?: string;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  articleId,
  articleTitle,
  articleUrl,
  className = "",
  showLabel = false,
  size = "md",
}) => {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = articleUrl || `${window.location.origin}/article/${articleId}`;

  const handleShare = async (method: "copy" | "twitter" | "facebook" | "linkedin" | "email") => {
    try {
      switch (method) {
        case "copy": {
          const success = await copyToClipboard(url);
          if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Link copied to clipboard!");
          } else {
            toast.error("Failed to copy link");
          }
          break;
        }
        case "twitter":
          shareToTwitter(url, articleTitle);
          break;
        case "facebook":
          shareToFacebook(url);
          break;
        case "linkedin":
          shareToLinkedIn(url, articleTitle);
          break;
        case "email":
          shareViaEmail(url, articleTitle);
          break;
      }

      // Record share event
      await recordShareEvent(articleId, method, userProfile?.uid);
      setIsOpen(false);
    } catch (error) {
      console.error("Error sharing article:", error);
      toast.error("Failed to share article");
    }
  };

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const buttonSizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonSizeClasses[size]} text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-1 ${className}`}
        title="Share Article"
      >
        <Share2 className={sizeClasses[size]} />
        {showLabel && <span className="text-sm">Share</span>}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={() => handleShare("copy")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>

              <button
                onClick={() => handleShare("twitter")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2"
              >
                <Twitter className="h-4 w-4" />
                <span>Share on Twitter</span>
              </button>

              <button
                onClick={() => handleShare("facebook")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2"
              >
                <Facebook className="h-4 w-4" />
                <span>Share on Facebook</span>
              </button>

              <button
                onClick={() => handleShare("linkedin")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2"
              >
                <Linkedin className="h-4 w-4" />
                <span>Share on LinkedIn</span>
              </button>

              <button
                onClick={() => handleShare("email")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Mail className="h-4 w-4" />
                <span>Share via Email</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
