// src/pages/ArticleEditor.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import { DraftRecovery } from "../components/DraftRecovery"; // Import DraftRecovery
import { draftStorage } from "../utils/draftStorage"; // Import draftStorage
import {
  createArticle,
  updateArticle,
  getArticle,
  Article,
} from "../lib/articles";
import { RichTextEditor } from "../components/RichTextEditor";
import { FileUpload } from "../components/FileUpload";

import { UploadManager } from "../components/UploadManager";
import { resumableUploadManager } from "../lib/resumableUpload";
import { deleteFile, extractFilePathFromUrl } from "../lib/fileUpload";
import {
  Save,
  Eye,
  ArrowLeft,
  Trash2,
  Send,
  Upload,
  Image as ImageIcon,
  X,
  Plus,
  Tag,
  Folder,
  EyeOff,
  FileText,
  Paperclip,
  AlertCircle,
} from "lucide-react";
import { UploadResult } from "../lib/fileUpload";
import toast from "react-hot-toast";
import { processLayoutSpecificCaptions } from "../lib/tiptap/utils/captionProcessor";
import { stripHtmlTags } from "../utils/searchUtils";

// Helper function to extract original filename from storage URL
const extractOriginalFilename = (url: string): string => {
  try {
    // Decode URL first to handle encoded characters
    const decodedUrl = decodeURIComponent(url);

    // Extract filename from URL (last part after /)
    const filename = decodedUrl.split("/").pop() || "";

    // Remove query parameters if any
    const cleanFilename = filename.split("?")[0];

    // Remove temp prefix if present
    let processedName = cleanFilename.replace(/^temp_/, "");

    // Split by underscore to find timestamp
    const parts = processedName.split("_");

    if (parts.length >= 2) {
      // Last part should be timestamp with extension (e.g., "1754137025165.pdf")
      const lastPart = parts[parts.length - 1];

      // Check if last part looks like timestamp with extension
      const timestampPattern = /^\d{13,}\.[\w]+$/; // 13+ digits followed by extension

      if (timestampPattern.test(lastPart)) {
        // Remove timestamp, keep original name parts
        const originalParts = parts.slice(0, -1);
        let originalName = originalParts.join("_");

        // Get extension from timestamp part
        const extension = lastPart.split(".").pop();

        // Restore spaces and special characters for better readability
        originalName = originalName
          .replace(/_/g, " ") // Convert underscores back to spaces
          .replace(/\s+/g, " ") // Normalize multiple spaces
          .trim();

        // Add extension back
        return `${originalName}.${extension}`;
      }
    }

    // Fallback: clean up the filename for display
    return processedName
      .replace(/_/g, " ") // Convert underscores to spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim() || "Download";

  } catch (error) {
    console.error("Error extracting filename:", error);
    return "Download";
  }
};

