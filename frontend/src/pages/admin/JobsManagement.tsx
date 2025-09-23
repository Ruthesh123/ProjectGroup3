import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Table, Pagination } from '../../components/shared/Table';
import { Modal } from '../../components/shared/Modal';
import { Job } from '../../types';

interface JobWithStats extends Job {
  employerName?: string;
}

export const JobsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithStats | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionModal, setActionModal] = useState<{
    show: boolean;
    type: 'delete' | 'activate' | 'deactivate' | null;
    job: JobWithStats | null;
  }>({ show: false, type: null, job: null });

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed' | 'draft'>('all');
  const [filterType, setFilterType] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const jobsQuery = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
      const jobsSnapshot = await getDocs(jobsQuery);

      const jobsData: JobWithStats[] = [];
      jobsSnapshot.forEach((doc) => {
        const data = doc.data();
        jobsData.push({
          id: doc.id,
          employerId: data.employerId || '',
          companyName: data.companyName || 'Unknown',
          title: data.title || 'Untitled',
          description: data.description || '',
          location: data.location || 'Not specified',
          type: data.type || 'full-time',
          skills: data.skills || [],
          salary: data.salary,
          status: data.status || 'active',
          viewCount: data.viewCount || 0,
          applicationCount: data.applicationCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      setJobs(jobsData);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Mock data for development
      setJobs([
        {
          id: '1',
          employerId: 'emp1',
          companyName: 'TechCorp Inc.',
          title: 'Frontend Developer Intern',
          description: 'Looking for a talented frontend developer...',
          location: 'Toronto, ON',
          type: 'internship',
          skills: ['React', 'TypeScript'],
          salary: { min: 40000, max: 50000, currency: 'CAD' },
          status: 'active',
          viewCount: 245,
          applicationCount: 12,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date(),
        },
        {
          id: '2',
          employerId: 'emp2',
          companyName: 'DataSoft Solutions',
          title: 'Backend Developer',
          description: 'Join our backend team...',
          location: 'Remote',
          type: 'full-time',
          skills: ['Node.js', 'AWS'],
          salary: { min: 80000, max: 100000, currency: 'CAD' },
          status: 'active',
          viewCount: 189,
          applicationCount: 8,
          createdAt: new Date('2024-03-10'),
          updatedAt: new Date(),
        },
        {
          id: '3',
          employerId: 'emp3',
          companyName: 'StartupHub',
          title: 'Full Stack Developer',
          description: 'Exciting opportunity...',
          location: 'Vancouver, BC',
          type: 'full-time',
          skills: ['React', 'Node.js'],
          status: 'closed',
          viewCount: 312,
          applicationCount: 25,
          createdAt: new Date('2024-02-15'),
          updatedAt: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (action: 'delete' | 'activate' | 'deactivate', job: JobWithStats) => {
    try {
      if (action === 'delete') {
        await deleteDoc(doc(db, 'jobs', job.id));
        setJobs(jobs.filter(j => j.id !== job.id));
      } else {
        const newStatus = action === 'activate' ? 'active' : 'closed';
        await updateDoc(doc(db, 'jobs', job.id), {
          status: newStatus,
          updatedAt: new Date(),
        });
        setJobs(jobs.map(j =>
          j.id === job.id ? { ...j, status: newStatus } : j
        ));
      }
      setActionModal({ show: false, type: null, job: null });
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    const matchesType = filterType === 'all' || job.type === filterType;
    const matchesSearch = searchTerm === '' ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    {
      key: 'title',
      label: 'Job Title',
      render: (value: string, row: JobWithStats) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.companyName}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => (
        <span className="capitalize">{value.replace('-', ' ')}</span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusColors: Record<string, string> = {
          active: 'bg-green-100 text-green-800',
          closed: 'bg-red-100 text-red-800',
          draft: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[value] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'stats',
      label: 'Stats',
      render: (_: any, row: JobWithStats) => (
        <div className="text-sm">
          <div>👁 {row.viewCount} views</div>
          <div>📝 {row.applicationCount} applications</div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Posted',
      render: (value: Date) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right' as const,
      render: (_: any, row: JobWithStats) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              setSelectedJob(row);
              setShowModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            View
          </button>
          {row.status === 'active' && (
            <button
              onClick={() => setActionModal({ show: true, type: 'deactivate', job: row })}
              className="text-yellow-600 hover:text-yellow-800"
            >
              Close
            </button>
          )}
          {row.status === 'closed' && (
            <button
              onClick={() => setActionModal({ show: true, type: 'activate', job: row })}
              className="text-green-600 hover:text-green-800"
            >
              Reopen
            </button>
          )}
          <button
            onClick={() => setActionModal({ show: true, type: 'delete', job: row })}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
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
              <h1 className="text-2xl font-bold text-gray-900">Jobs Management</h1>
            </div>
            <div className="text-sm text-gray-600">
              Total Jobs: {jobs.length}
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
              {jobs.filter(j => j.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active Jobs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {jobs.reduce((sum, j) => sum + j.applicationCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {jobs.reduce((sum, j) => sum + j.viewCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(jobs.reduce((sum, j) => sum + j.applicationCount, 0) / Math.max(jobs.length, 1))}
            </div>
            <div className="text-sm text-gray-600">Avg Applications</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search by title or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
            </select>
            <button
              onClick={fetchJobs}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow">
          <Table
            data={paginatedJobs}
            columns={columns}
            loading={loading}
            emptyMessage="No jobs found"
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredJobs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {showModal && selectedJob && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Job Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.location}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{selectedJob.type.replace('-', ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{selectedJob.status}</p>
              </div>
              {selectedJob.salary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salary Range</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedJob.salary.currency} {selectedJob.salary.min.toLocaleString()} - {selectedJob.salary.max.toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Views</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.viewCount}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Applications</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.applicationCount}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Skills</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedJob.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.description}</p>
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
      {actionModal.show && actionModal.job && (
        <Modal
          isOpen={actionModal.show}
          onClose={() => setActionModal({ show: false, type: null, job: null })}
          title={`Confirm ${actionModal.type}`}
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to {actionModal.type === 'deactivate' ? 'close' : actionModal.type} the job:
              <strong className="block mt-2">{actionModal.job.title}</strong>
              {actionModal.type === 'delete' && (
                <span className="block mt-2 text-red-600 text-sm">
                  This action cannot be undone.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setActionModal({ show: false, type: null, job: null })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleJobAction(actionModal.type!, actionModal.job!)}
                className={`px-4 py-2 rounded-lg text-white ${
                  actionModal.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : actionModal.type === 'deactivate'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionModal.type === 'delete' ? 'Delete' : actionModal.type === 'deactivate' ? 'Close Job' : 'Reopen Job'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};