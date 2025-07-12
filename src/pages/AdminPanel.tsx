import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  getPendingWriterRequests,
  approveWriterRequest,
  denyWriterRequest,
  getInfoWriters,
  UserProfile,
} from "../lib/auth";
import {
  getPublishedArticles,
  getUserArticles,
  Article,
} from "../lib/articles";
import { WriterRequestsAdmin } from "../components/WriterRequestsAdmin";
import { InfoWriterManagement } from "../components/InfoWriterManagement";
import { RoleManagement } from "../components/RoleManagement";

import {
  Shield,
  Users,
  BookOpen,
  Clock,
  Check,
  X,
  Calendar,
  TrendingUp,
  AlertCircle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

export const AdminPanel: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<UserProfile[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [activeInfoWriters, setActiveInfoWriters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(
    null
  );
  const [recentlyApprovedCount, setRecentlyApprovedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "writer-requests"
    | "infowriter-management"
    | "role-management"
    | "legacy-requests"
  >("overview");

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  // Refresh data every 30 seconds for real-time updates
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(() => {
      loadAdminData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [requests, articles, infoWriters] = await Promise.all([
        getPendingWriterRequests(),
        getPublishedArticles(),
        getInfoWriters(),
      ]);

      setPendingRequests(requests);
      setAllArticles(articles);
      setActiveInfoWriters(infoWriters);

      // Calculate InfoWriters approved in the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentlyApproved = infoWriters.filter(writer =>
        writer.updatedAt && writer.updatedAt >= oneWeekAgo
      );
      setRecentlyApprovedCount(recentlyApproved.length);
    } catch (error) {
      toast.error("Error loading admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (uid: string) => {
    setProcessingRequest(uid);
    try {
      await approveWriterRequest(uid);

      // Update pending requests
      const approvedUser = pendingRequests.find((req) => req.uid === uid);
      setPendingRequests((prev) => prev.filter((req) => req.uid !== uid));

      // Add to active InfoWriters if user was found
      if (approvedUser) {
        setActiveInfoWriters((prev) => [
          ...prev,
          { ...approvedUser, role: "infowriter" },
        ]);
      }

      toast.success("Writer access approved");
    } catch (error) {
      toast.error("Error approving request");
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDenyRequest = async (uid: string) => {
    setProcessingRequest(uid);
    try {
      await denyWriterRequest(uid);
      setPendingRequests((prev) => prev.filter((req) => req.uid !== uid));
      toast.success("Writer access request denied");
    } catch (error) {
      toast.error("Error denying request");
    } finally {
      setProcessingRequest(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">
          You need administrator privileges to access this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const recentArticles = allArticles.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-gray-600 mt-2">
            Manage user permissions and oversee platform activity
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-3 rounded-xl">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("writer-requests")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "writer-requests"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            InfoWriter Requests
          </button>
          <button
            onClick={() => setActiveTab("infowriter-management")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "infowriter-management"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Active InfoWriters
          </button>
          <button
            onClick={() => setActiveTab("role-management")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "role-management"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Role Management
          </button>

        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Total Articles
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {allArticles.length}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">
                    InfoWriter Requests
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pendingRequests.length}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 cursor-pointer hover:border-green-200 transition-colors"
              onClick={() => setActiveTab("infowriter-management")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">
                    Active InfoWriters
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {activeInfoWriters.length}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    Click to view details
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">
                    Approved This Week
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {recentlyApprovedCount}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    InfoWriters approved
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Articles */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
              Recent Articles
            </h2>

            {recentArticles.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No articles published
                </h3>
                <p className="text-gray-600">
                  Articles will appear here once they are published.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>By {article.authorName}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(
                            article.publishedAt || article.createdAt
                          )}{" "}
                          ago
                        </span>
                        <span>•</span>
                        <span>Version {article.version}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 ml-4">
                      {article.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "writer-requests" && <WriterRequestsAdmin />}

      {activeTab === "infowriter-management" && (
        <InfoWriterManagement
          onInfoWriterRemoved={(removedWriter) => {
            setActiveInfoWriters((prev) =>
              prev.filter((writer) => writer.uid !== removedWriter.uid)
            );
          }}
        />
      )}

      {activeTab === "role-management" && <RoleManagement />}



      {activeTab === "legacy-requests" && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-orange-500" />
            Legacy Writer Access Requests
          </h2>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No pending requests
              </h3>
              <p className="text-gray-600">
                All legacy writer access requests have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.uid}
                  className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <Users className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {request.displayName || "User"}
                        </h3>
                        <p className="text-sm text-gray-600">{request.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 ml-11">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>
                        Requested {formatDistanceToNow(request.updatedAt)} ago
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleDenyRequest(request.uid)}
                      disabled={processingRequest === request.uid}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Deny</span>
                    </button>

                    <button
                      onClick={() => handleApproveRequest(request.uid)}
                      disabled={processingRequest === request.uid}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        {processingRequest === request.uid
                          ? "Processing..."
                          : "Approve"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
