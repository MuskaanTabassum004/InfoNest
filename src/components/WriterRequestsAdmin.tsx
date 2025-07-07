import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getWriterRequests, 
  processWriterRequest, 
  WriterRequest,
  RequestStatus 
} from '../lib/writerRequests';
import { approveWriterRequest } from '../lib/auth';
import { 
  Eye, 
  Check, 
  X, 
  Clock, 
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  Tag,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export const WriterRequestsAdmin: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [requests, setRequests] = useState<WriterRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<WriterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WriterRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'fullName' | 'status'>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterAndSortRequests();
  }, [requests, statusFilter, searchQuery, sortBy, sortOrder]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const allRequests = await getWriterRequests();
      setRequests(allRequests);
    } catch (error) {
      toast.error('Error loading writer requests');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRequests = () => {
    let filtered = requests;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(request =>
        request.fullName.toLowerCase().includes(query) ||
        request.email.toLowerCase().includes(query) ||
        request.requestId.toLowerCase().includes(query) ||
        request.proposedTitle.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'fullName':
          aValue = a.fullName.toLowerCase();
          bValue = b.fullName.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'submittedAt':
        default:
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRequests(filtered);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleProcessRequest = async (
    requestId: string,
    status: 'approved' | 'rejected'
  ) => {
    if (!userProfile) return;

    setProcessing(requestId);
    try {
      await processWriterRequest(requestId, status, userProfile.uid, adminNotes);
      
      // If approved, also update user role
      if (status === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          await approveWriterRequest(request.userId);
        }
      }

      await loadRequests();
      setSelectedRequest(null);
      setAdminNotes('');
      toast.success(`Request ${status} successfully`);
    } catch (error) {
      toast.error(`Error ${status === 'approved' ? 'approving' : 'rejecting'} request`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You need administrator privileges to access this page.</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">InfoWriter Requests</h2>
        <p className="text-gray-600">Manage and review InfoWriter applications</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or request ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'all')}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
          <div className="text-sm text-gray-600">Total Requests</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">
            {requests.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-sm text-yellow-600">Pending</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">
            {requests.filter(r => r.status === 'approved').length}
          </div>
          <div className="text-sm text-green-600">Approved</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-700">
            {requests.filter(r => r.status === 'rejected').length}
          </div>
          <div className="text-sm text-red-600">Rejected</div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('submittedAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Submitted</span>
                    {sortBy === 'submittedAt' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request ID
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {sortBy === 'fullName' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proposed Title
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortBy === 'status' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{format(request.submittedAt, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(request.submittedAt)} ago
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {request.requestId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.fullName}</div>
                    <div className="text-sm text-gray-500">{request.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">{request.proposedTitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="capitalize">{request.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleProcessRequest(request.id, 'approved')}
                          disabled={processing === request.id}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleProcessRequest(request.id, 'rejected')}
                          disabled={processing === request.id}
                          className="text-red-600 hover:text-red-900"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              {requests.length === 0 
                ? 'No InfoWriter requests have been submitted yet.'
                : 'No requests match your current filters.'}
            </p>
          </div>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status and ID */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">Request ID:</span>
                  <p className="font-mono text-lg">{selectedRequest.requestId}</p>
                </div>
                <span className={`inline-flex items-center space-x-1 px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedRequest.status)}`}>
                  {getStatusIcon(selectedRequest.status)}
                  <span className="capitalize">{selectedRequest.status}</span>
                </span>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Personal Information
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Full Name:</span>
                      <p className="font-medium">{selectedRequest.fullName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Email:</span>
                      <p className="font-medium">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Phone:</span>
                      <p className="font-medium">{selectedRequest.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Submission Details</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Submitted:</span>
                      <p className="font-medium">{format(selectedRequest.submittedAt, 'PPpp')}</p>
                    </div>
                    {selectedRequest.processedAt && (
                      <div>
                        <span className="text-sm text-gray-600">Processed:</span>
                        <p className="font-medium">{format(selectedRequest.processedAt, 'PPpp')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Qualifications */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Qualifications</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.qualifications}</p>
                </div>
              </div>

              {/* Areas of Interest */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Areas of Interest</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.areasOfInterest.map((area) => (
                    <span
                      key={area}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Article Proposal */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Article Proposal</h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600">Proposed Title:</span>
                    <p className="font-medium text-lg">{selectedRequest.proposedTitle}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Target Audience:</span>
                    <p className="font-medium capitalize">{selectedRequest.targetAudience.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Description:</span>
                    <div className="bg-gray-50 rounded-lg p-4 mt-2">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.briefDescription}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {selectedRequest.adminNotes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Admin Notes</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-700">{selectedRequest.adminNotes}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedRequest.status === 'pending' && (
                <div className="border-t pt-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add notes about your decision..."
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => handleProcessRequest(selectedRequest.id, 'rejected')}
                      disabled={processing === selectedRequest.id}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processing === selectedRequest.id ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleProcessRequest(selectedRequest.id, 'approved')}
                      disabled={processing === selectedRequest.id}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processing === selectedRequest.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};