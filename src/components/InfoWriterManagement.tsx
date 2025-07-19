import React, { useState, useEffect } from "react";
import {
  getInfoWriters,
  removeInfoWriterStatus,
  UserProfile,
} from "../lib/auth";
import { getUserArticles } from "../lib/articles";
import {
  Users,
  Search,
  UserMinus,
  Eye,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Mail,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface InfoWriterManagementProps {
  onInfoWriterRemoved?: (removedWriter: UserProfile) => void;
}

export const InfoWriterManagement: React.FC<InfoWriterManagementProps> = ({
  onInfoWriterRemoved,
}) => {
  const [infoWriters, setInfoWriters] = useState<UserProfile[]>([]);
  const [filteredWriters, setFilteredWriters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWriter, setSelectedWriter] = useState<UserProfile | null>(
    null
  );
  const [writerArticleCounts, setWriterArticleCounts] = useState<
    Record<string, number>
  >({});
  const [removingWriter, setRemovingWriter] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadInfoWriters();
  }, []);

  useEffect(() => {
    filterWriters();
  }, [infoWriters, searchQuery]);

  const loadInfoWriters = async () => {
    setLoading(true);
    try {
      const writers = await getInfoWriters();
      setInfoWriters(writers);

      // Load article counts for each writer
      const counts: Record<string, number> = {};
      await Promise.all(
        writers.map(async (writer) => {
          try {
            const articles = await getUserArticles(writer.uid);
            counts[writer.uid] = articles.length;
          } catch (error) {
            counts[writer.uid] = 0;
          }
        })
      );
      setWriterArticleCounts(counts);
    } catch (error) {
      toast.error("Error loading InfoWriters");
    } finally {
      setLoading(false);
    }
  };

  const filterWriters = () => {
    let filtered = infoWriters;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (writer) =>
          writer.displayName?.toLowerCase().includes(query) ||
          writer.email.toLowerCase().includes(query)
      );
    }

    setFilteredWriters(filtered);
  };

  const handleRemoveWriter = async (uid: string) => {
    setRemovingWriter(uid);
    try {
      const removedWriter = infoWriters.find((writer) => writer.uid === uid);
      await removeInfoWriterStatus(uid);
      setInfoWriters((prev) => prev.filter((writer) => writer.uid !== uid));

      // Notify parent component about the removal
      if (removedWriter && onInfoWriterRemoved) {
        onInfoWriterRemoved(removedWriter);
      }

      toast.success("InfoWriter status removed successfully");
    } catch (error) {
      toast.error("Error removing InfoWriter status");
    } finally {
      setRemovingWriter(null);
      setShowRemoveConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            InfoWriter Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage active InfoWriters and their permissions
          </p>
        </div>
        <div className="bg-blue-100 px-4 py-2 rounded-lg">
          <span className="text-blue-800 font-medium">
            {infoWriters.length} Active InfoWriter
            {infoWriters.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search InfoWriters by name or email..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* InfoWriters List */}
      {filteredWriters.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? "No InfoWriters found" : "No InfoWriters yet"}
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? "Try adjusting your search criteria."
              : "InfoWriters will appear here once their applications are approved."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWriters.map((writer) => (
            <div
              key={writer.uid}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-200 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {writer.displayName || "User"}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {writer.email}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-gray-900">
                    {writerArticleCounts[writer.uid] || 0}
                  </p>
                  <p className="text-xs text-gray-600">Articles</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDistanceToNow(writer.createdAt)}
                  </p>
                  <p className="text-xs text-gray-600">Member since</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedWriter(writer)}
                  className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => setShowRemoveConfirm(writer.uid)}
                  className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <UserMinus className="h-4 w-4" />
                  <span>Remove Status</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Remove InfoWriter Status
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to remove InfoWriter status from this user?
              They will lose access to article creation and management features.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveWriter(showRemoveConfirm)}
                disabled={removingWriter === showRemoveConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {removingWriter === showRemoveConfirm
                  ? "Removing..."
                  : "Remove Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Writer Details Modal */}
      {selectedWriter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                InfoWriter Details
              </h3>
              <button
                onClick={() => setSelectedWriter(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <p className="text-gray-900">
                    {selectedWriter.displayName || "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{selectedWriter.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {selectedWriter.role}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Articles Created
                  </label>
                  <p className="text-gray-900">
                    {writerArticleCounts[selectedWriter.uid] || 0}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member Since
                  </label>
                  <p className="text-gray-900">
                    {selectedWriter.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {formatDistanceToNow(selectedWriter.updatedAt)} ago
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedWriter(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowRemoveConfirm(selectedWriter.uid);
                    setSelectedWriter(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove InfoWriter Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
