// src/lib/comments.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  where,
  increment,
} from "firebase/firestore";
import { firestore } from "./firebase";

export interface Reply {
  id: string;
  commentId: string;
  articleId: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  replyCount: number;
  replies?: Reply[];
}

// Create a new comment
export const createComment = async (
  articleId: string,
  userId: string,
  userName: string,
  userProfilePicture: string | undefined,
  content: string
): Promise<string> => {
  try {
    const commentsRef = collection(firestore, "articles", articleId, "comments");
    const now = new Date();
    const newComment = {
      articleId,
      userId,
      userName,
      userProfilePicture: userProfilePicture || null,
      content: content.trim(),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      replyCount: 0,
    };

    console.log("Creating comment with data:", newComment);
    const docRef = await addDoc(commentsRef, newComment);
    console.log("Comment created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
};

// Create a reply to a comment
export const createReply = async (
  articleId: string,
  commentId: string,
  userId: string,
  userName: string,
  userProfilePicture: string | undefined,
  content: string
): Promise<string> => {
  try {
    const repliesRef = collection(
      firestore,
      "articles",
      articleId,
      "comments",
      commentId,
      "replies"
    );
    
    const newReply = {
      commentId,
      articleId,
      userId,
      userName,
      userProfilePicture: userProfilePicture || null,
      content: content.trim(),
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(repliesRef, newReply);

    // Increment reply count on the parent comment
    const commentRef = doc(firestore, "articles", articleId, "comments", commentId);
    await updateDoc(commentRef, {
      replyCount: increment(1),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating reply:", error);
    throw error;
  }
};

// Get all comments for an article
export const getComments = async (articleId: string): Promise<Comment[]> => {
  try {
    const commentsRef = collection(firestore, "articles", articleId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const comments: Comment[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      comments.push({
        id: docSnap.id,
        articleId: data.articleId,
        userId: data.userId,
        userName: data.userName,
        userProfilePicture: data.userProfilePicture,
        content: data.content,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        replyCount: data.replyCount || 0,
      });
    }

    return comments;
  } catch (error) {
    console.error("Error getting comments:", error);
    throw error;
  }
};

// Get replies for a specific comment
export const getReplies = async (
  articleId: string,
  commentId: string
): Promise<Reply[]> => {
  try {
    const repliesRef = collection(
      firestore,
      "articles",
      articleId,
      "comments",
      commentId,
      "replies"
    );
    const q = query(repliesRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const replies: Reply[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      replies.push({
        id: docSnap.id,
        commentId: data.commentId,
        articleId: data.articleId,
        userId: data.userId,
        userName: data.userName,
        userProfilePicture: data.userProfilePicture,
        content: data.content,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      });
    });

    return replies;
  } catch (error) {
    console.error("Error getting replies:", error);
    throw error;
  }
};

// Delete a comment
export const deleteComment = async (
  articleId: string,
  commentId: string
): Promise<void> => {
  try {
    // Delete all replies first
    const repliesRef = collection(
      firestore,
      "articles",
      articleId,
      "comments",
      commentId,
      "replies"
    );
    const repliesSnapshot = await getDocs(repliesRef);
    
    const deletePromises = repliesSnapshot.docs.map((replyDoc) =>
      deleteDoc(replyDoc.ref)
    );
    await Promise.all(deletePromises);

    // Delete the comment
    const commentRef = doc(firestore, "articles", articleId, "comments", commentId);
    await deleteDoc(commentRef);
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

// Delete a reply
export const deleteReply = async (
  articleId: string,
  commentId: string,
  replyId: string
): Promise<void> => {
  try {
    const replyRef = doc(
      firestore,
      "articles",
      articleId,
      "comments",
      commentId,
      "replies",
      replyId
    );
    await deleteDoc(replyRef);

    // Decrement reply count on the parent comment
    const commentRef = doc(firestore, "articles", articleId, "comments", commentId);
    await updateDoc(commentRef, {
      replyCount: increment(-1),
    });
  } catch (error) {
    console.error("Error deleting reply:", error);
    throw error;
  }
};

// Real-time listener for comments
export const subscribeToComments = (
  articleId: string,
  callback: (comments: Comment[]) => void
): (() => void) => {
  const commentsRef = collection(firestore, "articles", articleId, "comments");
  const q = query(commentsRef, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    console.log("Comments snapshot received:", snapshot.docs.length, "comments");
    const comments: Comment[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      comments.push({
        id: docSnap.id,
        articleId: data.articleId,
        userId: data.userId,
        userName: data.userName,
        userProfilePicture: data.userProfilePicture,
        content: data.content,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        replyCount: data.replyCount || 0,
      });
    });
    callback(comments);
  }, (error) => {
    console.error("Error in comments subscription:", error);
  });
};

// Real-time listener for replies
export const subscribeToReplies = (
  articleId: string,
  commentId: string,
  callback: (replies: Reply[]) => void
): (() => void) => {
  const repliesRef = collection(
    firestore,
    "articles",
    articleId,
    "comments",
    commentId,
    "replies"
  );
  const q = query(repliesRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (snapshot) => {
    const replies: Reply[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      replies.push({
        id: docSnap.id,
        commentId: data.commentId,
        articleId: data.articleId,
        userId: data.userId,
        userName: data.userName,
        userProfilePicture: data.userProfilePicture,
        content: data.content,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      });
    });
    callback(replies);
  });
};
