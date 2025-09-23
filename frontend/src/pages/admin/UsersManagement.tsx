import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Table, Pagination } from '../../components/shared/Table';
import { Modal } from '../../components/shared/Modal';
import { User, UserRole } from '../../types';

interface UserWithProfile extends User {
  name?: string;
  company?: string;
  university?: string;
  lastLogin?: Date;
  status?: 'active' | 'suspended' | 'deleted';
}

export const UsersManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionModal, setActionModal] = useState<{
    show: boolean;
    type: 'delete' | 'suspend' | 'activate' | null;
    user: UserWithProfile | null;
  }>({ show: false, type: null, user: null });

  // Filters
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);

      const usersData: UserWithProfile[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          email: data.email,
          role: data.role as UserRole,
          emailVerified: data.emailVerified || false,
          name: data.name || data.companyName || 'N/A',
          company: data.companyName,
          university: data.university,
          status: data.status || 'active',
          lastLogin: data.lastLogin?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Set mock data for development
      setUsers([
        {
          id: '1',
          email: 'admin@interlink.com',
          role: 'admin',
          emailVerified: true,
          name: 'System Admin',
          status: 'active',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
        {
          id: '2',
          email: 'student1@test.com',
          role: 'student',
          emailVerified: true,
          name: 'John Student',
          university: 'University of Toronto',
          status: 'active',
          createdAt: new Date('2024-02-15'),
          updatedAt: new Date(),
        },
        {
          id: '3',
          email: 'employer1@company.com',
          role: 'employer',
          emailVerified: true,
          name: 'TechCorp Inc.',
          company: 'TechCorp Inc.',
          status: 'active',
          createdAt: new Date('2024-02-20'),
          updatedAt: new Date(),
        },
        {
          id: '4',
          email: 'student2@test.com',
          role: 'student',
          emailVerified: false,
          name: 'Jane Student',
          university: 'Waterloo University',
          status: 'active',
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date(),
        },
        {
          id: '5',
          email: 'employer2@company.com',
          role: 'employer',
          emailVerified: true,
          name: 'DataSystems Inc.',
          company: 'DataSystems Inc.',
          status: 'suspended',
          createdAt: new Date('2024-03-10'),
          updatedAt: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: 'delete' | 'suspend' | 'activate', user: UserWithProfile) => {
    try {
      if (action === 'delete') {
        await deleteDoc(doc(db, 'users', user.id));
        setUsers(users.filter(u => u.id !== user.id));
      } else {
        const newStatus = action === 'suspend' ? 'suspended' : 'active';
        await updateDoc(doc(db, 'users', user.id), {
          status: newStatus,
          updatedAt: new Date(),
        });
        setUsers(users.map(u =>
          u.id === user.id ? { ...u, status: newStatus } : u
        ));
      }
      setActionModal({ show: false, type: null, user: null });
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesSearch = searchTerm === '' ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    {
      key: 'email',
      label: 'Email',
      render: (value: string, row: UserWithProfile) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.name}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: UserRole) => {
        const roleColors = {
          admin: 'bg-purple-100 text-purple-800',
          employer: 'bg-green-100 text-green-800',
          student: 'bg-blue-100 text-blue-800',
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[value]}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'emailVerified',
      label: 'Verified',
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value ? 'Verified' : 'Pending'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          active: 'bg-green-100 text-green-800',
          suspended: 'bg-red-100 text-red-800',
          deleted: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[value] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value: Date) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right' as const,
      render: (_: any, row: UserWithProfile) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              setSelectedUser(row);
              setShowModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            View
          </button>
          {row.status === 'active' && row.role !== 'admin' && (
            <button
              onClick={() => setActionModal({ show: true, type: 'suspend', user: row })}
              className="text-yellow-600 hover:text-yellow-800"
            >
              Suspend
            </button>
          )}
          {row.status === 'suspended' && (
            <button
              onClick={() => setActionModal({ show: true, type: 'activate', user: row })}
              className="text-green-600 hover:text-green-800"
            >
              Activate
            </button>
          )}
          {row.role !== 'admin' && (
            <button
              onClick={() => setActionModal({ show: true, type: 'delete', user: row })}
              className="text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            </div>
            <div className="text-sm text-gray-600">
              Total Users: {users.length}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'student').length}
            </div>
            <div className="text-sm text-gray-600">Students</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'employer').length}
            </div>
            <div className="text-sm text-gray-600">Employers</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.emailVerified).length}
            </div>
            <div className="text-sm text-gray-600">Verified</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as 'all' | UserRole)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="employer">Employers</option>
              <option value="admin">Admins</option>
            </select>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow">
          <Table
            data={paginatedUsers}
            columns={columns}
            loading={loading}
            emptyMessage="No users found"
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="User Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{selectedUser.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{selectedUser.status}</p>
              </div>
              {selectedUser.company && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.company}</p>
                </div>
              )}
              {selectedUser.university && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">University</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.university}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Verified</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.emailVerified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Joined</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Action Confirmation Modal */}
      {actionModal.show && actionModal.user && (
        <Modal
          isOpen={actionModal.show}
          onClose={() => setActionModal({ show: false, type: null, user: null })}
          title={`Confirm ${actionModal.type}`}
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to {actionModal.type} user <strong>{actionModal.user.email}</strong>?
              {actionModal.type === 'delete' && (
                <span className="block mt-2 text-red-600 text-sm">
                  This action cannot be undone.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setActionModal({ show: false, type: null, user: null })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUserAction(actionModal.type!, actionModal.user!)}
                className={`px-4 py-2 rounded-lg text-white ${
                  actionModal.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : actionModal.type === 'suspend'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionModal.type === 'delete' ? 'Delete' : actionModal.type === 'suspend' ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};