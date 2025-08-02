import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
} from "firebase/firestore";
import { firestore } from "./firebase";
import {
  deleteFile,
  extractFilePathFromUrl,
  deleteArticleFolder,
} from "./fileUpload";

export type ArticleStatus =
  | "draft"
  | "published"
  | "unpublished"
  | "deleted"
  | "archive";

export interface AttachmentMetadata {
  url: string;
  originalName: string;
  size?: number;
  type?: string;
  uploadedAt?: Date;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: ArticleStatus;
  authorId: string;
  authorName: string;
  categories: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  slug: string;
  coverImage?: string;
  views?: number;
  shareCount?: number;
  attachments?: string[]; // Legacy: URLs only (for backward compatibility)
  attachmentMetadata?: AttachmentMetadata[]; // New: Full metadata with original names
  // Like fields
  likes?: number;
  likedBy?: string[];
  // Soft delete fields
  deletedAt?: Date;
  deletedBy?: string; // "admin" or "infowriter"
  deletedByUserId?: string;
  deleteReason?: string;
  isDeleted?: boolean;
}

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

export const createArticle = async (
  article: Omit<Article, "id" | "createdAt" | "updatedAt" | "slug">
): Promise<string> => {
  try {
    const docRef = doc(collection(firestore, "articles"));
    const slug = generateSlug(article.title);

    const newArticle: Article = {
      ...article,
      id: docRef.id,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      likedBy: [],
    };

    // Prepare data for Firestore, handling undefined values
    const firestoreData: any = {
      ...newArticle,
      createdAt: Timestamp.fromDate(newArticle.createdAt),
      updatedAt: Timestamp.fromDate(newArticle.updatedAt),
    };

    // Only include publishedAt if it exists, otherwise set to null
    if (newArticle.publishedAt) {
      firestoreData.publishedAt = Timestamp.fromDate(newArticle.publishedAt);
    } else {
      firestoreData.publishedAt = null;
    }

    await setDoc(docRef, firestoreData);

    return docRef.id;
  } catch (error) {
    console.error("Error in createArticle:", error);
    throw error;
  }
};

export const updateArticle = async (
  id: string,
  updates: Partial<Omit<Article, "id" | "createdAt">>
): Promise<void> => {
  const articleRef = doc(firestore, "articles", id);
  const currentDoc = await getDoc(articleRef);

  if (!currentDoc.exists()) {
    throw new Error("Article not found");
  }

  const currentData = currentDoc.data();

  // Prepare update data, filtering out undefined values
  const updatedData: any = {
    updatedAt: Timestamp.fromDate(new Date()),
    slug: updates.title ? generateSlug(updates.title) : currentData.slug,
  };

  // Only include defined fields from updates
  Object.keys(updates).forEach((key) => {
    if (updates[key as keyof typeof updates] !== undefined) {
      updatedData[key] = updates[key as keyof typeof updates];
    }
  });

  // Handle publishedAt specifically
  if (updates.status === "published" && currentData.status !== "published") {
    // When publishing for the first time, set publishedAt to current time
    // and ensure updatedAt is also current (since publishing is an update)
    const now = new Date();
    updatedData.publishedAt = Timestamp.fromDate(now);
    updatedData.updatedAt = Timestamp.fromDate(now);
  } else if (updates.publishedAt) {
    updatedData.publishedAt = Timestamp.fromDate(updates.publishedAt);
  } else if (updates.publishedAt === null) {
    updatedData.publishedAt = null;
  }

  await updateDoc(articleRef, updatedData);
};

