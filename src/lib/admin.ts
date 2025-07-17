import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { firestore } from './firebase';
import { updateUserRole, UserProfile } from './auth';
import { updateArticle, Article } from './articles';
import { notifyInfoWriterApproval, notifyInfoWriterRejection, notifyArticleDeleted } from './notifications';
import { sendMessage } from './messaging';

export interface InfoWriterStats {
  uid: string;
  displayName: string;
  email: string;
  profilePicture?: string;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  joinedDate: Date;
  lastActive: Date;
}

export const getAllInfoWriters = async (): Promise<InfoWriterStats[]> => {
  try {
    const infoWritersQuery = query(
      collection(firestore, 'users'),
      where('role', '==', 'infowriter')
    );

    const snapshot = await getDocs(infoWritersQuery);
    const infoWriters: InfoWriterStats[] = [];

    for (const doc of snapshot.docs) {
      const userData = doc.data() as UserProfile;
      
      // Get article stats for this InfoWriter
      const articlesQuery = query(
        collection(firestore, 'articles'),
        where('authorId', '==', userData.uid)
      );
      
      const articlesSnapshot = await getDocs(articlesQuery);
      const articles = articlesSnapshot.docs.map(doc => doc.data() as Article);
      
      const totalArticles = articles.length;
      const publishedArticles = articles.filter(a => a.status === 'published').length;
      const draftArticles = articles.filter(a => a.status === 'draft').length;

      infoWriters.push({
        uid: userData.uid,
        displayName: userData.displayName,
        email: userData.email,
        profilePicture: userData.profilePicture,
        totalArticles,
        publishedArticles,
        draftArticles,
        joinedDate: userData.createdAt,
        lastActive: userData.lastActive || userData.updatedAt
      });
    }

    return infoWriters.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  } catch (error) {
    console.error('Error getting all InfoWriters:', error);
    throw error;
  }
};

export const getInfoWriterStats = async (userId: string): Promise<InfoWriterStats | null> => {
  try {
    const userDoc = await getDocs(query(
      collection(firestore, 'users'),
      where('__name__', '==', userId)
    ));

    if (userDoc.empty) return null;

    const userData = userDoc.docs[0].data() as UserProfile;
    
    // Get article stats
    const articlesQuery = query(
      collection(firestore, 'articles'),
      where('authorId', '==', userId)
    );
    
    const articlesSnapshot = await getDocs(articlesQuery);
    const articles = articlesSnapshot.docs.map(doc => doc.data() as Article);
    
    const totalArticles = articles.length;
    const publishedArticles = articles.filter(a => a.status === 'published').length;
    const draftArticles = articles.filter(a => a.status === 'draft').length;

    return {
      uid: userData.uid,
      displayName: userData.displayName,
      email: userData.email,
      profilePicture: userData.profilePicture,
      totalArticles,
      publishedArticles,
      draftArticles,
      joinedDate: userData.createdAt,
      lastActive: userData.lastActive || userData.updatedAt
    };
  } catch (error) {
    console.error('Error getting InfoWriter stats:', error);
    throw error;
  }
};

export const removeInfoWriterAccess = async (
  userId: string,
  adminId: string,
  reason?: string
): Promise<void> => {
  try {
    // Update user role to 'user'
    await updateUserRole(userId, 'user');

    // Send notification about role change
    await notifyInfoWriterRejection(userId, reason || 'Your InfoWriter access has been revoked.');

    // Optionally send a message
    if (reason) {
      await sendMessage(
        adminId,
        userId,
        `Your InfoWriter access has been revoked. Reason: ${reason}`,
        'Admin',
        undefined
      );
    }
  } catch (error) {
    console.error('Error removing InfoWriter access:', error);
    throw error;
  }
};

