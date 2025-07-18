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

export type ArticleStatus = "draft" | "published" | "unpublished" | "deleted";

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
  attachments?: string[];
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
  const docRef = doc(collection(firestore, "articles"));
  const slug = generateSlug(article.title);

  const newArticle: Article = {
    ...article,
    id: docRef.id,
    slug,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(docRef, {
    ...newArticle,
    createdAt: Timestamp.fromDate(newArticle.createdAt),
    updatedAt: Timestamp.fromDate(newArticle.updatedAt),
    publishedAt: newArticle.publishedAt
      ? Timestamp.fromDate(newArticle.publishedAt)
      : null,
  });

  return docRef.id;
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

  const updatedData = {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
    slug: updates.title ? generateSlug(updates.title) : currentData.slug,
  };

  if (updates.status === "published" && currentData.status !== "published") {
    updatedData.publishedAt = Timestamp.fromDate(new Date());
  }

  await updateDoc(articleRef, updatedData);
};

export const deleteArticle = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, "articles", id));
};

export const softDeleteArticle = async (
  articleId: string,
  deletedBy: "admin" | "infowriter",
  deletedByUserId: string,
  deleteReason?: string
): Promise<void> => {
  try {
    const articleRef = doc(firestore, "articles", articleId);
    await updateDoc(articleRef, {
      status: "deleted",
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
      deletedByUserId,
      deleteReason: deleteReason || "",
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error soft deleting article:", error);
    throw error;
  }
};

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
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
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
  const shareEventRef = doc(collection(firestore, "shareEvents"));
  const shareEvent: Omit<ShareEvent, "id"> = {
    articleId,
    userId,
    shareMethod,
    sharedAt: new Date(),
    userAgent: navigator.userAgent,
  };

  await setDoc(shareEventRef, {
    ...shareEvent,
    sharedAt: Timestamp.fromDate(shareEvent.sharedAt),
  });

  // Update article share count
  const articleRef = doc(firestore, "articles", articleId);
  await updateDoc(articleRef, {
    shareCount: increment(1),
  });
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
