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
  UserMinus,
  Loader2,
  AlertCircle,
  UserCheck,
  ExternalLink,
  Eye,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface ActiveWriter {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  profilePicture?: string;
  joinedAt: Date;
  articleCount: number;
  lastActive?: Date;
}

export const ActiveWritersPage: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [writers, setWriters] = useState<ActiveWriter[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null);
  const [selectedWriter, setSelectedWriter] = useState<ActiveWriter | null>(
    null
  );

  useEffect(() => {
    if (!userProfile || !isAdmin) return;

    const unsubscribes: (() => void)[] = [];

    // Listen to users with infowriter role
    const writersQuery = query(
      collection(firestore, "users"),
      where("role", "==", "infowriter")
    );

    const writersUnsubscribe = onSnapshot(writersQuery, async (snapshot) => {
      const activeWriters: ActiveWriter[] = [];

      // Get article counts for each writer
      const articlesQuery = query(collection(firestore, "articles"));
      const articlesUnsubscribe = onSnapshot(
        articlesQuery,
        (articlesSnapshot) => {
          const articleCounts: { [key: string]: number } = {};

          articlesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.author?.uid && data.status === "published") {
              articleCounts[data.author.uid] =
                (articleCounts[data.author.uid] || 0) + 1;
            }
          });

          snapshot.forEach((doc) => {
            const data = doc.data();
            activeWriters.push({
              id: doc.id,
              uid: data.uid || doc.id,
              displayName: data.displayName || "Unknown Writer",
              email: data.email || "",
              profilePicture: data.profilePicture,
              joinedAt: data.createdAt?.toDate() || new Date(),
              articleCount: articleCounts[data.uid || doc.id] || 0,
              lastActive: data.lastActive?.toDate(),
            });
          });

          // Sort by article count (descending), then by join date
          activeWriters.sort((a, b) => {
            if (a.articleCount !== b.articleCount) {
              return b.articleCount - a.articleCount;
            }
            return b.joinedAt.getTime() - a.joinedAt.getTime();
          });

          setWriters(activeWriters);
          setLoading(false);
        }
      );

      unsubscribes.push(articlesUnsubscribe);
    });

    unsubscribes.push(writersUnsubscribe);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [userProfile, isAdmin]);

  const handleRemovePrivileges = async (writer: ActiveWriter) => {
    if (!userProfile) return;

    setProcessingId(writer.id);
    try {
      const userRef = doc(firestore, "users", writer.id);

      // Store previous role for tracking
      const previousRoles = [writer.uid]; // Track that they were an infowriter

      // Update user role back to regular user
      await updateDoc(userRef, {
        role: "user",
        previousRoles: previousRoles,
        privilegesRemovedAt: serverTimestamp(),
        privilegesRemovedBy: userProfile.uid,
      });

      // Create notification for the user
      await addDoc(collection(firestore, "notifications"), {
        userId: writer.uid,
        type: "writer_privileges_removed",
        title: "InfoWriter Privileges Updated",
        message:
          "Your InfoWriter privileges have been updated by an administrator. Your existing articles remain published, but you can no longer create new articles. Contact support if you have questions.",
        read: false,
        createdAt: serverTimestamp(),
        actionUrl: "/profile",
      });

      toast.success(`InfoWriter privileges removed for ${writer.displayName}`);
      setConfirmRemoval(null);
    } catch (error) {
      console.error("Error removing writer privileges:", error);
      toast.error("Failed to remove writer privileges");
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading active writers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-8">
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
            Active InfoWriters
          </h1>
          <p className="text-gray-600">
            Manage users with InfoWriter privileges and their published content.
          </p>
        </div>

        {writers.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Active Writers
            </h3>
            <p className="text-gray-600">
              There are currently no users with InfoWriter privileges.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-green-600" />
                Active Writers ({writers.length})
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
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {writers.map((writer) => (
                    <tr key={writer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {writer.profilePicture ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={writer.profilePicture}
                                alt={writer.displayName}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
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
                          <FileText className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {writer.articleCount}
                          </span>
                          {writer.articleCount > 0 && (
                            <Link
                              to={`/author/${writer.uid}`}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              title="View articles"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {writer.joinedAt.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {confirmRemoval === writer.id ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRemovePrivileges(writer)}
                              disabled={processingId === writer.id}
                              className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                              {processingId === writer.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Confirm"
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmRemoval(null)}
                              className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedWriter(writer)}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                              title="View Writer Details"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => setConfirmRemoval(writer.id)}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-800"
                            >
                              <UserMinus className="h-4 w-4" />
                              <span>Remove Privileges</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Writer Details Modal */}
        {selectedWriter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Writer Details
                  </h3>
                  <button
                    onClick={() => setSelectedWriter(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Profile Section */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {selectedWriter.profilePicture ? (
                        <img
                          className="h-16 w-16 rounded-full object-cover"
                          src={selectedWriter.profilePicture}
                          alt={selectedWriter.displayName}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-8 w-8 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {selectedWriter.displayName}
                      </h4>
                      <p className="text-gray-600">{selectedWriter.email}</p>
                      <p className="text-sm text-gray-500">
                        ID: {selectedWriter.uid}
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                          <p className="text-2xl font-bold text-blue-900">
                            {selectedWriter.articleCount}
                          </p>
                          <p className="text-sm text-blue-600">
                            Published Articles
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm font-bold text-green-900">
                            {selectedWriter.joinedAt.toLocaleDateString()}
                          </p>
                          <p className="text-sm text-green-600">Member Since</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-4 pt-4 border-t">
                    {selectedWriter.articleCount > 0 && (
                      <Link
                        to={`/author/${selectedWriter.uid}`}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={() => setSelectedWriter(null)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View Articles</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setSelectedWriter(null);
                        setConfirmRemoval(selectedWriter.id);
                      }}
                      className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <UserMinus className="h-4 w-4" />
                      <span>Remove Privileges</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
