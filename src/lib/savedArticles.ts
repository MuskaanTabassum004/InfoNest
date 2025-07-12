import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Article } from './articles';

export interface SavedArticle {
  id: string;
  userId: string;
  articleId: string;
  articleTitle: string;
  articleExcerpt: string;
  articleAuthor: string;
  articleCategories: string[];
  articleTags: string[];
  savedAt: Date;
}

// Save an article for a user
export const saveArticle = async (userId: string, article: Article): Promise<void> => {
  try {
    const savedArticleRef = doc(firestore, 'savedArticles', `${userId}_${article.id}`);
    
    const savedArticleData = {
      id: `${userId}_${article.id}`,
      userId,
      articleId: article.id,
      articleTitle: article.title,
      articleExcerpt: article.excerpt || '',
      articleAuthor: article.authorName || 'Unknown',
      articleCategories: article.categories || [],
      articleTags: article.tags || [],
      savedAt: Timestamp.now(),
    };

    await setDoc(savedArticleRef, savedArticleData);
  } catch (error) {
    console.error('Error saving article:', error);
    throw new Error('Failed to save article');
  }
};

// Remove a saved article for a user
export const unsaveArticle = async (userId: string, articleId: string): Promise<void> => {
  try {
    const savedArticleRef = doc(firestore, 'savedArticles', `${userId}_${articleId}`);
    await deleteDoc(savedArticleRef);
  } catch (error) {
    console.error('Error removing saved article:', error);
    throw new Error('Failed to remove saved article');
  }
};

// Check if an article is saved by a user
export const isArticleSaved = async (userId: string, articleId: string): Promise<boolean> => {
  try {
    const savedArticleRef = doc(firestore, 'savedArticles', `${userId}_${articleId}`);
    const docSnap = await getDoc(savedArticleRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking if article is saved:', error);
    return false;
  }
};

// Get all saved articles for a user
export const getUserSavedArticles = async (userId: string): Promise<SavedArticle[]> => {
  try {
    const q = query(
      collection(firestore, 'savedArticles'),
      where('userId', '==', userId),
      orderBy('savedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        savedAt: data.savedAt.toDate(),
      } as SavedArticle;
    });
  } catch (error) {
    console.error('Error getting saved articles:', error);
    throw new Error('Failed to load saved articles');
  }
};

// Get count of saved articles for a user
export const getUserSavedArticlesCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(firestore, 'savedArticles'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting saved articles count:', error);
    return 0;
  }
};

// Real-time listener for user's saved articles count
export const subscribeToSavedArticlesCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  const q = query(
    collection(firestore, 'savedArticles'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error in saved articles count subscription:', error);
    callback(0);
  });
};

// Real-time listener for user's saved articles
export const subscribeToUserSavedArticles = (
  userId: string,
  callback: (articles: SavedArticle[]) => void
): (() => void) => {
  const q = query(
    collection(firestore, 'savedArticles'),
    where('userId', '==', userId),
    orderBy('savedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        savedAt: data.savedAt.toDate(),
      } as SavedArticle;
    });
    callback(articles);
  }, (error) => {
    console.error('Error in saved articles subscription:', error);
    callback([]);
  });
};
