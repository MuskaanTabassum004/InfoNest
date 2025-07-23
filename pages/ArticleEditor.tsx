@@ .. @@
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
+import { useAutoSave } from "../hooks/useAutoSave";
+import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
+import { DraftRecovery } from "../components/DraftRecovery";
+import { draftStorage } from "../utils/draftStorage";
import {
  createArticle,
  updateArticle,
  getArticle,
  Article,
} from "../lib/articles";
@@ .. @@
  const [showUploadManager, setShowUploadManager] = useState(false);

+  // Auto-save functionality
+  const autoSaveData = {
+    title: article.title || '',
+    content: article.content || '',
+    excerpt: article.excerpt || '',
+    categories: article.categories || [],
+    tags: article.tags || [],
+    coverImage: article.coverImage || ''
+  };
+
+  const { saveState } = useAutoSave(id === "new" ? null : id, autoSaveData, {
+    debounceMs: 3000, // Save after 3 seconds of inactivity
+    maxRetries: 3,
+    retryDelayMs: 2000
+  });
+
+  // Draft recovery state
+  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
+
   // Field validation states
   const [fieldErrors, setFieldErrors] = useState({
     title: "",
@@ .. @@
   // Extract files from article content
   const articleFiles = useArticleFiles(article.content || "");

+  // Check for available drafts on component mount
+  useEffect(() => {
+    const checkForDrafts = () => {
+      const drafts = draftStorage.getAllDrafts();
+      const hasRecoverableDrafts = drafts.some(draft => {
+        const isNotCurrent = !id || draft.id !== id;
+        const hasContent = draft.content.trim().length > 50;
+        const isRecent = Date.now() - draft.lastModified.getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
+        return isNotCurrent && hasContent && isRecent;
+      });
+      
+      if (hasRecoverableDrafts && !isEditing) {
+        setShowDraftRecovery(true);
+      }
+    };
+
+    // Only check for drafts when creating a new article
+    if (!isEditing) {
+      setTimeout(checkForDrafts, 1000); // Delay to avoid showing during initial load
+    }
+  }, [isEditing, id]);
+
+  // Save draft to localStorage whenever article data changes
+  useEffect(() => {
+    if (!userProfile || !article.title && !article.content) return;
+
+    const draftData = {
+      title: article.title || '',
+      content: article.content || '',
+      excerpt: article.excerpt || '',
+      categories: article.categories || [],
+      tags: article.tags || [],
+      coverImage: article.coverImage || ''
+    };
+
+    // Only save if there's meaningful content
+    if (draftData.title.trim() || draftData.content.trim()) {
+      draftStorage.saveDraft(id === "new" ? null : id, draftData);
+    }
+  }, [article, userProfile, id]);
+
   // Handle file removal from both document and storage
   const handleFileRemoved = (removedFile: ManagedFile) => {
@@ .. @@
     }
   };

+  // Handle draft recovery
+  const handleDraftRecover = (draft: any) => {
+    setArticle({
+      title: draft.title || '',
+      content: draft.content || '',
+      excerpt: draft.excerpt || '',
+      status: 'draft',
+      categories: draft.categories || [],
+      tags: draft.tags || [],
+      coverImage: draft.coverImage || '',
+      attachments: []
+    });
+    
+    // Set form state
+    setSelectedCategory(draft.categories?.[0] || '');
+    setShowDraftRecovery(false);
+    
+    toast.success('Draft recovered successfully!');
+  };
+
   // Helper functions for enhanced features
   const addTag = () => {
@@ .. @@
     }
   };

+  // Clean up draft when article is successfully saved/published
+  const cleanupDraft = () => {
+    if (id && id !== "new") {
+      draftStorage.deleteDraft(id);
+    }
+  };
+
   const handleSave = async (status: "draft" | "published" = "draft") => {
@@ .. @@
         toast.success(
           `Article ${
             status === "published" ? "published" : "saved"
           } successfully`
         );
+        
+        // Clean up auto-saved draft after successful save
+        if (status === "published") {
+          cleanupDraft();
+        }
       } else {
         const newId = await createArticle(
           articleData as Omit<
@@ -1031,6 +1108,11 @@
           } successfully`
         );
         navigate(`/article/edit/${newId}`);
+        
+        // Clean up auto-saved draft after successful creation
+        if (status === "published") {
+          cleanupDraft();
+        }
       }

       setArticle((prev) => ({ ...prev, status }));
@@ .. @@
   return (
     <div className="max-w-6xl mx-auto space-y-6">
+      {/* Auto-Save Indicator */}
+      <AutoSaveIndicator
+        status={saveState.status}
+        lastSaved={saveState.lastSaved}
+        error={saveState.error}
+        hasUnsavedChanges={saveState.hasUnsavedChanges}
+      />
+
+      {/* Draft Recovery Modal */}
+      {showDraftRecovery && (
+        <DraftRecovery
+          onRecover={handleDraftRecover}
+          onDismiss={() => setShowDraftRecovery(false)}
+          currentArticleId={id === "new" ? undefined : id}
+        />
+      )}
+
       {/* Header */}
       <div className="flex items-center justify-between">