// ArticleEditor component - File Manager removed for cleaner interface
export const ArticleEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, isInfoWriter, isAdmin } = useAuth();
  const isEditing = id !== "new";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [article, setArticle] = useState<Partial<Article>>({
    title: "",
    content: "",
    excerpt: "",
    status: "draft",
    categories: [],
    tags: [],
    coverImage: "",
    attachments: [],
  });

  // Draft recovery state
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);

  // Editor key for forcing re-render when resetting
  const [editorKey, setEditorKey] = useState(0);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string>("");
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Enhanced form state
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [coverImageMethod, setCoverImageMethod] = useState<"upload" | "url">(
    "upload"
  );
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [showUploadManager, setShowUploadManager] = useState(false);
  const [hasActiveUploads, setHasActiveUploads] = useState(false);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
  });
  // Available categories (you may want to fetch these from a backend)
  const availableCategories = [
    "Technology",
    "Programming",
    "Web Development",
    "Mobile Development",
    "Data Science",
    "AI & Machine Learning",
    "DevOps",
    "Cybersecurity",
    "UI/UX Design",
    "Business",
    "Tutorials",
    "News & Updates",
    "Other",
  ];

  // Check for available drafts on component mount
  useEffect(() => {
    const checkForDrafts = () => {
      const drafts = draftStorage.getAllDrafts();
      const hasRecoverableDrafts = drafts.some((draft) => {
        const isNotCurrent = !id || draft.id !== id;
        const hasContent = draft.content.trim().length > 50;
        const isRecent =
          Date.now() - draft.lastModified.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
        return isNotCurrent && hasContent && isRecent;
      });

      if (hasRecoverableDrafts && !isEditing) {
        setShowDraftRecovery(true);
      }
    };

    // Only check for drafts when creating a new article
    if (!isEditing) {
      setTimeout(checkForDrafts, 1000); // Delay to avoid showing during initial load
    }
  }, [isEditing, id]);

  // Track unsaved changes
  useEffect(() => {
    if (!userProfile) return;

    const currentData = JSON.stringify({
      title: article.title || "",
      content: article.content || "",
      excerpt: article.excerpt || "",
      categories: article.categories || [],
      tags: article.tags || [],
      coverImage: article.coverImage || "",
    });

    // Check if data has changed from last saved state
    const hasChanges =
      currentData !== lastSavedData &&
      (article.title?.trim() || article.content?.trim());
    setHasUnsavedChanges(hasChanges);
  }, [article, lastSavedData, userProfile]);

  // Save draft to localStorage whenever article data changes
  useEffect(() => {
    if (!userProfile || (!article.title && !article.content)) return;

    const draftData = {
      title: article.title || "",
      content: article.content || "",
      excerpt: article.excerpt || "",
      categories: article.categories || [],
      tags: article.tags || [],
      coverImage: article.coverImage || "",
    };

    // Only save if there's meaningful content
    if (draftData.title.trim() || draftData.content.trim()) {
      draftStorage.saveDraft(id === "new" ? null : id, draftData);
    }
  }, [article, userProfile, id]);

  // Browser navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle navigation attempts when there are unsaved changes or active uploads
  const handleNavigation = async (path?: string) => {
    // Check for active uploads first
    if (hasActiveUploads) {
      toast.error("Please wait for all file uploads to complete before leaving this page.");
      return false;
    }

    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return false;
    }

    // Clean up temp files if leaving without saving
    if (id === "new" && userProfile) {
      try {
        await resumableUploadManager.cleanupTempFiles(userProfile.uid);
        console.log("🧹 Cleaned up temp files on navigation");
      } catch (error) {
        console.error("Error cleaning up temp files:", error);
      }
    }

    if (path) {
      navigate(path);
    } else {
      navigate(-1);
    }
    return true;
  };



  // Handle draft recovery
  const handleDraftRecover = (draft: any) => {
    setArticle({
      title: draft.title || "",
      content: draft.content || "",
      excerpt: draft.excerpt || "",
      status: "draft",
      categories: draft.categories || [],
      tags: draft.tags || [],
      coverImage: draft.coverImage || "",
      attachments: [],
    });

    // Set form state
    setSelectedCategory(draft.categories?.[0] || "");
    setShowDraftRecovery(false);

    toast.success("Draft recovered successfully!");
  };

  // Helper functions for enhanced features
  const addTag = () => {
    if (tagInput.trim() && article.tags && article.tags.length < 4) {
      const newTag = tagInput.trim();
      if (!article.tags.includes(newTag)) {
        setArticle((prev) => ({
          ...prev,
          tags: [...(prev.tags || []), newTag],
        }));
      }
      setTagInput("");
    } else if (article.tags && article.tags.length >= 4) {
      toast.error("Maximum 4 tags allowed");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setArticle((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setArticle((prev) => ({
      ...prev,
      categories: category === "Other" ? [] : category ? [category] : [], // If "Other", wait for input
    }));
    if (category !== "Other") {
      setCustomCategory(""); // reset custom input if not "Other"
    }
  };

  const handleCoverImageUpload = async (result: UploadResult) => {
    setArticle((prev) => ({
      ...prev,
      coverImage: result.url,
    }));
    setCoverImageUploading(false);
    toast.success("Cover image uploaded successfully");

    // The resumable upload manager will handle old file cleanup automatically
  };

  // Monitor active uploads to show manager and track completion
  useEffect(() => {
    const interval = setInterval(() => {
      const activeUploads = resumableUploadManager.getActiveUploads();
      const hasActive = activeUploads.length > 0;

      setHasActiveUploads(hasActive);

      if (hasActive && !showUploadManager) {
        setShowUploadManager(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showUploadManager]);

  // Handle cross-page upload completion
  useEffect(() => {
    const handleCoverUploadCompleted = (event: CustomEvent) => {
      const { url, context } = event.detail;
      if (context?.type === "cover" && context?.articleId === id) {
        setArticle((prev) => ({
          ...prev,
          coverImage: url,
        }));
        toast.success("Cover image uploaded successfully");
      }
    };

    // Check for completed uploads on page load
    const checkCompletedUploads = () => {
      const completedCoverUpload = localStorage.getItem(
        "completed_cover_upload"
      );
      if (completedCoverUpload) {
        try {
          const data = JSON.parse(completedCoverUpload);
          if (
            data.context?.articleId === id &&
            Date.now() - data.timestamp < 300000
          ) {
            // 5 minutes
            setArticle((prev) => ({
              ...prev,
              coverImage: data.url,
            }));
            toast.success("Cover image uploaded successfully");
            localStorage.removeItem("completed_cover_upload");
          }
        } catch (error) {
          console.error("Error processing completed cover upload:", error);
        }
      }
    };

    // Check on component mount
    checkCompletedUploads();

    // Listen for real-time completion events
    window.addEventListener(
      "coverUploadCompleted",
      handleCoverUploadCompleted as EventListener
    );

    return () => {
      window.removeEventListener(
        "coverUploadCompleted",
        handleCoverUploadCompleted as EventListener
      );
    };
  }, [id]);

  const handleCoverImageUrl = () => {
    const url = coverImageUrl.trim();

    if (!url) {
      toast.error("Please enter an image URL");
      return;
    }

    // Validate URL format
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        toast.error("Please enter a valid HTTP or HTTPS URL");
        return;
      }
    } catch (error) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Allow any valid URL - let the browser handle image validation
    // The image will show an error if it's not a valid image

    setArticle((prev) => ({
      ...prev,
      coverImage: url,
    }));
    setCoverImageUrl("");
    toast.success("Cover image URL added successfully");
  };

  const removeCoverImage = async () => {
    const oldCoverImage = article.coverImage;

    setArticle((prev) => ({
      ...prev,
      coverImage: "",
    }));
    setCoverImageUrl("");

    // Clean up the removed cover image
    if (oldCoverImage) {
      try {
        const oldFilePath = extractFilePathFromUrl(oldCoverImage);
        if (oldFilePath && oldFilePath.startsWith("articles/")) {
          await deleteFile(oldFilePath);
          console.log("✅ Deleted removed cover image:", oldFilePath);
        }
      } catch (error) {
        console.error("⚠️ Failed to delete removed cover image:", error);
        // Don't throw error - cover image removal was successful
      }
    }
  };

  const handleAttachmentUpload = (result: UploadResult) => {
    setArticle((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), result.url],
    }));
    toast.success("File attached successfully");
  };

  // Handle file uploads for newly created articles
  const handleFileUploadsForNewArticle = async (
    articleId: string,
    articleData: any
  ) => {
    if (!userProfile) return;

    try {
      // Move temp files to organized structure
      await resumableUploadManager.updatePendingUploadsWithArticleId(articleId);

      // Clean up any unused files
      await resumableUploadManager.cleanupUnusedFiles(
        userProfile.uid,
        articleId,
        articleData.content || "",
        articleData.coverImage,
        articleData.attachments
      );

      console.log(`✅ File organization completed for article: ${articleId}`);
    } catch (error) {
      console.error("Error handling file uploads for new article:", error);
      // Don't throw error - article was created successfully, file uploads are secondary
    }
  };

  // Legacy functions for compatibility (can be removed if not needed)
  const addCategory = () => {
    // This is now handled by handleCategoryChange
  };

  const removeCategory = (category: string) => {
    // This is now handled by handleCategoryChange("")
  };

  useEffect(() => {
    // Wait for user profile to load before checking permissions
    if (!userProfile) return;

    // Check if user can create articles (both infowriters and admins can create articles)
    if (!isInfoWriter && !isAdmin) {
      toast.error(
        "You need InfoWriter or Admin privileges to create or edit articles"
      );
      navigate("/dashboard");
      return;
    }

    if (isEditing && id) {
      loadArticle(id);
    }
  }, [id, isEditing, isInfoWriter, isAdmin, navigate, userProfile]);

  const loadArticle = async (articleId: string) => {
    setLoading(true);
    try {
      const loadedArticle = await getArticle(articleId);
      if (loadedArticle) {
        // Check if user owns this article (admins can only edit their own articles now)
        if (loadedArticle.authorId !== userProfile?.uid) {
          toast.error("You can only edit your own articles");
          navigate("/my-articles");
          return;
        }

        // Prevent editing archived articles
        if (loadedArticle.status === "archive") {
          toast.error("Archived articles cannot be edited");
          navigate("/my-articles");
          return;
        }
        setArticle(loadedArticle);
        // Set form state from loaded article
        setSelectedCategory(loadedArticle.categories?.[0] || "");
      } else {
        toast.error("Article not found");
        navigate("/my-articles");
      }
    } catch (error) {
      toast.error("Error loading article");
      navigate("/my-articles");
    } finally {
      setLoading(false);
    }
  };

  const generateExcerpt = (content: string): string => {
    const plainText = stripHtmlTags(content);
    const words = plainText.split(/\s+/).filter((word) => word.length > 0); // Split by whitespace and filter empty strings

    const MAX_WORDS = 70; // Set the maximum word limit

    if (words.length <= MAX_WORDS) {
      // If content is 70 words or less, use all of it
      return words.join(" ");
    } else {
      // If content is more than 70 words, take the first 70 words and add "..."
      return words.slice(0, MAX_WORDS).join(" ") + "...";
    }
  };

  // Clean up draft when article is successfully saved/published
  const cleanupDraft = () => {
    if (id && id !== "new") {
      draftStorage.deleteDraft(id);
    }
  };

  // Comprehensive form reset function
  const resetAllFields = () => {
    // Reset article state
    setArticle({
      title: "",
      content: "",
      excerpt: "",
      status: "draft",
      categories: [],
      tags: [],
      coverImage: "",
      attachments: [],
    });

    // Reset all form states
    setSelectedCategory("");
    setCustomCategory("");
    setTagInput("");
    setCoverImageUrl("");

    // Force re-render of RichTextEditor by changing key
    setEditorKey((prev) => prev + 1);

    // Clear any field errors
    setFieldErrors({
      title: "",
      content: "",
      category: "",
      tags: "",
    });

    // Reset unsaved changes tracking
    setLastSavedData("");
    setHasUnsavedChanges(false);
  };

  const handleSave = async (status: "draft" | "published" = "draft") => {
    if (!userProfile) {
      toast.error("User authentication error. Please refresh and try again.");
      return;
    }

    // Check for active uploads
    if (hasActiveUploads) {
      toast.error("Please wait for all file uploads to complete before saving.");
      return;
    }

    // Validate required fields
    if (!article.title?.trim()) {
      toast.error("Article title is required");
      return;
    }

    // Reset field errors
    setFieldErrors({
      title: "",
      content: "",
      category: "",
      tags: "",
    });

    // Validate required fields individually
    const newFieldErrors = {
      title: "",
      content: "",
      category: "",
      tags: "",
    };

    let hasErrors = false;

    if (!article.title?.trim()) {
      newFieldErrors.title = "This field is required";
      hasErrors = true;
    }
    if (!article.content?.trim()) {
      newFieldErrors.content = "This field is required";
      hasErrors = true;
    }
    if (!selectedCategory) {
      newFieldErrors.category = "Please select a category";
      hasErrors = true;
    } else if (selectedCategory === "Other" && !customCategory.trim()) {
      newFieldErrors.category = "Please enter your custom category";
      hasErrors = true;
    }
    if (!article.tags || article.tags.length === 0) {
      newFieldErrors.tags = "At least one tag is required";
      hasErrors = true;
    }

    if (hasErrors) {
      setFieldErrors(newFieldErrors);
      toast.error("Please fill in all required fields");
      return;
    }

    // Additional validation for admin users
    if (!userProfile.uid) {
      toast.error("User authentication error. Please refresh and try again.");
      return;
    }

    if (!userProfile.displayName && !userProfile.email) {
      toast.error("User profile incomplete. Please update your profile.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const articleData = {
        ...article,
        status,
        excerpt: article.excerpt || generateExcerpt(article.content),
        authorId: userProfile.uid,
        authorName: userProfile.displayName || userProfile.email,
        publishedAt: status === "published" && !article.publishedAt ? now : article.publishedAt,
        updatedAt: now, // Always update the updatedAt when saving
      };

      if (isEditing && id) {
        await updateArticle(id, articleData);

        // Clean up unused files after update
        if (userProfile) {
          try {
            await resumableUploadManager.cleanupUnusedFiles(
              userProfile.uid,
              id,
              articleData.content || "",
              articleData.coverImage,
              articleData.attachments
            );
            console.log("🧹 Cleaned up unused files after article update");
          } catch (error) {
            console.error("Error cleaning up unused files:", error);
          }
        }

        toast.success(
          `Article ${
            status === "published"
              ? "published"
              : status === "archive"
              ? "archived"
              : "saved"
          } successfully`
        );

        // Update last saved data to track changes
        setLastSavedData(
          JSON.stringify({
            title: articleData.title || "",
            content: articleData.content || "",
            excerpt: articleData.excerpt || "",
            categories: articleData.categories || [],
            tags: articleData.tags || [],
            coverImage: articleData.coverImage || "",
          })
        );

        // Clean up auto-saved draft after successful save
        if (status === "published") {
          cleanupDraft();

          // Reset all form fields after successful publishing
          resetAllFields();

          // Navigate to dashboard after publishing
          navigate(isAdmin ? "/personal-dashboard" : "/dashboard");
          return;
        }

        // For archive saves when editing, navigate to my articles
        if (status === "archive") {
          navigate("/my-articles?status=archive");
          return;
        }

        // For draft saves when editing, don't reset form - just navigate
        if (status === "draft") {
          navigate(isAdmin ? "/personal-dashboard" : "/dashboard");
          return;
        }
      } else {
        // Create new article first to get an ID
        const newId = await createArticle(
          articleData as Omit<
            Article,
            "id" | "createdAt" | "updatedAt" | "slug"
          >
        );

        // Now handle file uploads with the new article ID
        await handleFileUploadsForNewArticle(newId, articleData);

        toast.success(
          `Article ${
            status === "published"
              ? "published"
              : status === "archive"
              ? "archived"
              : "created"
          } successfully`
        );

        // Update last saved data to track changes
        setLastSavedData(
          JSON.stringify({
            title: articleData.title || "",
            content: articleData.content || "",
            excerpt: articleData.excerpt || "",
            categories: articleData.categories || [],
            tags: articleData.tags || [],
            coverImage: articleData.coverImage || "",
          })
        );

        // Clean up auto-saved draft after successful creation
        if (status === "published") {
          cleanupDraft();
        }

        // Reset all form fields after successful creation (for both draft and published)
        resetAllFields();

        // Navigate based on status
        if (status === "draft") {
          navigate(isAdmin ? "/personal-dashboard" : "/dashboard");
        } else if (status === "archive") {
          // For archived articles, navigate to my articles with archive filter
          navigate("/my-articles?status=archive");
        } else {
          // For published articles, reset form and stay on new article page for next article
          navigate("/article/new");
        }
      }

      setArticle((prev) => ({ ...prev, status }));
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error("Error saving article. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Preview Component
  const PreviewComponent = () => (
    <>
      <style>{`
        /* Typography styles for preview mode */
        .article-content h1 {
          font-size: 32px !important;
          font-weight: bold !important;
          margin: 16px 0 8px 0 !important;
          line-height: 48px !important;
        }
        .article-content h3 {
          font-size: 24px !important;
          font-weight: 600 !important;
          margin: 12px 0 6px 0 !important;
          line-height: 27.6px !important;
        }
        .article-content p {
          font-size: 16px !important;
          line-height: 18.4px !important;
          margin: 8px 0 !important;
        }
        .article-content {
          font-size: 16px !important;
          line-height: 18.4px !important;
        }
        /* List styles for preview mode */
        .article-content ul, .article-content ol {
          font-size: 16px !important;
          line-height: 18.4px !important;
          margin: 8px 0 !important;
          padding-left: 24px !important;
        }
        .article-content ul li, .article-content ol li {
          font-size: 16px !important;
          line-height: 18.4px !important;
          margin: 2px 0 !important;
          padding-left: 4px !important;
          position: relative !important;
          display: list-item !important;
          box-sizing: border-box !important;
          min-height: 1.2em !important;
        }
        .article-content ul {
          list-style-type: disc !important;
          position: relative !important;
          display: block !important;
          box-sizing: border-box !important;
        }
        .article-content ol {
          list-style-type: decimal !important;
          position: relative !important;
          display: block !important;
          box-sizing: border-box !important;
        }
        /* Stable list positioning for preview */
        .article-content ul, .article-content ol {
          transform: translateZ(0) !important;
          backface-visibility: hidden !important;
        }
        .article-content li {
          transform: translateZ(0) !important;
          backface-visibility: hidden !important;
        }
        .article-content li p {
          margin: 0 !important;
          padding: 0 !important;
          display: inline !important;
        }
        /* Custom Image Layout Styles for Preview */
        .article-content .custom-image {
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          height: auto;
        }

        /* Full Column Width Layout */
        .article-content .image-full-column {
          max-width: 100%;
          width: auto;
          display: block;
          margin: 16px auto;
        }

        /* Outset Layout - extends beyond column boundaries */
        .article-content .image-outset {
          max-width: 120%;
          width: auto;
          display: block;
          margin: 16px auto;
          margin-left: -10%;
          margin-right: -10%;
        }

        /* Full Screen Width Layout */
        .article-content .image-full-screen {
          width: 100vw;
          max-width: none;
          display: block;
          margin: 16px 0;
          margin-left: calc(-50vw + 50%);
          margin-right: calc(-50vw + 50%);
          padding: 0 20px;
          box-sizing: border-box;
        }

        /* Image Grid Layouts */
        .article-content .image-grid-item {
          display: inline-block;
          margin: 4px;
          border-radius: 8px;
          vertical-align: top;
        }

        /* 2-image grid */
        .article-content .image-grid-item:nth-child(2n) {
          width: calc(50% - 8px);
        }

        /* 3-image grid */
        .article-content .image-grid-item:nth-child(3n) {
          width: calc(33.333% - 8px);
        }

        /* 4+ image grid */
        .article-content .image-grid-item:nth-child(4n) {
          width: calc(25% - 8px);
        }

        /* Grid container */
        .article-content .image-grid-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 16px 0;
          justify-content: center;
        }

        /* Responsive grid adjustments */
        @media (max-width: 768px) {
          .article-content .image-outset {
            max-width: 100%;
            margin-left: 0;
            margin-right: 0;
          }

          .article-content .image-full-screen {
            width: 100%;
            margin-left: 0;
            margin-right: 0;
            padding: 0;
          }

          .article-content .image-grid-item:nth-child(n) {
            width: calc(50% - 8px);
          }
        }

        @media (max-width: 480px) {
          .article-content .image-grid-item:nth-child(n) {
            width: 100%;
            margin: 4px 0;
          }
        }

        /* Image Caption Styles for Preview - now handled by JavaScript processor */
        .article-content .image-figure-container {
          margin: 16px auto !important;
          text-align: center !important;
          display: block !important;
        }

        .article-content .image-caption-text {
          margin-top: 12px !important;
          margin-bottom: 16px !important;
          font-size: 0.875rem !important;
          color: #6b7280 !important;
          font-style: italic !important;
          line-height: 1.5 !important;
          text-align: center !important;
          max-width: 600px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding: 0 20px !important;
          box-sizing: border-box !important;
          font-family: inherit !important;
        }

        /* Enhanced text content styling for preview */
        .article-content {
          color: #374151;
          line-height: 1.75;
          max-width: none;
          margin: 0 auto;
        }

        .article-content p {
          margin-top: 1.25em !important;
          margin-bottom: 1.25em !important;
          color: #374151 !important;
          text-align: left !important;
          font-size: 16px !important;
          line-height: 1.75 !important;
        }

        .article-content h1, .article-content h2, .article-content h3, .article-content h4, .article-content h5, .article-content h6 {
          color: #111827 !important;
          font-weight: 600 !important;
          line-height: 1.25 !important;
          margin-top: 2em !important;
          margin-bottom: 1em !important;
        }

        .article-content ul, .article-content ol {
          margin-top: 1.25em !important;
          margin-bottom: 1.25em !important;
          padding-left: 1.625em !important;
          color: #374151 !important;
        }

        .article-content li {
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }

        .article-content blockquote {
          font-style: italic !important;
          border-left: 4px solid #e5e7eb !important;
          padding-left: 1em !important;
          margin: 1.6em 0 !important;
          color: #6b7280 !important;
        }

        .article-content code {
          background-color: #f3f4f6 !important;
          padding: 0.125em 0.25em !important;
          border-radius: 0.25em !important;
          font-size: 0.875em !important;
          color: #dc2626 !important;
        }

        .article-content pre {
          background-color: #1f2937 !important;
          color: #f9fafb !important;
          padding: 1em !important;
          border-radius: 0.5em !important;
          overflow-x: auto !important;
          margin: 1.5em 0 !important;
        }

        .article-content pre code {
          background-color: transparent !important;
          color: inherit !important;
          padding: 0 !important;
        }

        .article-content a {
          color: #2563eb !important;
          text-decoration: underline !important;
        }

        .article-content a:hover {
          color: #1d4ed8 !important;
        }

        .article-content strong {
          font-weight: 600 !important;
          color: #111827 !important;
        }

        .article-content em {
          font-style: italic !important;
        }

        /* Legacy image styles for backward compatibility */
        .article-content img:not(.custom-image) {
          border-radius: 8px;
          max-width: 100%;
          height: auto;
          display: block;
          margin: 8px auto;
        }
        .article-content img[style*="float: left"] {
          float: left !important;
          margin: 0 16px 8px 0 !important;
          max-width: 50% !important;
          display: inline !important;
        }
        .article-content img[style*="float: right"] {
          float: right !important;
          margin: 0 0 8px 16px !important;
          max-width: 50% !important;
          display: inline !important;
        }
        .article-content img[style*="margin: 16px auto"] {
          display: block !important;
          margin: 16px auto !important;
          max-width: 100% !important;
          float: none !important;
        }
        /* Clear floats after images */
        .article-content::after {
          content: "";
          display: table;
          clear: both;
        }
      `}</style>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Cover Image */}
        {article.coverImage && (
          <div className="w-full h-64 md:h-80 overflow-hidden">
            <img
              src={article.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Header */}
        {/* Upload Manager */}
        <UploadManager
          isOpen={showUploadManager}
          onClose={() => setShowUploadManager(false)}
          articleId={id !== "new" ? id : undefined}
        />

        {/* Upload Status Indicator */}
        {hasActiveUploads && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-8 mt-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Upload className="h-5 w-5 text-yellow-400 animate-pulse" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Files are uploading...</strong> Please wait for all uploads to complete before saving or leaving this page.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {article.title || "Untitled Article"}
          </h1>

          {/* Category and Tags */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {selectedCategory && (
              <div className="flex items-center space-x-2">
                <Folder className="h-4 w-4 text-blue-600" />
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedCategory}
                </span>
              </div>
            )}

            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-purple-600" />
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Article Content */}
          <div className="max-w-4xl mx-auto px-6">
            <div
              className="prose prose-lg max-w-none article-content"
              dangerouslySetInnerHTML={{
                __html: processLayoutSpecificCaptions(
                  article.content || "<p>Start writing your article...</p>"
                ),
              }}
            />
          </div>

          {/* Tags at bottom */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          {article.attachments && article.attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Paperclip className="h-5 w-5 mr-2" />
                Attachments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {article.attachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-gray-600 mr-3" />
                    <span className="text-sm text-gray-700 truncate">
                      {extractOriginalFilename(url) || `Attachment ${index + 1}`}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Draft Recovery Modal */}
      {showDraftRecovery && (
        <DraftRecovery
          onRecover={handleDraftRecover}
          onDismiss={() => setShowDraftRecovery(false)}
          currentArticleId={id === "new" ? undefined : id}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back to Dashboard Button */}
          <button
            onClick={() =>
              handleNavigation(isAdmin ? "/dashboard" : "/dashboard")
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => handleNavigation("/my-articles")}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Back to Articles</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Preview Toggle */}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isPreviewMode
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {isPreviewMode ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span>{isPreviewMode ? "Edit Mode" : "Preview"}</span>
          </button>

          <button
            onClick={() => handleSave("draft")}
            disabled={saving || hasActiveUploads}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            title={hasActiveUploads ? "Please wait for uploads to complete" : ""}
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={() => handleSave("archive")}
            disabled={saving || hasActiveUploads}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            title={hasActiveUploads ? "Please wait for uploads to complete" : ""}
          >
            <FileText className="h-4 w-4" />
            <span>Archive</span>
          </button>

          <button
            onClick={() => handleSave("published")}
            disabled={saving || hasActiveUploads}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            title={hasActiveUploads ? "Please wait for uploads to complete" : ""}
          >
            <Send className="h-4 w-4" />
            <span>Publish</span>
          </button>
        </div>
      </div>

      {/* Show Preview or Editor */}
      {isPreviewMode ? (
        <PreviewComponent />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Image Upload */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" />
                Cover Image (Optional)
              </h3>

              {article.coverImage ? (
                <div className="relative">
                  <img
                    src={article.coverImage}
                    alt="Cover"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={removeCoverImage}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Method Toggle */}
                  <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setCoverImageMethod("upload")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        coverImageMethod === "upload"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      📁 Upload File
                    </button>
                    <button
                      onClick={() => setCoverImageMethod("url")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        coverImageMethod === "url"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      🔗 Image URL
                    </button>
                  </div>

                  {/* Upload Method */}
                  {coverImageMethod === "upload" && (
                    <FileUpload
                      onUploadComplete={handleCoverImageUpload}
                      onUploadError={(error) => toast.error(error)}
                      accept="image/*"
                      useResumable={true}
                      articleId={id === "new" ? undefined : id}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
                    >
                      <div className="flex flex-col items-center">
                        <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-2">
                          Click to upload cover image
                        </p>
                        <p className="text-sm text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </FileUpload>
                  )}

                  {/* URL Method */}
                  {coverImageMethod === "url" && (
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={coverImageUrl}
                          onChange={(e) => setCoverImageUrl(e.target.value)}
                          placeholder="Enter image URL (https://...)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleCoverImageUrl}
                          disabled={!coverImageUrl.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Add
                        </button>
                      </div>

                      {/* URL Preview */}
                      {coverImageUrl.trim() && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-2">Preview:</p>
                          <img
                            src={coverImageUrl}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling!.style.display =
                                "block";
                            }}
                          />
                          <div className="hidden text-center py-8 text-gray-500">
                            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">Invalid image URL</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Article Title{" "}
                <span className="text-s text-red-500 mr-0">*</span>
              </label>
              <input
                type="text"
                value={article.title || ""}
                onChange={(e) =>
                  setArticle((prev) => ({ ...prev, title: e.target.value }))
                }
                onFocus={() =>
                  setFieldErrors((prev) => ({ ...prev, title: "" }))
                }
                placeholder="Article title..."
                className={`w-full text-3xl font-bold border-none outline-none bg-transparent placeholder-gray-400 resize-none ${
                  fieldErrors.title ? "border-b-2 border-red-500" : ""
                }`}
                style={{ minHeight: "1.2em" }}
              />
              {fieldErrors.title && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {fieldErrors.title}
                </p>
              )}
            </div>

            {/* Rich Text Editor */}
            <div
              className={`bg-white rounded-2xl border overflow-hidden ${
                fieldErrors.content ? "border-red-500" : "border-gray-200"
              }`}
            >
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Article Content{" "}
                  <span className="text-s text-red-500 mr-0">*</span>
                </h3>
                {fieldErrors.content && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {fieldErrors.content}
                  </p>
                )}
              </div>
              <div className="p-6">
                <RichTextEditor
                  key={editorKey}
                  content={article.content || ""}
                  onChange={(content) => {
                    setArticle((prev) => ({ ...prev, content }));
                    if (fieldErrors.content) {
                      setFieldErrors((prev) => ({ ...prev, content: "" }));
                    }
                  }}
                  placeholder="Start writing your article..."
                  articleId={id !== "new" ? id : undefined}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category Selection */}
            <div
              className={`bg-white rounded-2xl p-6 border ${
                fieldErrors.category ? "border-red-500" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Folder className="h-5 w-5 mr-2" />
                Category <span className="text-s text-red-500 mr-0">*</span>
              </h3>

              <select
                value={selectedCategory}
                onChange={(e) => {
                  handleCategoryChange(e.target.value);
                  if (fieldErrors.category) {
                    setFieldErrors((prev) => ({ ...prev, category: "" }));
                  }
                }}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.category ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select a category...</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {selectedCategory === "Other" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter Custom Category{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      if (fieldErrors.category) {
                        setFieldErrors((prev) => ({ ...prev, category: "" }));
                      }
                      setArticle((prev) => ({
                        ...prev,
                        categories: [e.target.value],
                      }));
                    }}
                    placeholder="Type your custom category..."
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.category
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                </div>
              )}

              {fieldErrors.category && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {fieldErrors.category}
                </p>
              )}

              {selectedCategory && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {selectedCategory === "Other"
                      ? customCategory || "Other"
                      : selectedCategory}
                    <button
                      onClick={() => handleCategoryChange("")}
                      className="hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div
              className={`bg-white rounded-2xl p-6 border ${
                fieldErrors.tags ? "border-red-500" : "border-gray-200"
              }`}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Tags<span className="text-s text-red-500 mr-0">*</span>
              </h3>

              {fieldErrors.tags && (
                <div className="mb-3">
                  <p className="text-red-500 text-sm flex items-center">
                    <span className="mr-1">⚠️</span>
                    {fieldErrors.tags}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {article.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-purple-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    if (
                      fieldErrors.tags &&
                      article.tags &&
                      article.tags.length > 0
                    ) {
                      setFieldErrors((prev) => ({ ...prev, tags: "" }));
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  className={`flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    fieldErrors.tags ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={article.tags && article.tags.length >= 4}
                />
                <button
                  onClick={() => {
                    addTag();
                    if (fieldErrors.tags && tagInput.trim()) {
                      setFieldErrors((prev) => ({ ...prev, tags: "" }));
                    }
                  }}
                  disabled={
                    !tagInput.trim() ||
                    (article.tags && article.tags.length >= 4)
                  }
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2 flex items-center">
                <span className="text-red-500 mr-1">*</span>
                {article.tags?.length || 0}/4 tags used
                {article.tags &&
                  article.tags.length === 0 &&
                  " - At least one tag is required"}
              </p>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Paperclip className="h-5 w-5 mr-2" />
                Attachments
              </h3>

              {id === "new" ? (
                <div className="border-2 border-dashed border-yellow-300 rounded-lg p-4 text-center bg-yellow-50">
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 text-yellow-400 mb-2" />
                    <p className="text-sm text-yellow-700 mb-1 font-medium">
                      Save Article First
                    </p>
                    <p className="text-xs text-yellow-600">
                      Please save the article to enable file uploads
                    </p>
                  </div>
                </div>
              ) : (
                <FileUpload
                  onUploadComplete={handleAttachmentUpload}
                  onUploadError={(error) => toast.error(error)}
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                  useResumable={true}
                  articleId={id === "new" ? undefined : id}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Upload files</p>
                    <p className="text-xs text-gray-500">PDF, DOC, TXT, etc.</p>
                  </div>
                </FileUpload>
              )}

              {article.attachments && article.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {article.attachments.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-600 mr-2" />
                        <span className="text-sm text-gray-700 truncate">
                          {extractOriginalFilename(url) || `Attachment ${index + 1}`}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const updatedAttachments =
                            article.attachments?.filter(
                              (_, i) => i !== index
                            ) || [];
                          setArticle((prev) => ({
                            ...prev,
                            attachments: updatedAttachments,
                          }));
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Unsaved Changes
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              You have unsaved changes. Would you like to save them as a draft
              before leaving?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowUnsavedWarning(false);
                  setHasUnsavedChanges(false);

                  // Clean up temp files if leaving without saving
                  if (id === "new" && userProfile) {
                    try {
                      await resumableUploadManager.cleanupTempFiles(
                        userProfile.uid
                      );
                      console.log(
                        "🧹 Cleaned up temp files on leave without saving"
                      );
                    } catch (error) {
                      console.error("Error cleaning up temp files:", error);
                    }
                  }

                  navigate(-1);
                }}
                className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                Leave Without Saving
              </button>
              <button
                onClick={async () => {
                  setShowUnsavedWarning(false);
                  await handleSave("draft");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