export const deleteArticle = async (id: string): Promise<void> => {
  console.log(`🗑️ Starting article deletion: ${id}`);

  try {
    // Get article data before deletion to clean up files
    const articleRef = doc(firestore, "articles", id);
    console.log(`📄 Fetching article document: ${id}`);

    const articleDoc = await getDoc(articleRef);

    if (articleDoc.exists()) {
      const articleData = articleDoc.data();
      const userId = articleData.authorId;
      console.log(`📄 Article found - Author: ${userId}, Title: ${articleData.title}`);

      // Delete the article document from Firestore FIRST
      console.log(`🗑️ Deleting article document from Firestore: ${id}`);
      await deleteDoc(articleRef);
      console.log(`✅ Article document deleted from Firestore: ${id}`);

      // Verify deletion by checking if document still exists
      const verifyDoc = await getDoc(articleRef);
      if (verifyDoc.exists()) {
        throw new Error(`❌ Article document still exists after deletion: ${id}`);
      }
      console.log(`✅ Verified article document deletion: ${id}`);

      // Clean up entire article folder (new organized structure)
      if (userId) {
        try {
          console.log(`🗑️ Starting folder cleanup: articles/${userId}/${id}`);
          await deleteArticleFolder(userId, id);
          console.log(`✅ Deleted article folder: articles/${userId}/${id}`);
        } catch (error) {
          console.error(
            `⚠️ Failed to delete article folder: articles/${userId}/${id}`,
            error
          );

        // Log the folder deletion failure but continue
        console.log("⚠️ Article folder deletion failed, but article document was removed from database");
      }
    }

      console.log(`✅ Article deletion completed successfully: ${id}`);
    } else {
      console.log(`📄 Article document not found: ${id}`);
      // Try to delete the document reference anyway (in case it exists but data is corrupted)
      try {
        await deleteDoc(articleRef);
        console.log(`✅ Deleted empty article reference: ${id}`);
      } catch (error) {
        console.error(`⚠️ Failed to delete article reference: ${id}`, error);
      }
    }
  } catch (error) {
    console.error(`❌ Error during article deletion: ${id}`, error);
    throw error;
  }
};

