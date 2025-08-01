import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { RichTextEditor } from "../components/RichTextEditor";
import { FileUpload } from "../components/FileUpload";
import { FileManager, useArticleFiles } from "../components/FileManager";
import {
  createArticle,
  updateArticle,
  getArticle,
  Article,
} from "../lib/articles";
import { UploadResult } from "../lib/fileUpload";
import {
  Save,
  Send,
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Tag,
  Folder,
  Eye,
  Upload,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { UploadManager } from "../components/UploadManager";

const CATEGORIES = [
  "Technology & Software",
  "Business & Management", 
  "Marketing & Sales",
  "Finance & Accounting",
  "Human Resources",
  "Operations & Logistics",
  "Customer Service",
  "Legal & Compliance",
  "Healthcare",
  "Education & Training",
  "Research & Development",
  "Quality Assurance",
  "Project Management",
  "Data Analysis",
  "Design & Creative",
  "Other",
];

export const ArticleEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isEditing = id !== "new";
  const [showUploadManager, setShowUploadManager] = useState(false);

  // Article state
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

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    content: "",
    excerpt: "",
    categories: "",
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newTag, setNewTag] = useState("");

  // Extract files from article content
  const articleFiles = useArticleFiles(article.content || "");

  // Load article if editing
  useEffect(() => {
    if (isEditing && id) {
      loadArticle(id);
    }
  }, [id, isEditing]);

  const loadArticle = async (articleId: string) => {
    setLoading(true);
    try {
      const loadedArticle = await getArticle(articleId);
      if (loadedArticle) {
        setArticle(loadedArticle);
        setSelectedCategory(loadedArticle.categories[0] || "");
      } else {
        toast.error("Article not found");
        navigate("/my-articles");
      }
    } catch (error) {
      console.error("Error loading article:", error);
      toast.error("Error loading article");
      navigate("/my-articles");
    } finally {
      setLoading(false);
    }
  };

  // Handle file removal from both document and storage
  const handleFileRemoved = (removedFile: any) => {
    // Update article content to remove file references
    if (article.content) {
      let updatedContent = article.content;
      
      // Remove image references
      const imgRegex = new RegExp(`<img[^>]*src="${removedFile.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g');
      updatedContent = updatedContent.replace(imgRegex, '');
      
      // Remove link references
      const linkRegex = new RegExp(`<a[^>]*href="${removedFile.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>.*?</a>`, 'g');
      updatedContent = updatedContent.replace(linkRegex, '');
      
      setArticle(prev => ({ ...prev, content: updatedContent }));
    }

    // Remove from attachments if present
    if (article.attachments?.includes(removedFile.url)) {
      setArticle(prev => ({
        ...prev,
        attachments: prev.attachments?.filter(url => url !== removedFile.url) || []
      }));
    }

    // Remove from cover image if it matches
    if (article.coverImage === removedFile.url) {
      setArticle(prev => ({ ...prev, coverImage: "" }));
    }
  };

  // Helper functions for enhanced features
  const addTag = () => {
    if (newTag.trim() && !article.tags?.includes(newTag.trim())) {
      setArticle(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setArticle(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const addCategory = () => {
    if (selectedCategory && !article.categories?.includes(selectedCategory)) {
      setArticle(prev => ({
        ...prev,
        categories: [...(prev.categories || []), selectedCategory]
      }));
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    setArticle(prev => ({
      ...prev,
      categories: prev.categories?.filter(cat => cat !== categoryToRemove) || []
    }));
  };

  const validateForm = (): boolean => {
    const errors = {
      title: "",
      content: "",
      excerpt: "",
      categories: "",
    };

    if (!article.title?.trim()) {
      errors.title = "Title is required";
    }

    if (!article.content?.trim()) {
      errors.content = "Content is required";
    }

    if (!article.excerpt?.trim()) {
      errors.excerpt = "Excerpt is required";
    }

    if (!article.categories?.length) {
      errors.categories = "At least one category is required";
    }

    setFieldErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  const handleSave = async (status: "draft" | "published" = "draft") => {
    if (!userProfile) {
      toast.error("Please login to save articles");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const articleData = {
        ...article,
        authorId: userProfile.uid,
        authorName: userProfile.displayName || userProfile.email,
        status,
        publishedAt: status === "published" ? new Date() : undefined,
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
      toast.error("Error saving article");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverImageUpload = (result: UploadResult) => {
    setArticle(prev => ({ ...prev, coverImage: result.url }));
    toast.success("Cover image uploaded successfully!");
  };

  const handleAttachmentUpload = (result: UploadResult) => {
    setArticle(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), result.url]
    }));
    toast.success("Attachment uploaded successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/my-articles")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Edit Article" : "Create New Article"}
            </h1>
            <p className="text-gray-600">
              {isEditing ? "Update your article" : "Share your knowledge with the community"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadManager(true)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Manager</span>
          </button>

          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>{saving ? "Publishing..." : "Publish"}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={article.title || ""}
              onChange={(e) => {
                setArticle(prev => ({ ...prev, title: e.target.value }));
                if (fieldErrors.title) {
                  setFieldErrors(prev => ({ ...prev, title: "" }));
                }
              }}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                fieldErrors.title ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              placeholder="Enter article title..."
            />
            {fieldErrors.title && (
              <p className="text-red-600 text-sm mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image
            </label>
            {article.coverImage ? (
              <div className="relative">
                <img
                  src={article.coverImage}
                  alt="Cover"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <button
                  onClick={() => setArticle(prev => ({ ...prev, coverImage: "" }))}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <FileUpload
                onUploadComplete={handleCoverImageUpload}
                accept="image/*"
                folder="articles"
                articleId={id !== "new" ? id : undefined}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
              >
                <div className="space-y-2">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600">Click to upload cover image</p>
                </div>
              </FileUpload>
            )}
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <RichTextEditor
              content={article.content || ""}
              onChange={(content) => {
                setArticle(prev => ({ ...prev, content }));
                if (fieldErrors.content) {
                  setFieldErrors(prev => ({ ...prev, content: "" }));
                }
              }}
              placeholder="Start writing your article..."
              articleId={id !== "new" ? id : undefined}
            />
            {fieldErrors.content && (
              <p className="text-red-600 text-sm mt-1">{fieldErrors.content}</p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt *
            </label>
            <textarea
              value={article.excerpt || ""}
              onChange={(e) => {
                setArticle(prev => ({ ...prev, excerpt: e.target.value }));
                if (fieldErrors.excerpt) {
                  setFieldErrors(prev => ({ ...prev, excerpt: "" }));
                }
              }}
              rows={3}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                fieldErrors.excerpt ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              placeholder="Brief description of your article..."
            />
            {fieldErrors.excerpt && (
              <p className="text-red-600 text-sm mt-1">{fieldErrors.excerpt}</p>
            )}
          </div>

          {/* File Manager */}
          {articleFiles.length > 0 && (
            <FileManager
              files={articleFiles}
              onFileRemoved={handleFileRemoved}
              className="bg-gray-50 rounded-lg p-4"
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Folder className="h-5 w-5 mr-2 text-blue-600" />
              Categories *
            </h3>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addCategory}
                  disabled={!selectedCategory}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>

              {article.categories && article.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {category}
                      <button
                        onClick={() => removeCategory(category)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {fieldErrors.categories && (
              <p className="text-red-600 text-sm mt-2">{fieldErrors.categories}</p>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-purple-600" />
              Tags
            </h3>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={addTag}
                  disabled={!newTag.trim()}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Attachments
            </h3>
            
            <FileUpload
              onUploadComplete={handleAttachmentUpload}
              accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              folder="articles"
              articleId={id !== "new" ? id : undefined}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-400 transition-colors"
            >
              <div className="space-y-2">
                <FileText className="h-6 w-6 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-600">Click to upload documents</p>
                <p className="text-xs text-gray-500">PDF, DOC, XLS, PPT files</p>
              </div>
            </FileUpload>

            {article.attachments && article.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
                {article.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 truncate">
                      {attachment.split("/").pop()}
                    </span>
                    <button
                      onClick={() => {
                        setArticle(prev => ({
                          ...prev,
                          attachments: prev.attachments?.filter((_, i) => i !== index) || []
                        }));
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {isEditing && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-gray-600" />
                Preview
              </h3>
              <a
                href={`/article/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>View Article</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Upload Manager Modal */}
      <UploadManager
        isOpen={showUploadManager}
        onClose={() => setShowUploadManager(false)}
      />
    </div>
  );
};