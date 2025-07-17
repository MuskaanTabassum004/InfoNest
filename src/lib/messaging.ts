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
  onSnapshot,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { firestore } from './firebase';

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  articleId?: string;
  message: string;
  timestamp: Date;
  read: boolean;
  threadId: string;
  fromUserName: string;
  fromUserProfilePicture?: string;
}

export interface Conversation {
  threadId: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  articleId?: string;
  articleTitle?: string;
}

export const generateThreadId = (userId1: string, userId2: string, articleId?: string): string => {
  const sortedUsers = [userId1, userId2].sort();
  const base = `${sortedUsers[0]}_${sortedUsers[1]}`;
  return articleId ? `${base}_${articleId}` : base;
};

export const sendMessage = async (
  fromUserId: string,
  toUserId: string,
  message: string,
  fromUserName: string,
  fromUserProfilePicture?: string,
  articleId?: string
): Promise<void> => {
  try {
    const threadId = generateThreadId(fromUserId, toUserId, articleId);
    
    const messageRef = doc(collection(firestore, 'messages'));
    await setDoc(messageRef, {
      fromUserId,
      toUserId,
      articleId,
      message: message.trim(),
      timestamp: Timestamp.now(),
      read: false,
      threadId,
      fromUserName,
      fromUserProfilePicture
    });

    // Update or create conversation thread
    const conversationRef = doc(firestore, 'conversations', threadId);
    await setDoc(conversationRef, {
      participants: [fromUserId, toUserId],
      lastMessage: message.trim(),
      lastMessageTime: Timestamp.now(),
      articleId,
      updatedAt: Timestamp.now()
    }, { merge: true });

  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getMessages = async (threadId: string): Promise<Message[]> => {
  try {
    const messagesQuery = query(
      collection(firestore, 'messages'),
      where('threadId', '==', threadId),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(messagesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as Message;
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

export const getConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    const conversationsQuery = query(
      collection(firestore, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    const snapshot = await getDocs(conversationsQuery);
    const conversations: Conversation[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get unread count for this user
      const unreadQuery = query(
        collection(firestore, 'messages'),
        where('threadId', '==', doc.id),
        where('toUserId', '==', userId),
        where('read', '==', false)
      );
      
      const unreadSnapshot = await getDocs(unreadQuery);
      
      conversations.push({
        threadId: doc.id,
        participants: data.participants,
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime.toDate(),
        unreadCount: unreadSnapshot.size,
        articleId: data.articleId,
        articleTitle: data.articleTitle
      });
    }

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

export const markMessagesAsRead = async (threadId: string, userId: string): Promise<void> => {
  try {
    const messagesQuery = query(
      collection(firestore, 'messages'),
      where('threadId', '==', threadId),
      where('toUserId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(messagesQuery);
    
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

export const subscribeToMessages = (
  threadId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesQuery = query(
    collection(firestore, 'messages'),
    where('threadId', '==', threadId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as Message;
    });

    callback(messages);
  });
};

export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
): (() => void) => {
  const conversationsQuery = query(
    collection(firestore, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );

  return onSnapshot(conversationsQuery, async (snapshot) => {
    const conversations: Conversation[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get unread count for this user
      const unreadQuery = query(
        collection(firestore, 'messages'),
        where('threadId', '==', doc.id),
        where('toUserId', '==', userId),
        where('read', '==', false)
      );
      
      const unreadSnapshot = await getDocs(unreadQuery);
      
      conversations.push({
        threadId: doc.id,
        participants: data.participants,
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime.toDate(),
        unreadCount: unreadSnapshot.size,
        articleId: data.articleId,
        articleTitle: data.articleTitle
      });
    }

    callback(conversations);
  });
};

export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const unreadQuery = query(
      collection(firestore, 'messages'),
      where('toUserId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(unreadQuery);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
};

export const subscribeToUnreadCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  const unreadQuery = query(
    collection(firestore, 'messages'),
    where('toUserId', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(unreadQuery, (snapshot) => {
    callback(snapshot.size);
  });
};