// Hard delete - permanently removes article from database and all related data
export const hardDeleteArticle = async (id: string): Promise<void> => {
  const startTime = Date.now();
  console.log(`🗑️ Starting comprehensive deletion of article: ${id}`);

  try {
    // 1. Clean up all related data first (before deleting the article)
    const relatedDataStartTime = Date.now();
    await cleanupArticleRelatedData(id);
    const relatedDataTime = Date.now() - relatedDataStartTime;
    console.log(`✅ Related data cleanup completed in ${relatedDataTime}ms`);

    // 2. Delete the article document and files
    const articleDeleteStartTime = Date.now();
    await deleteArticle(id);
    const articleDeleteTime = Date.now() - articleDeleteStartTime;
    console.log(`✅ Article deletion completed in ${articleDeleteTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Successfully deleted article and all related data: ${id} (Total time: ${totalTime}ms)`);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error during comprehensive article deletion: ${id} (Failed after ${totalTime}ms)`, error);
    throw error;
  }
};

// Clean up all data related to an article across the entire application
export const cleanupArticleRelatedData = async (articleId: string): Promise<void> => {
  const startTime = Date.now();
  console.log(`🧹 Cleaning up related data for article: ${articleId}`);

  const cleanupPromises: Promise<void>[] = [];

  // Clean up saved articles (removes from all users' saved lists)
  cleanupPromises.push(
    (async () => {
      try {
        console.log(`🔍 Searching for saved article references for: ${articleId}`);
        const savedArticlesQuery = query(
          collection(firestore, "savedArticles"),
          where("articleId", "==", articleId)
        );
        const savedArticlesSnapshot = await getDocs(savedArticlesQuery);

        if (!savedArticlesSnapshot.empty) {
          console.log(`🗑️ Found ${savedArticlesSnapshot.docs.length} saved article references to delete`);

          // Log which users had this article saved (for debugging)
          const userIds = savedArticlesSnapshot.docs.map(doc => {
            const data = doc.data();
            return data.userId || 'unknown';
          });
          console.log(`👥 Users who had this article saved: ${userIds.join(', ')}`);

          const deletePromises = savedArticlesSnapshot.docs.map(async (docRef) => {
            try {
              await deleteDoc(docRef.ref);
              console.log(`✅ Removed saved article reference: ${docRef.id}`);
            } catch (error) {
              console.error(`❌ Failed to delete saved article reference: ${docRef.id}`, error);
            }
          });

          await Promise.all(deletePromises);
          console.log(`✅ Successfully deleted ${savedArticlesSnapshot.docs.length} saved article references`);
        } else {
          console.log(`📝 No saved article references found for: ${articleId}`);
        }
      } catch (error) {
        console.error("⚠️ Failed to clean up saved articles:", error);
      }
    })()
  );

  // Clean up share events
  cleanupPromises.push(
    (async () => {
      try {
        const shareEventsQuery = query(
          collection(firestore, "shareEvents"),
          where("articleId", "==", articleId)
        );
        const shareEventsSnapshot = await getDocs(shareEventsQuery);

        if (!shareEventsSnapshot.empty) {
          const deletePromises = shareEventsSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          console.log(`✅ Deleted ${shareEventsSnapshot.docs.length} share events`);
        }
      } catch (error) {
        console.error("⚠️ Failed to clean up share events:", error);
      }
    })()
  );

  // Clean up comments and replies
  cleanupPromises.push(
    (async () => {
      try {
        const commentsRef = collection(firestore, "articles", articleId, "comments");
        const commentsSnapshot = await getDocs(commentsRef);

        if (!commentsSnapshot.empty) {
          const deletePromises: Promise<void>[] = [];

          // Delete each comment and its replies
          for (const commentDoc of commentsSnapshot.docs) {
            // Delete replies first
            const repliesRef = collection(commentDoc.ref, "replies");
            const repliesSnapshot = await getDocs(repliesRef);

            if (!repliesSnapshot.empty) {
              repliesSnapshot.docs.forEach(replyDoc => {
                deletePromises.push(deleteDoc(replyDoc.ref));
              });
            }

            // Delete the comment
            deletePromises.push(deleteDoc(commentDoc.ref));
          }

          await Promise.all(deletePromises);
          console.log(`✅ Deleted ${commentsSnapshot.docs.length} comments and their replies`);
        }
      } catch (error) {
        console.error("⚠️ Failed to clean up comments:", error);
      }
    })()
  );

  // Wait for all cleanup operations to complete
  await Promise.all(cleanupPromises);
  const totalTime = Date.now() - startTime;
  console.log(`✅ Completed cleanup of related data for article: ${articleId} (Time: ${totalTime}ms)`);
};

// Soft delete - changes status to unpublished (for admin moderation)
export const softDeleteArticle = async (
  articleId: string,
  deletedBy: "admin",
  deletedByUserId: string,
  deleteReason?: string
): Promise<void> => {
  try {
    const articleRef = doc(firestore, "articles", articleId);
    await updateDoc(articleRef, {
      status: "unpublished", // Change to unpublished instead of deleted
      deletedAt: new Date(),
      deletedBy,
      deletedByUserId,
      deleteReason: deleteReason || "Article unpublished by administrator",
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error soft deleting article:", error);
    throw error;
  }
};

// Smart delete function that chooses between hard and soft delete
export const deleteArticleByRole = async (
  articleId: string,
  userRole: string,
  userId: string,
  authorId: string,
  authorRole?: string,
  deleteReason?: string
): Promise<void> => {
  console.log(`🗑️ deleteArticleByRole called: articleId=${articleId}, userRole=${userRole}, userId=${userId}, authorId=${authorId}, authorRole=${authorRole}`);

  // Get article data before deletion for notification purposes
  let articleData: any = null;
  try {
    const articleRef = doc(firestore, "articles", articleId);
    const articleDoc = await getDoc(articleRef);
    if (articleDoc.exists()) {
      articleData = articleDoc.data();
      console.log(`📄 Article data retrieved: ${articleData.title}`);
    } else {
      console.log(`⚠️ Article document not found: ${articleId}`);
    }
  } catch (error) {
    console.error("Error fetching article data for notification:", error);
  }

  // Self-deletion (hard delete) - NO NOTIFICATION
  if (userId === authorId) {
    console.log(`👤 Self-deletion detected - performing hard delete without notification`);
    await hardDeleteArticle(articleId);
    return;
  }

  // Admin deleting someone else's article - SEND NOTIFICATION
  if (userRole === "admin" && userId !== authorId) {
    console.log(`👨‍💼 Admin deleting other user's article - performing hard delete with notification`);

    // Perform the deletion first
    await hardDeleteArticle(articleId);

    // Send notification ONLY to InfoWriter authors
    if (articleData && authorRole === "infowriter") {
      try {
        console.log(`📧 Sending deletion notification to InfoWriter: ${authorId}`);
        const { createArticleDeletionNotification } = await import("./notifications");
        await createArticleDeletionNotification(
          authorId,
          articleData.title || "Untitled Article",
          deleteReason
        );
        console.log(`✅ Deletion notification sent successfully`);
      } catch (error) {
        console.error("Error sending article deletion notification:", error);
        // Don't throw error to avoid breaking the deletion process
      }
    } else {
      console.log(`📝 No notification sent - author is not InfoWriter or no article data`);
    }
    return;
  }

  // Admin deleting their own article - NO NOTIFICATION
  if (userRole === "admin") {
    console.log(`👨‍💼 Admin deleting own article - performing hard delete without notification`);
    await hardDeleteArticle(articleId);
    return;
  }

  throw new Error("Unauthorized deletion attempt");
};

