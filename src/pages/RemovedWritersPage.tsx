import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  onSnapshot,
  collection,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../lib/firebase";
import {
  User,
  Mail,
  Calendar,
  FileText,
  UserPlus,
  Loader2,
  AlertCircle,
  UserX,
  ExternalLink,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface RemovedWriter {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  profilePicture?: string;
  joinedAt: Date;
  removedAt: Date;
  removedBy: string;
  articleCount: number;
  lastActive?: Date;
  adminNote?: string;
}

export const RemovedWritersPage: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [removedWriters, setRemovedWriters] = useState<RemovedWriter[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile || !isAdmin) return;

    const unsubscribes: (() => void)[] = [];

    // Listen to users who previously had infowriter role but now don't
    const usersQuery = query(collection(firestore, "users"));

    const usersUnsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      const removedWritersList: RemovedWriter[] = [];

      // Get article counts for each removed writer
      const articlesQuery = query(collection(firestore, "articles"));
      const articlesUnsubscribe = onSnapshot(
        articlesQuery,
        (articlesSnapshot) => {
          const articleCounts: { [key: string]: number } = {};

          articlesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.author?.uid) {
              articleCounts[data.author.uid] =
                (articleCounts[data.author.uid] || 0) + 1;
            }
          });

          snapshot.forEach((doc) => {
            const data = doc.data();

            // Check if user previously had infowriter role but doesn't anymore
            if (
              data.previousRoles &&
              data.previousRoles.includes(data.uid || doc.id) &&
              data.role !== "infowriter" &&
              data.privilegesRemovedAt
            ) {
              removedWritersList.push({
                id: doc.id,
                uid: data.uid || doc.id,
                displayName: data.displayName || "Unknown Writer",
                email: data.email || "",
                profilePicture: data.profilePicture,
                joinedAt: data.createdAt?.toDate() || new Date(),
                removedAt: data.privilegesRemovedAt?.toDate() || new Date(),
                removedBy: data.privilegesRemovedBy || "Unknown",
                articleCount: data.articleCountAtRemoval || 0, // Use stored count from when privileges were removed
                lastActive: data.lastActive?.toDate(),
                adminNote: data.adminNote || "No reason provided",
              });
            }
          });

          // Sort by removal date (most recent first)
          removedWritersList.sort(
            (a, b) => b.removedAt.getTime() - a.removedAt.getTime()
          );

          setRemovedWriters(removedWritersList);
          setLoading(false);
        }
      );

      unsubscribes.push(articlesUnsubscribe);
    });

    unsubscribes.push(usersUnsubscribe);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [userProfile, isAdmin]);

  const handleRestorePrivileges = async (writer: RemovedWriter) => {
    if (!userProfile) {
      toast.error("You must be logged in to perform this action");
      return;
    }

    setProcessingId(writer.id);
    try {
      const userRef = doc(firestore, "users", writer.id);

      // Restore infowriter role
      await updateDoc(userRef, {
        role: "infowriter",
        privilegesRestoredAt: serverTimestamp(),
        privilegesRestoredBy: userProfile.uid,
        // Keep previousRoles for history but clear removal timestamps
        privilegesRemovedAt: null,
        privilegesRemovedBy: null,
      });

      // Create notification for the user
      await addDoc(collection(firestore, "notifications"), {
        userId: writer.uid,
        type: "writer_privileges_restored",
        title: "InfoWriter Privileges Restored! 🎉",
        message:
          `Your InfoWriter privileges have been restored by an administrator. You can now create and publish articles again. Note: ${writer.articleCount} previously deleted articles cannot be recovered.`,
        read: false,
        createdAt: serverTimestamp(),
        actionUrl: "/dashboard",
      });

      toast.success(`InfoWriter privileges restored for ${writer.displayName}. Note: ${writer.articleCount} previously deleted articles cannot be recovered.`);
      setConfirmRestore(null);
    } catch (error) {
      console.error("Error restoring writer privileges:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(`Failed to restore writer privileges: ${errorMessage}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading removed writers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/admin/dashboard"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Removed InfoWriters
          </h1>
          <p className="text-gray-600">
            Users who previously had InfoWriter privileges but have been demoted
            to regular users.
          </p>
        </div>

        {removedWriters.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Removed Writers
            </h3>
            <p className="text-gray-600">
              No InfoWriter privileges have been removed yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <UserX className="h-5 w-5 mr-2 text-red-600" />
                Removed Writers ({removedWriters.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Writer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Removed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {removedWriters.map((writer) => (
                    <tr key={writer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {writer.profilePicture ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover opacity-75"
                                src={writer.profilePicture}
                                alt={writer.displayName}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-red-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {writer.displayName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {writer.uid.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {writer.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {writer.articleCount}
                          </span>
                          <span className="ml-1 text-xs text-gray-500">
                            (deleted)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 truncate" title={writer.adminNote}>
                            {writer.adminNote}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {writer.removedAt.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {confirmRestore === writer.id ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRestorePrivileges(writer)}
                              disabled={processingId === writer.id}
                              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                            >
                              {processingId === writer.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Confirm"
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmRestore(null)}
                              className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRestore(writer.id)}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-800"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Restore Privileges</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
