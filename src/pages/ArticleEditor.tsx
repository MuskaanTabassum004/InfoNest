import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  createArticle,
  updateArticle,
  getArticle,
  Article,
} from "../lib/articles";
import { RichTextEditor } from "../components/RichTextEditor";
import { FileUpload } from "../components/FileUpload";
import {
  FileManager,
  useArticleFiles,
  ManagedFile,
} from "../components/FileManager";
import { UploadManager } from "../components/UploadManager";
import { resumableUploadManager } from "../lib/resumableUpload";
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
} from "lucide-react";
import { UploadResult } from "../lib/fileUpload";
import toast from "react-hot-toast";

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

  // Enhanced form state
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [coverImageMethod, setCoverImageMethod] = useState<"upload" | "url">(
    "upload"
  );
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [showUploadManager, setShowUploadManager] = useState(false);

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
  ];

  // Extract files from article content
  const articleFiles = useArticleFiles(article.content || "");

  // Handle file removal from both document and storage
  const handleFileRemoved = (removedFile: ManagedFile) => {
    // Remove file references from article content
    let updatedContent = article.content || "";

    // Remove image tags with this URL
    const imgRegex = new RegExp(
      `<img[^>]*src=["']${removedFile.url.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}["'][^>]*>`,
      "gi"
    );
    updatedContent = updatedContent.replace(imgRegex, "");

    // Remove link tags with this URL
    const linkRegex = new RegExp(
      `<a[^>]*href=["']${removedFile.url.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}["'][^>]*>.*?</a>`,
      "gi"
    );
    updatedContent = updatedContent.replace(linkRegex, "");

    // Remove paragraph tags that might be empty after link removal
    updatedContent = updatedContent.replace(/<p>\s*<\/p>/gi, "");

    // Remove from attachments if present
    const updatedAttachments =
      article.attachments?.filter((url) => url !== removedFile.url) || [];

    // Update article content and attachments
    setArticle((prev) => ({
      ...prev,
      content: updatedContent,
      attachments: updatedAttachments,
    }));
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
      categories: category ? [category] : [],
    }));
  };

  const handleCoverImageUpload = async (result: UploadResult) => {
    setArticle((prev) => ({
      ...prev,
      coverImage: result.url,
    }));
    setCoverImageUploading(false);
    toast.success("Cover image uploaded successfully");
  };

  // Monitor active uploads to show manager
  useEffect(() => {
    const interval = setInterval(() => {
      const activeUploads = resumableUploadManager.getActiveUploads();
      if (activeUploads.length > 0 && !showUploadManager) {
        setShowUploadManager(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [showUploadManager]);

  const handleCoverImageUrl = () => {
    if (coverImageUrl.trim()) {
      setArticle((prev) => ({
        ...prev,
        coverImage: coverImageUrl.trim(),
      }));
      toast.success("Cover image URL added successfully");
    }
  };

  const removeCoverImage = () => {
    setArticle((prev) => ({
      ...prev,
      coverImage: "",
    }));
    setCoverImageUrl("");
  };

  const handleAttachmentUpload = (result: UploadResult) => {
    setArticle((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), result.url],
    }));
    toast.success("File attached successfully");
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
        // Check if user owns this article or is admin
        if (
          loadedArticle.authorId !== userProfile?.uid &&
          userProfile?.role !== "admin"
        ) {
          toast.error("You can only edit your own articles");
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
    const textContent = content.replace(/<[^>]*>/g, "").trim();
    return textContent.length > 200
      ? textContent.substring(0, 200) + "..."
      : textContent;
  };

  const handleSave = async (status: "draft" | "published" = "draft") => {
    if (!userProfile || !article.title?.trim() || !article.content?.trim()) {
      toast.error("Please fill in title and content");
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
      const articleData = {
        ...article,
        status,
        excerpt: article.excerpt || generateExcerpt(article.content),
        authorId: userProfile.uid,
        authorName: userProfile.displayName || userProfile.email,
        publishedAt: status === "published" ? new Date() : article.publishedAt,
      };

      if (isEditing && id) {
        await updateArticle(id, articleData);
        toast.success(
          `Article ${
            status === "published" ? "published" : "saved"
          } successfully`
        );
      } else {
        const newId = await createArticle(
          articleData as Omit<
            Article,
            "id" | "createdAt" | "updatedAt" | "slug"
          >
        );
        toast.success(
          `Article ${
            status === "published" ? "published" : "created"
          } successfully`
        );
        navigate(`/article/edit/${newId}`);
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
        /* Image styles for preview mode */
        .article-content img {
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
        />

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
          <div
            className="prose prose-lg max-w-none article-content"
            dangerouslySetInnerHTML={{
              __html: article.content || "<p>Start writing your article...</p>",
            }}
          />

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
                      Attachment {index + 1}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back to Dashboard Button */}
          <button
            onClick={() =>
              navigate(isAdmin ? "/personal-dashboard" : "/dashboard")
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => navigate("/my-articles")}
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
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
              <input
                type="text"
                value={article.title || ""}
                onChange={(e) =>
                  setArticle((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Article title..."
                className="w-full text-3xl font-bold border-none outline-none bg-transparent placeholder-gray-400 resize-none"
                style={{ minHeight: "1.2em" }}
              />
            </div>

            {/* Rich Text Editor */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Article Content
                </h3>
              </div>
              <div className="p-6">
                <RichTextEditor
                  content={article.content || ""}
                  onChange={(content) =>
                    setArticle((prev) => ({ ...prev, content }))
                  }
                  placeholder="Start writing your article..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category Selection */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Folder className="h-5 w-5 mr-2" />
                Category (Select One)
              </h3>

              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category...</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {selectedCategory && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {selectedCategory}
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
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Tags (Max 4)
              </h3>

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
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={article.tags && article.tags.length >= 4}
                />
                <button
                  onClick={addTag}
                  disabled={
                    !tagInput.trim() ||
                    (article.tags && article.tags.length >= 4)
                  }
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {article.tags?.length || 0}/4 tags used
              </p>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Paperclip className="h-5 w-5 mr-2" />
                Attachments
              </h3>

              <FileUpload
                onUploadComplete={handleAttachmentUpload}
                onUploadError={(error) => toast.error(error)}
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                useResumable={true}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">Upload files</p>
                  <p className="text-xs text-gray-500">PDF, DOC, TXT, etc.</p>
                </div>
              </FileUpload>

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
                          Attachment {index + 1}
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

      {/* File Manager */}
      {!isPreviewMode && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              File Manager
            </h2>
          </div>
          <div className="p-6">
            <FileManager
              files={articleFiles}
              onFileRemoved={handleFileRemoved}
            />
          </div>
        </div>
      )}

      {/* Article Info */}
      {isEditing && !isPreviewMode && (
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Article Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <span>Status: {article.status}</span>
            {article.updatedAt && (
              <span>
                Last updated: {new Date(article.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