// Debug function to test article deletion (for development/testing)
export const debugDeleteArticle = async (articleId: string): Promise<void> => {
  console.log(`🔧 DEBUG: Testing article deletion for: ${articleId}`);
  try {
    await hardDeleteArticle(articleId);
    console.log(`🔧 DEBUG: Article deletion test completed successfully`);
  } catch (error) {
    console.error(`🔧 DEBUG: Article deletion test failed:`, error);
    throw error;
  }
};

// Fix date inconsistencies in all articles (publishedAt should be <= updatedAt)
export const fixArticleDates = async (): Promise<void> => {
  console.log(`🔧 Starting article date fix process...`);

  try {
    // Get all articles
    const articlesQuery = query(collection(firestore, "articles"));
    const articlesSnapshot = await getDocs(articlesQuery);

    let fixedCount = 0;
    let totalCount = articlesSnapshot.docs.length;

    console.log(`📊 Found ${totalCount} articles to check`);

    for (const articleDoc of articlesSnapshot.docs) {
      const data = articleDoc.data();
      const articleId = articleDoc.id;

      // Convert timestamps to dates for comparison
      const publishedAt = data.publishedAt?.toDate();
      const updatedAt = data.updatedAt?.toDate();

      // Check if dates are inconsistent (publishedAt > updatedAt)
      if (publishedAt && updatedAt && publishedAt > updatedAt) {
        console.log(`🔧 Fixing dates for article: ${data.title} (${articleId})`);
        console.log(`   Before: publishedAt=${publishedAt.toISOString()}, updatedAt=${updatedAt.toISOString()}`);

        // Swap the dates: publishedAt should be the earlier date, updatedAt should be the later date
        const earlierDate = updatedAt; // This was actually when it was published
        const laterDate = publishedAt;  // This was actually when it was updated

        await updateDoc(doc(firestore, "articles", articleId), {
          publishedAt: Timestamp.fromDate(earlierDate),
          updatedAt: Timestamp.fromDate(laterDate),
        });

        console.log(`   After:  publishedAt=${earlierDate.toISOString()}, updatedAt=${laterDate.toISOString()}`);
        fixedCount++;
      }
    }

    console.log(`✅ Date fix completed: ${fixedCount} articles fixed out of ${totalCount} total`);
  } catch (error) {
    console.error(`❌ Error fixing article dates:`, error);
    throw error;
  }
};

// Make the fix function available globally for console access
if (typeof window !== 'undefined') {
  (window as any).fixArticleDates = fixArticleDates;
}

export const restoreArticle = async (
  articleId: string,
  newStatus: ArticleStatus = "unpublished"
): Promise<void> => {
  try {
    const articleRef = doc(firestore, "articles", articleId);
    await updateDoc(articleRef, {
      status: newStatus,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletedByUserId: null,
      deleteReason: null,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error restoring article:", error);
    throw error;
  }
};

export const getArticle = async (id: string): Promise<Article | null> => {
  const docRef = doc(firestore, "articles", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      publishedAt: data.publishedAt?.toDate(),
    } as Article;
  }

  return null;
};

export const getArticles = async (
  options: {
    status?: ArticleStatus;
    authorId?: string;
    categories?: string[];
    limit?: number;
  } = {}
): Promise<Article[]> => {
  let q = query(collection(firestore, "articles"));
  const filters = [];

  if (options.status) {
    filters.push(["status", "==", options.status]);
  }

  if (options.authorId) {
    filters.push(["authorId", "==", options.authorId]);
  }

  if (options.categories && options.categories.length > 0) {
    filters.push(["categories", "array-contains-any", options.categories]);
  }

  // Apply filters
  filters.forEach(([field, operator, value]) => {
    q = query(q, where(field as string, operator as any, value));
  });

  // For queries with authorId or status filter, we need to handle ordering differently
  // to avoid composite index requirements
  if (options.authorId || options.status) {
    // Don't add orderBy for filtered queries to avoid composite index requirement
    // We'll sort in memory instead
    if (options.limit) {
      q = query(q, limit(options.limit * 2)); // Get more to account for sorting
    }
  } else {
    // Only add orderBy when not filtering by authorId or status
    q = query(q, orderBy("updatedAt", "desc"));
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
  }

  const querySnapshot = await getDocs(q);
  let articles = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      publishedAt: data.publishedAt?.toDate(),
    } as Article;
  });

  // Sort in memory if we filtered by authorId or status
  if (options.authorId || options.status) {
    articles = articles.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    if (options.limit) {
      articles = articles.slice(0, options.limit);
    }
  }

  return articles;
};