export const deleteArticleAsAdmin = async (
  articleId: string,
  adminNote: string,
  adminId: string
): Promise<void> => {
  try {
    // Get article details first
    const articleDoc = await getDocs(query(
      collection(firestore, 'articles'),
      where('__name__', '==', articleId)
    ));

    if (articleDoc.empty) {
      throw new Error('Article not found');
    }

    const article = articleDoc.docs[0].data() as Article;

    // Update article status to 'deleted' instead of actually deleting
    await updateArticle(articleId, {
      status: 'deleted' as any,
      adminNote,
      deletedBy: adminId,
      deletedAt: new Date()
    });

    // Notify the author
    await notifyArticleDeleted(article.authorId, article.title, adminNote);

    // Send a message to the author
    await sendMessage(
      adminId,
      article.authorId,
      `Your article "${article.title}" has been removed. Reason: ${adminNote}`,
      'Admin',
      undefined,
      articleId
    );
  } catch (error) {
    console.error('Error deleting article as admin:', error);
    throw error;
  }
};

export const approveInfoWriterRequest = async (
  requestId: string,
  userId: string,
  adminId: string,
  adminNote?: string
): Promise<void> => {
  try {
    // Update user role
    await updateUserRole(userId, 'infowriter');

    // Update request status
    const requestRef = doc(firestore, 'writerRequests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      processedAt: Timestamp.now(),
      processedBy: adminId,
      adminNotes: adminNote || ''
    });

    // Send approval notification
    await notifyInfoWriterApproval(userId);

    // Send congratulatory message
    await sendMessage(
      adminId,
      userId,
      `Congratulations! Your InfoWriter request has been approved. ${adminNote || 'Welcome to the InfoWriter team!'}`,
      'Admin',
      undefined
    );
  } catch (error) {
    console.error('Error approving InfoWriter request:', error);
    throw error;
  }
};

export const rejectInfoWriterRequest = async (
  requestId: string,
  userId: string,
  adminId: string,
  adminNote?: string
): Promise<void> => {
  try {
    // Update request status
    const requestRef = doc(firestore, 'writerRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      processedAt: Timestamp.now(),
      processedBy: adminId,
      adminNotes: adminNote || ''
    });

    // Send rejection notification
    await notifyInfoWriterRejection(userId, adminNote);

    // Send message with feedback
    if (adminNote) {
      await sendMessage(
        adminId,
        userId,
        `Your InfoWriter request was not approved. Feedback: ${adminNote}`,
        'Admin',
        undefined
      );
    }
  } catch (error) {
    console.error('Error rejecting InfoWriter request:', error);
    throw error;
  }
};

export const sendAdminMessage = async (
  adminId: string,
  toUserId: string,
  message: string,
  articleId?: string
): Promise<void> => {
  try {
    await sendMessage(
      adminId,
      toUserId,
      message,
      'Admin',
      undefined,
      articleId
    );
  } catch (error) {
    console.error('Error sending admin message:', error);
    throw error;
  }
};

export const getAllArticlesForAdmin = async (): Promise<Article[]> => {
  try {
    const articlesQuery = query(
      collection(firestore, 'articles'),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(articlesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        publishedAt: data.publishedAt?.toDate(),
        deletedAt: data.deletedAt?.toDate()
      } as Article;
    });
  } catch (error) {
    console.error('Error getting all articles for admin:', error);
    throw error;
  }
};

export const getSystemStats = async () => {
  try {
    // Get total users
    const usersSnapshot = await getDocs(collection(firestore, 'users'));
    const totalUsers = usersSnapshot.size;

    // Get InfoWriters count
    const infoWritersSnapshot = await getDocs(query(
      collection(firestore, 'users'),
      where('role', '==', 'infowriter')
    ));
    const totalInfoWriters = infoWritersSnapshot.size;

    // Get articles count
    const articlesSnapshot = await getDocs(collection(firestore, 'articles'));
    const totalArticles = articlesSnapshot.size;

    // Get published articles count
    const publishedSnapshot = await getDocs(query(
      collection(firestore, 'articles'),
      where('status', '==', 'published')
    ));
    const publishedArticles = publishedSnapshot.size;

    // Get pending requests count
    const pendingSnapshot = await getDocs(query(
      collection(firestore, 'writerRequests'),
      where('status', '==', 'pending')
    ));
    const pendingRequests = pendingSnapshot.size;

    return {
      totalUsers,
      totalInfoWriters,
      totalArticles,
      publishedArticles,
      pendingRequests
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
};