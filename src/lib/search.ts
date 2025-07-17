import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Article } from './articles';
import Fuse from 'fuse.js';

export interface SearchResult {
  id: string;
  query: string;
  userId: string;
  timestamp: Date;
  resultsCount: number;
}

export interface PopularTag {
  tag: string;
  count: number;
}

export interface PopularCategory {
  category: string;
  count: number;
}

export const trackSearch = async (
  userId: string,
  query: string,
  resultsCount: number
): Promise<void> => {
  try {
    const searchRef = doc(collection(firestore, 'searches'));
    await setDoc(searchRef, {
      userId,
      query: query.toLowerCase().trim(),
      resultsCount,
      timestamp: Timestamp.now()
    });

    // Update user's recent searches
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDocs(query(
      collection(firestore, 'users'),
      where('__name__', '==', userId)
    ));

    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      const recentSearches = userData.recentSearches || [];
      
      // Add new search to beginning, remove duplicates, limit to 10
      const updatedSearches = [query, ...recentSearches.filter((s: string) => s !== query)].slice(0, 10);
      
      await updateDoc(userRef, {
        recentSearches: updatedSearches
      });
    }
  } catch (error) {
    console.error('Error tracking search:', error);
    throw error;
  }
};

export const getRecentSearches = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDocs(query(
      collection(firestore, 'users'),
      where('__name__', '==', userId)
    ));

    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      return userData.recentSearches || [];
    }

    return [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

export const getPopularTags = async (limitCount: number = 10): Promise<PopularTag[]> => {
  try {
    const articlesQuery = query(
      collection(firestore, 'articles'),
      where('status', '==', 'published')
    );
    
    const snapshot = await getDocs(articlesQuery);
    const tagCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const article = doc.data() as Article;
      article.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting popular tags:', error);
    return [];
  }
};

export const getPopularCategories = async (limitCount: number = 8): Promise<PopularCategory[]> => {
  try {
    const articlesQuery = query(
      collection(firestore, 'articles'),
      where('status', '==', 'published')
    );
    
    const snapshot = await getDocs(articlesQuery);
    const categoryCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const article = doc.data() as Article;
      article.categories?.forEach(category => {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    });

    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting popular categories:', error);
    return [];
  }
};

export const getPopularArticles = async (limitCount: number = 10): Promise<Article[]> => {
  try {
    const articlesQuery = query(
      collection(firestore, 'articles'),
      where('status', '==', 'published'),
      orderBy('searchCount', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(articlesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        publishedAt: data.publishedAt?.toDate()
      } as Article;
    });
  } catch (error) {
    console.error('Error getting popular articles:', error);
    return [];
  }
};

export const incrementArticleSearchCount = async (articleId: string): Promise<void> => {
  try {
    const articleRef = doc(firestore, 'articles', articleId);
    await updateDoc(articleRef, {
      searchCount: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing search count:', error);
    // Don't throw error for this non-critical update
  }
};

export const searchArticles = async (
  query: string,
  userId?: string,
  categoryFilter?: string
): Promise<Article[]> => {
  try {
    let articlesQuery = query(
      collection(firestore, 'articles'),
      where('status', '==', 'published')
    );

    if (categoryFilter) {
      articlesQuery = query(
        collection(firestore, 'articles'),
        where('status', '==', 'published'),
        where('categories', 'array-contains', categoryFilter)
      );
    }

    const snapshot = await getDocs(articlesQuery);
    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        publishedAt: data.publishedAt?.toDate()
      } as Article;
    });

    // Use Fuse.js for fuzzy search
    const fuse = new Fuse(articles, {
      keys: ['title', 'content', 'excerpt', 'tags', 'categories'],
      threshold: 0.3,
      includeScore: true
    });

    const searchResults = fuse.search(query).map(result => result.item);

    // Track search if user is provided
    if (userId) {
      await trackSearch(userId, query, searchResults.length);
    }

    return searchResults;
  } catch (error) {
    console.error('Error searching articles:', error);
    throw error;
  }
};

// Real-time subscription for popular tags
export const subscribeToPopularTags = (
  callback: (tags: PopularTag[]) => void,
  limitCount: number = 10
): (() => void) => {
  const articlesQuery = query(
    collection(firestore, 'articles'),
    where('status', '==', 'published')
  );

  return onSnapshot(articlesQuery, (snapshot) => {
    const tagCounts = new Map<string, number>();

    snapshot.docs.forEach(doc => {
      const article = doc.data() as Article;
      article.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const popularTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);

    callback(popularTags);
  });
};