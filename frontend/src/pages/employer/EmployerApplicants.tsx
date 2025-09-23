import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Application, Job } from '../../types';
import { Modal } from '../../components/shared/Modal';

interface ApplicationWithJob extends Application {
  studentEmail?: string;
  studentName?: string;
}

export const EmployerApplicants: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobIdFilter = searchParams.get('jobId');

  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [filterJob, setFilterJob] = useState<string>(jobIdFilter || 'all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First, fetch employer's jobs
      const jobsQuery = query(collection(db, 'jobs'), where('employerId', '==', user.id));
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsList: Job[] = [];
      const jobIds: string[] = [];

      jobsSnapshot.forEach((doc) => {
        const data = doc.data();
        jobsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Job);
        jobIds.push(doc.id);
      });

      setJobs(jobsList);

      // Then fetch applications for those jobs
      if (jobIds.length > 0) {
        const appsQuery = query(collection(db, 'applications'), where('jobId', 'in', jobIds));
        const appsSnapshot = await getDocs(appsQuery);
        const appsList: ApplicationWithJob[] = [];

        for (const docSnapshot of appsSnapshot.docs) {
          const data = docSnapshot.data();

          // Get student info
          let studentEmail = 'Unknown';
          let studentName = 'Unknown Student';

          try {
            const studentDoc = await getDocs(
              query(collection(db, 'users'), where('id', '==', data.studentId))
            );
            if (!studentDoc.empty) {
              const studentData = studentDoc.docs[0].data();
              studentEmail = studentData.email || 'Unknown';
              studentName = studentData.name || studentEmail;
            }
          } catch (error) {
            console.error('Error fetching student info:', error);
          }

          appsList.push({
            id: docSnapshot.id,
            studentId: data.studentId,
            jobId: data.jobId,
            jobTitle: data.jobTitle || jobsList.find(j => j.id === data.jobId)?.title || 'Unknown Position',
            companyName: data.companyName || jobsList.find(j => j.id === data.jobId)?.companyName || 'Unknown',
            status: data.status || 'pending',
            appliedAt: data.appliedAt?.toDate() || new Date(),
            resume: data.resume || '',
            coverLetter: data.coverLetter,
            notes: data.notes,
            studentEmail,
            studentName,
          });
        }

        // Sort by application date (newest first)
        appsList.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
        setApplications(appsList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set mock data for development
      setApplications([
        {
          id: '1',
          studentId: 'student1',
          studentName: 'John Doe',
          studentEmail: 'john@example.com',
          jobId: 'job1',
          jobTitle: 'Frontend Developer Intern',
          companyName: 'TechCorp',
          status: 'pending',
          appliedAt: new Date('2024-03-15'),
          resume: 'resume.pdf',
          coverLetter: 'I am very interested in this position...',
        },
        {
          id: '2',
          studentId: 'student2',
          studentName: 'Jane Smith',
          studentEmail: 'jane@example.com',
          jobId: 'job1',
          jobTitle: 'Frontend Developer Intern',
          companyName: 'TechCorp',
          status: 'reviewing',
          appliedAt: new Date('2024-03-14'),
          resume: 'resume.pdf',
          coverLetter: 'With my experience in React...',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (application: ApplicationWithJob, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'applications', application.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      setApplications(applications.map(app =>
        app.id === application.id ? { ...app, status: newStatus } : app
      ));
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesJob = filterJob === 'all' || app.jobId === filterJob;
    return matchesStatus && matchesJob;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/employer/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.reviewing}</div>
            <div className="text-sm text-gray-600">Reviewing</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">Applications will appear here when students apply to your job postings.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{app.studentName}</div>
                        <div className="text-sm text-gray-500">{app.studentEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.jobTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedApplication(app);
                          setShowModal(true);
                        }}
                        className="text-primary hover:text-blue-700 mr-3"
                      >
                        View
                      </button>
                      {app.status !== 'accepted' && app.status !== 'rejected' && (
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusUpdate(app, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="accepted">Accept</option>
                          <option value="rejected">Reject</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {showModal && selectedApplication && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Application Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">Applicant</h4>
                <p className="mt-1 text-gray-600">{selectedApplication.studentName}</p>
                <p className="text-sm text-gray-500">{selectedApplication.studentEmail}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Position</h4>
                <p className="mt-1 text-gray-600">{selectedApplication.jobTitle}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Applied Date</h4>
                <p className="mt-1 text-gray-600">{new Date(selectedApplication.appliedAt).toLocaleString()}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Status</h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                  {selectedApplication.status}
                </span>
              </div>
            </div>

            {selectedApplication.coverLetter && (
              <div>
                <h4 className="font-semibold text-gray-900">Cover Letter</h4>
                <p className="mt-2 text-gray-600 whitespace-pre-wrap">{selectedApplication.coverLetter}</p>
              </div>
            )}

            {selectedApplication.resume && (
              <div>
                <h4 className="font-semibold text-gray-900">Resume</h4>
                <a href={selectedApplication.resume} target="_blank" rel="noopener noreferrer" className="mt-2 text-primary hover:text-blue-700 inline-flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Resume
                </a>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              {selectedApplication.status !== 'accepted' && selectedApplication.status !== 'rejected' && (
                <>
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedApplication, 'rejected');
                      setShowModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleStatusUpdate(selectedApplication, 'accepted');
                      setShowModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Accept
                  </button>
                </>
              )}
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
    </div>
  );
};