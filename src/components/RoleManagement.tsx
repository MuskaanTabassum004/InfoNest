import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserRole, UserProfile, UserRole } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Search, 
  Shield, 
  UserCheck, 
  UserX, 
  AlertTriangle,
  CheckCircle,
  Crown,
  Edit3
} from 'lucide-react';
import { RoleBadge } from './ProtectedRoute';
import toast from 'react-hot-toast';

export const RoleManagement: React.FC = () => {
  const { userProfile, canManageUsers } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{
    userId: string;
    newRole: UserRole;
    userName: string;
  } | null>(null);

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!userProfile || !canManageUsers) {
      toast.error('Insufficient permissions');
      return;
    }

    setUpdatingUser(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(user => 
        user.uid === userId 
          ? { ...user, role: newRole, updatedAt: new Date() }
          : user
      ));
      toast.success(`User role updated to ${newRole}`);
    } catch (error: any) {
      toast.error(error.message || 'Error updating user role');
    } finally {
      setUpdatingUser(null);
      setShowConfirm(null);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'text-red-600';
      case 'infowriter': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getRoleStats = () => {
    const stats = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    return {
      admin: stats.admin || 0,
      infowriter: stats.infowriter || 0,
      user: stats.user || 0,
      total: users.length
    };
  };

  if (!canManageUsers) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to manage user roles.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = getRoleStats();

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Role Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Admins</p>
                <p className="text-2xl font-bold text-red-600">{stats.admin}</p>
              </div>
              <Crown className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">InfoWriters</p>
                <p className="text-2xl font-bold text-blue-600">{stats.infowriter}</p>
              </div>
              <Edit3 className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Users</p>
                <p className="text-2xl font-bold text-gray-600">{stats.user}</p>
              </div>
              <UserCheck className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admins</option>
          <option value="infowriter">InfoWriters</option>
          <option value="user">Users</option>
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Role
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
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt?.toLocaleDateString() || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.uid !== userProfile?.uid && (
                      <div className="flex space-x-2">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => setShowConfirm({
                              userId: user.uid,
                              newRole: 'admin',
                              userName: user.displayName || user.email
                            })}
                            disabled={updatingUser === user.uid}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Make Admin
                          </button>
                        )}
                        
                        {user.role !== 'infowriter' && (
                          <button
                            onClick={() => setShowConfirm({
                              userId: user.uid,
                              newRole: 'infowriter',
                              userName: user.displayName || user.email
                            })}
                            disabled={updatingUser === user.uid}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            Make InfoWriter
                          </button>
                        )}
                        
                        {user.role !== 'user' && (
                          <button
                            onClick={() => setShowConfirm({
                              userId: user.uid,
                              newRole: 'user',
                              userName: user.displayName || user.email
                            })}
                            disabled={updatingUser === user.uid}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          >
                            Make User
                          </button>
                        )}
                      </div>
                    )}
                    {user.uid === userProfile?.uid && (
                      <span className="text-gray-400 text-xs">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-100 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Role Change
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to change <strong>{showConfirm.userName}</strong>'s role to{' '}
              <strong className={getRoleColor(showConfirm.newRole)}>
                {showConfirm.newRole}
              </strong>?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRoleChange(showConfirm.userId, showConfirm.newRole)}
                disabled={updatingUser === showConfirm.userId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updatingUser === showConfirm.userId ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
