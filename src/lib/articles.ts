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
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from './firebase';

export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  status: ArticleStatus;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  coverImage?: string;
  categories: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  version: number;
  slug: string;
  searchCount: number;
  viewCount: number;
  attachments: string[];
  adminNote?: string;
  deletedBy?: string;
  deletedAt?: Date;
}

export interface ArticleVersion {
  id: string;
  articleId: string;
  content: string;
  version: number;
  createdAt: Date;
  createdBy: string;
}

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const createArticle = async (
  article: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'slug'>
): Promise<string> => {
  const docRef = doc(collection(firestore, 'articles'));
  const slug = generateSlug(article.title);
  
  const newArticle: Article = {
    ...article,
    id: docRef.id,
    slug,
    version: 1,
    searchCount: 0,
    viewCount: 0,
    attachments: article.attachments || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await setDoc(docRef, {
    ...newArticle,
    createdAt: Timestamp.fromDate(newArticle.createdAt),
    updatedAt: Timestamp.fromDate(newArticle.updatedAt),
    publishedAt: newArticle.publishedAt ? Timestamp.fromDate(newArticle.publishedAt) : null
  });

  // Create initial version
  await saveArticleVersion(docRef.id, article.content, 1, article.authorId);

  return docRef.id;
};

export const updateArticle = async (
  id: string,
  updates: Partial<Omit<Article, 'id' | 'createdAt' | 'version'>>
): Promise<void> => {
  const articleRef = doc(firestore, 'articles', id);
  const currentDoc = await getDoc(articleRef);
  
  if (!currentDoc.exists()) {
    throw new Error('Article not found');
  }

  const currentData = currentDoc.data();
  const newVersion = currentData.version + 1;

  const updatedData = {
    ...updates,
    version: newVersion,
    updatedAt: Timestamp.fromDate(new Date()),
    slug: updates.title ? generateSlug(updates.title) : currentData.slug
  };

  if (updates.status === 'published' && currentData.status !== 'published') {
    updatedData.publishedAt = Timestamp.fromDate(new Date());
  }

  await updateDoc(articleRef, updatedData);

  // Save version if content changed
  if (updates.content && updates.content !== currentData.content) {
    await saveArticleVersion(id, updates.content, newVersion, currentData.authorId);
  }
};

export const deleteArticle = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, 'articles', id));
  
  // Clean up versions
  const versionsQuery = query(
    collection(firestore, 'articleVersions'),
    where('articleId', '==', id)
  );
  const versionsSnapshot = await getDocs(versionsQuery);
  
  const deletePromises = versionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};

export const getArticle = async (id: string): Promise<Article | null> => {
  const docRef = doc(firestore, 'articles', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      publishedAt: data.publishedAt?.toDate()
    } as Article;
  }
  
  return null;
};

export const getArticles = async (options: {
  status?: ArticleStatus;
  authorId?: string;
  categories?: string[];
  limit?: number;
} = {}): Promise<Article[]> => {
  let q = query(collection(firestore, 'articles'));
  const filters = [];

  if (options.status) {
    filters.push(['status', '==', options.status]);
  }

  if (options.authorId) {
    filters.push(['authorId', '==', options.authorId]);
  }

  if (options.categories && options.categories.length > 0) {
    filters.push(['categories', 'array-contains-any', options.categories]);
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
    q = query(q, orderBy('updatedAt', 'desc'));
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
  }

  const querySnapshot = await getDocs(q);
  let articles = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      publishedAt: data.publishedAt?.toDate()
    } as Article;
  });

  // Sort in memory if we filtered by authorId or status
  if (options.authorId || options.status) {
    articles = articles.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    if (options.limit) {
      articles = articles.slice(0, options.limit);
    }
  }

  return articles;
};

export const getPublishedArticles = async (): Promise<Article[]> => {
  return getArticles({ status: 'published' });
};

export const getUserArticles = async (authorId: string): Promise<Article[]> => {
  return getArticles({ authorId });
};

const saveArticleVersion = async (
  articleId: string,
  content: string,
  version: number,
  createdBy: string
): Promise<void> => {
  const versionRef = doc(collection(firestore, 'articleVersions'));
  
  const articleVersion: Omit<ArticleVersion, 'id'> = {
    articleId,
    content,
    version,
    createdAt: new Date(),
    createdBy
  };

  await setDoc(versionRef, {
    ...articleVersion,
    createdAt: Timestamp.fromDate(articleVersion.createdAt)
  });
};

export const getArticleVersions = async (articleId: string): Promise<ArticleVersion[]> => {
  const q = query(
    collection(firestore, 'articleVersions'),
    where('articleId', '==', articleId),
    orderBy('version', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate()
    } as ArticleVersion;
  });
};

export const uploadCoverImage = async (
  file: File,
  articleId: string,
  userId: string
): Promise<string> => {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image must be less than 5MB');
    }

    // Upload to Firebase Storage
    const imageRef = ref(storage, `articles/${articleId}/cover-image`);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading cover image:', error);
    throw error;
  }
};

export const addAttachment = async (
  file: File,
  articleId: string,
  userId: string
): Promise<string> => {
  try {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File must be less than 10MB');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${extension}`;

    // Upload to Firebase Storage
    const fileRef = ref(storage, `articles/${articleId}/attachments/${fileName}`);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
};

export const incrementViewCount = async (articleId: string): Promise<void> => {
  try {
    const articleRef = doc(firestore, 'articles', articleId);
    await updateDoc(articleRef, {
      viewCount: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    // Don't throw error for this non-critical update
  }
};