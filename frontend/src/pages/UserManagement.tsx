import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userService, AppUser, UserRole } from '@/services/userService';
import { 
  Users, 
  Plus, 
  UserCog, 
  Shield, 
  ShieldCheck,
  User,
  Mail, 
  Phone, 
  Check, 
  X, 
  Search,
  Clock,
  AlertTriangle,
  Loader2,
  KeyRound,
  Trash2,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  mobile_number?: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role: UserRole;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameUser, setNameUser] = useState<UserWithRole | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Create user form state
  const emptyNewUser = {
    email: '',
    password: '',
    fullName: '',
    mobileNumber: '',
    role: 'cashier' as 'admin' | 'cashier'
  };

  const resetNewUser = () => setNewUser({ ...emptyNewUser });

  const [newUser, setNewUser] = useState(() => ({ ...emptyNewUser }));

  useEffect(() => {
    fetchUsers();
  }, []);

  const mapUser = (u: AppUser): UserWithRole => ({
    id: u.id,
    name: u.name,
    email: u.email,
    mobile_number: null,
    is_active: u.isActive,
    last_login_at: null,
    created_at: u.createdAt,
    role: u.role,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data.map(mapUser));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await userService.createUser({
        name: newUser.fullName || newUser.email,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role as UserRole,
      });

      toast.success('User created successfully');
      setShowCreateModal(false);
      resetNewUser();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      await userService.toggleStatus(userId);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const changeUserRole = async (userId: string, newRole: 'admin' | 'cashier') => {
    setActionLoading(true);
    try {
      await userService.updateRole(userId, newRole as UserRole);
      toast.success('User role updated successfully');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to change user role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordUser) return;
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setActionLoading(true);
    try {
      await userService.resetPassword(passwordUser.id, newPassword);

      setShowPasswordModal(false);
      setPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password reset successfully!');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    setActionLoading(true);
    try {
      await userService.deleteUser(deleteUser.id);

      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setDeleteUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const openNameModal = (user: UserWithRole) => {
    setNameUser(user);
    setNameValue(user.name);
    setShowNameModal(true);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameUser) return;
    if (!nameValue.trim()) {
      toast.error('Name is required');
      return;
    }

    setNameSaving(true);
    try {
      await userService.updateUser(nameUser.id, { name: nameValue.trim() });
      toast.success('Name updated');
      setShowNameModal(false);
      setNameUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating name:', error);
      toast.error(error.message || 'Failed to update name');
    } finally {
      setNameSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-primary" />;
      default: return <User className="w-4 h-4 text-info" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'admin': return 'bg-primary/10 text-primary';
      default: return 'bg-info/10 text-info';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage staff accounts and permissions</p>
        </div>
        <button
          onClick={() => {
            resetNewUser();
            setShowCreateModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="dashboard-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="form-input pl-10"
          />
        </div>
      </div>

      {/* Users List - Desktop Table */}
      <div className="dashboard-card hidden md:block">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.mobile_number && (
                          <p className="text-xs text-muted-foreground">{user.mobile_number}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td>
                    {user.is_active ? (
                      <span className="badge-success flex items-center gap-1 w-fit">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="badge-danger flex items-center gap-1 w-fit">
                        <X className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(user.last_login_at)}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {user.role !== 'owner' && user.id !== currentUser?.id && (
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="btn-secondary text-xs px-2 py-1"
                          disabled={actionLoading}
                        >
                          <UserCog className="w-3 h-3" />
                          Role
                        </button>
                      )}

                      <button
                        onClick={() => openNameModal(user)}
                        className="text-xs px-2 py-1 rounded-md bg-muted text-foreground hover:bg-muted/70"
                        disabled={actionLoading}
                        title="Edit Name"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => {
                          setPasswordUser(user);
                          setShowPasswordModal(true);
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning hover:bg-warning/20"
                        disabled={actionLoading}
                        title="Reset Password"
                      >
                        <KeyRound className="w-3 h-3" />
                      </button>

                      {user.role !== 'owner' && user.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => {
                              setDeleteUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="text-xs px-2 py-1 rounded-md bg-danger/10 text-danger hover:bg-danger/20"
                            disabled={actionLoading}
                            title="Delete User"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className={`text-xs px-2 py-1 rounded-md ${
                              user.is_active 
                                ? 'bg-danger/10 text-danger hover:bg-danger/20' 
                                : 'bg-success/10 text-success hover:bg-success/20'
                            }`}
                            disabled={actionLoading}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}

                      {user.id === currentUser?.id && (
                        <span className="text-xs text-muted-foreground italic">Current user</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users List - Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map(user => (
          <div key={user.id} className="dashboard-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  {getRoleIcon(user.role)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                    {user.is_active ? (
                      <span className="badge-success text-xs">Active</span>
                    ) : (
                      <span className="badge-danger text-xs">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
              {user.role !== 'owner' && user.id !== currentUser?.id && (
                <button
                  onClick={() => setSelectedUser(user)}
                  className="btn-secondary text-xs px-3 py-1.5 flex-1"
                  disabled={actionLoading}
                >
                  <UserCog className="w-3 h-3" />
                  Change Role
                </button>
              )}

              <button
                onClick={() => openNameModal(user)}
                className="text-xs px-3 py-1.5 rounded-md bg-muted text-foreground hover:bg-muted/70"
                disabled={actionLoading}
                title="Edit Name"
              >
                <Pencil className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  setPasswordUser(user);
                  setShowPasswordModal(true);
                }}
                className="text-xs px-3 py-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20"
                disabled={actionLoading}
                title="Reset Password"
              >
                <KeyRound className="w-3 h-3" />
              </button>

              {user.role !== 'owner' && user.id !== currentUser?.id && (
                <>
                  <button
                    onClick={() => {
                      setDeleteUser(user);
                      setShowDeleteModal(true);
                    }}
                    className="text-xs px-3 py-1.5 rounded-md bg-danger/10 text-danger hover:bg-danger/20"
                    disabled={actionLoading}
                    title="Delete User"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-md ${
                      user.is_active 
                        ? 'bg-danger/10 text-danger hover:bg-danger/20' 
                        : 'bg-success/10 text-success hover:bg-success/20'
                    }`}
                    disabled={actionLoading}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </>
              )}

              {user.id === currentUser?.id && (
                <p className="text-xs text-muted-foreground italic mt-2">Current user</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Create New User</h3>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4" autoComplete="off">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={newUser.fullName}
                  autoComplete="off"
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  autoComplete="off"
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Mobile Number (Optional)</label>
                <input
                  type="tel"
                  value={newUser.mobileNumber}
                  autoComplete="off"
                  onChange={(e) => setNewUser({ ...newUser, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  autoComplete="new-password"
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="form-input"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'cashier' })}
                  className="form-input"
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetNewUser();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Change User Role</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedUser.name} ({selectedUser.email})
              </p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Select new role:</p>
              <div className="space-y-2">
                <button
                  onClick={() => changeUserRole(selectedUser.id, 'admin')}
                  className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                    selectedUser.role === 'admin'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  disabled={actionLoading}
                >
                  <Shield className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Admin</p>
                    <p className="text-xs text-muted-foreground">Full access except user management</p>
                  </div>
                </button>
                <button
                  onClick={() => changeUserRole(selectedUser.id, 'cashier')}
                  className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                    selectedUser.role === 'cashier'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  disabled={actionLoading}
                >
                  <User className="w-5 h-5 text-info" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Cashier</p>
                    <p className="text-xs text-muted-foreground">Billing access only</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="btn-secondary w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {showNameModal && nameUser && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Edit User Name</h3>
              <p className="text-sm text-muted-foreground mt-1">{nameUser.email}</p>
            </div>
            <form onSubmit={handleUpdateName} className="p-6 space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="btn-secondary"
                  disabled={nameSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={nameSaving}
                >
                  {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Reset Password</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {passwordUser.name} ({passwordUser.email})
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  required
                  minLength={6}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordUser(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-warning"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && deleteUser && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                Delete User
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete <strong className="text-foreground">{deleteUser.name}</strong> ({deleteUser.email})?
              </p>
              <p className="text-sm text-danger">
                This action cannot be undone. The user will lose access immediately.
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteUser(null);
                  }}
                  className="btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="btn-danger"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;