export const getPublishedArticles = async (): Promise<Article[]> => {
  return getArticles({ status: "published" });
};

export const getUserArticles = async (authorId: string): Promise<Article[]> => {
  return getArticles({ authorId });
};

// Saved Articles Types and Functions
export interface SavedArticle {
  id: string;
  userId: string;
  articleId: string;
  savedAt: Date;
  articleTitle: string;
  articleAuthor: string;
}

export interface ShareEvent {
  id: string;
  articleId: string;
  userId?: string;
  shareMethod: "copy" | "twitter" | "facebook" | "linkedin" | "email";
  sharedAt: Date;
  userAgent?: string;
}

// Save article for user
export const saveArticle = async (
  userId: string,
  articleId: string,
  articleTitle: string,
  articleAuthor: string
): Promise<void> => {
  const savedArticleRef = doc(collection(firestore, "savedArticles"));
  const savedArticle: Omit<SavedArticle, "id"> = {
    userId,
    articleId,
    savedAt: new Date(),
    articleTitle,
    articleAuthor,
  };

  await setDoc(savedArticleRef, {
    ...savedArticle,
    savedAt: Timestamp.fromDate(savedArticle.savedAt),
  });
};

// Remove saved article
export const unsaveArticle = async (
  userId: string,
  articleId: string
): Promise<void> => {
  const q = query(
    collection(firestore, "savedArticles"),
    where("userId", "==", userId),
    where("articleId", "==", articleId)
  );

  const querySnapshot = await getDocs(q);
  const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};

// Check if article is saved by user
export const isArticleSaved = async (
  userId: string,
  articleId: string
): Promise<boolean> => {
  const q = query(
    collection(firestore, "savedArticles"),
    where("userId", "==", userId),
    where("articleId", "==", articleId)
  );

  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Get user's saved articles
export const getUserSavedArticles = async (
  userId: string
): Promise<SavedArticle[]> => {
  const q = query(
    collection(firestore, "savedArticles"),
    where("userId", "==", userId),
    orderBy("savedAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      savedAt: data.savedAt.toDate(),
    } as SavedArticle;
  });
};

// Record share event
export const recordShareEvent = async (
  articleId: string,
  shareMethod: ShareEvent["shareMethod"],
  userId?: string
): Promise<void> => {
  try {
    // Prepare share event data with proper null handling
    const shareEventData = {
      articleId: articleId,
      userId: userId || null, // Ensure null instead of undefined for Firestore
      shareMethod: shareMethod,
      sharedAt: Timestamp.now(), // Use Timestamp.now() directly
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    };

    // Create share event document
    const shareEventRef = doc(collection(firestore, "shareEvents"));
    await setDoc(shareEventRef, shareEventData);

    // Note: Share count is not updated on articles to avoid permission issues
    // Share events are tracked separately for analytics
  } catch (error) {
    // Don't throw error - sharing should still work even if analytics fail
    console.error("Failed to record share event:", error);
  }
};

// Share utility functions
export const shareToTwitter = (url: string, title: string): void => {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(title)}`;
  window.open(twitterUrl, "_blank", "width=600,height=400");
};

export const shareToFacebook = (url: string): void => {
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}`;
  window.open(facebookUrl, "_blank", "width=600,height=400");
};

export const shareToLinkedIn = (url: string, title: string): void => {
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url
  )}&title=${encodeURIComponent(title)}`;
  window.open(linkedinUrl, "_blank", "width=600,height=400");
};

export const shareViaEmail = (url: string, title: string): void => {
  const subject = encodeURIComponent(`Check out this article: ${title}`);
  const body = encodeURIComponent(
    `I thought you might find this article interesting:\n\n${title}\n\n${url}`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  }
};
