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
import { Save, Eye, ArrowLeft, Trash2, Send, Upload } from "lucide-react";
import { UploadResult } from "../lib/fileUpload";
import toast from "react-hot-toast";

export const ArticleEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, isInfoWriter } = useAuth();
  const isEditing = id !== "new";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [article, setArticle] = useState<Partial<Article>>({
    title: "",
    content: "",
    excerpt: "",
    status: "draft",
    categories: [],
    tags: [],
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    // Wait for user profile to load before checking permissions
    if (!userProfile) return;

    if (!isInfoWriter) {
      toast.error("You need InfoWriter privileges to create or edit articles");
      navigate("/dashboard");
      return;
    }

    if (isEditing && id) {
      loadArticle(id);
    }
  }, [id, isEditing, isInfoWriter, navigate, userProfile]);

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
            "id" | "createdAt" | "updatedAt" | "version" | "slug"
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
      toast.error("Error saving article");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (
      categoryInput.trim() &&
      !article.categories?.includes(categoryInput.trim())
    ) {
      setArticle((prev) => ({
        ...prev,
        categories: [...(prev.categories || []), categoryInput.trim()],
      }));
      setCategoryInput("");
    }
  };

  const removeCategory = (category: string) => {
    setArticle((prev) => ({
      ...prev,
      categories: prev.categories?.filter((c) => c !== category) || [],
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !article.tags?.includes(tagInput.trim())) {
      setArticle((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setArticle((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/my-articles")}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Articles</span>
        </button>

        <div className="flex items-center space-x-3">
          {isEditing && (
            <button
              onClick={() => navigate(`/article/${id}`)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </button>
          )}

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

      {/* Title */}
      <div>
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

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categories
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {article.categories?.map((category) => (
              <span
                key={category}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {category}
                <button
                  onClick={() => removeCategory(category)}
                  className="hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addCategory())
              }
              placeholder="Add category..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {article.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-gray-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addTag())
              }
              placeholder="Add tag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addTag}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt (Optional)
        </label>
        <textarea
          value={article.excerpt || ""}
          onChange={(e) =>
            setArticle((prev) => ({ ...prev, excerpt: e.target.value }))
          }
          placeholder="Brief description of the article..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank to auto-generate from content
        </p>
      </div>

      {/* Content Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content
        </label>
        <RichTextEditor
          content={article.content || ""}
          onChange={(content) => setArticle((prev) => ({ ...prev, content }))}
        />
      </div>

      {/* File Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Files
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Upload images, PDFs, or documents to include in your article.
          Files will be automatically inserted into your document as clickable links.
        </p>
        <FileUpload
          onUploadComplete={(result: UploadResult) => {
            // Automatically insert the uploaded file into the document
            if (result.type.startsWith("image/")) {
              // Insert image
              const imageHtml = `<img src="${result.url}" alt="${result.name}" style="max-width: 100%; height: auto;" />`;
              setArticle(prev => ({
                ...prev,
                content: (prev.content || "") + `\n\n${imageHtml}\n\n`
              }));
            } else {
              // Insert link for non-image files (PDFs, documents, etc.)
              const fileType = result.type === 'application/pdf' ? 'PDF' : 'Document';
              const linkHtml = `<p><a href="${result.url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">📄 ${result.name} (${fileType})</a></p>`;
              setArticle(prev => ({
                ...prev,
                content: (prev.content || "") + `\n\n${linkHtml}\n\n`
              }));
            }
            toast.success("File uploaded and inserted into document!");
          }}
          onUploadError={(error: string) => {
            toast.error(error);
          }}
          accept="image/*,.pdf,.txt,.doc,.docx"
          folder="articles"
          className="mb-4"
        />
      </div>

      {/* Status Info */}
      {isEditing && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Status:{" "}
              <span className="capitalize font-medium">{article.status}</span>
            </span>
            <span>Version: {article.version}</span>
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
