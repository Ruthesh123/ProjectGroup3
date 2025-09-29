import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc as docRef,
  getDoc,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User as FbUser } from 'firebase/auth';
import { db } from '../../config/firebase';
import { Eye, Download, Clock, CheckCircle, XCircle, AlertCircle, Filter, Search } from 'lucide-react';

type AppStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn' | string;

interface Application {
  id: string;
  // from applications collection (your 8 fields)
  companyName: string;
  coverLetter?: string | null;
  employerId?: string | null;
  jobId: string;
  jobTitle: string;
  resumeUrl?: string | null;
  status: AppStatus;
  studentId: string;

  // optional enrichments (from jobs/{jobId}, if that doc exists)
  location?: string;
  jobType?: string;
  salary?: string;
  companyLogo?: string;

  // optional timestamps if you later add them
  appliedDate?: Date;
  lastUpdated?: Date;
  notes?: string;
}

export const StudentApplications = () => {
  const [uid, setUid] = useState<string | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);

  // get a real Firebase UID (so no TS errors about user.uid)
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u: FbUser | null) => {
      setUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (uid) fetchApplications(uid);
  }, [uid]);

  useEffect(() => {
    filterApplications();
  }, [applications, selectedStatus, searchTerm]);

  const safeToDate = (v: any): Date | undefined => {
    // tolerate missing/invalid dates
    if (!v) return undefined;
    if (typeof v?.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const fetchApplications = async (currUid: string) => {
    try {
      setLoading(true);
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('studentId', '==', currUid)
      );

      const snapshot = await getDocs(applicationsQuery);

      const rows = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data() as any;

          // your 8 fields (supporting a few common naming typos/variants just in case)
          const companyName =
            data.companyName ??
            data['company name'] ??
            data.compnayName ??
            data['compnay name'] ??
            'Unknown Company';

          const coverLetter = data.coverLetter ?? data['cover letter'] ?? null;
          const employerId = data.employerId ?? data['employer id'] ?? null;
          const jobId = data.jobId ?? data['jobid'] ?? '';
          const jobTitle = data.jobTitle ?? data['jobtitle'] ?? 'Unknown Position';
          const resumeUrl = data.resume ?? data.resumeUrl ?? null;
          const status: AppStatus = data.status ?? 'pending';
          const studentId = data.studentId ?? '';

          // optional enrich from jobs/{jobId} if exists (location/type/salary/logo)
          let jobExtra: Partial<Application> = {};
          if (jobId) {
            try {
              const jobDoc = await getDoc(docRef(db, 'jobs', jobId));
              if (jobDoc.exists()) {
                const j = jobDoc.data() as any;
                jobExtra = {
                  location: j?.location,
                  jobType: j?.type,
                  salary: j?.salary,
                  companyLogo: j?.companyLogo,
                };
              }
            } catch {
              // best-effort only
            }
          }

          const appliedDate = safeToDate(data.appliedDate);
          const lastUpdated = safeToDate(data.lastUpdated);

          const app: Application = {
            id: d.id,
            companyName,
            coverLetter,
            employerId,
            jobId,
            jobTitle,
            resumeUrl,
            status,
            studentId,
            ...jobExtra,
            appliedDate,
            lastUpdated,
            notes: data.notes,
          };

          return app;
        })
      );

      // No appliedDate in your schema -> keep stable order by doc id
      rows.sort((a, b) => a.id.localeCompare(b.id));

      setApplications(rows);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setApplications([]); // no mock fallback to avoid confusion
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((app) => app.status === selectedStatus);
    }

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.jobTitle.toLowerCase().includes(s) ||
          app.companyName.toLowerCase().includes(s)
      );
    }

    // If you add appliedDate in future, you can sort by it; for now keep as loaded
    setFilteredApplications(filtered);
  };

  const withdrawApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;

    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        status: 'withdrawn',
        lastUpdated: Timestamp.now(),
      });
      if (uid) fetchApplications(uid);
    } catch (error) {
      console.error('Error withdrawing application:', error);
      alert('Failed to withdraw application. Please try again.');
    }
  };

  const getStatusBadge = (status: AppStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'reviewing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Eye className="h-3 w-3" />
            Under Review
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
            <AlertCircle className="h-3 w-3" />
            Withdrawn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="h-3 w-3" />
            {String(status)}
          </span>
        );
    }
  };

  const getTimeAgo = (date?: Date) => {
    if (!date) return null;
    const now = new Date().getTime();
    const diff = Math.max(0, now - date.getTime());
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (!uid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please sign in to view your applications.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-2">Track and manage your job applications</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {applications.filter((app) => app.status === 'pending').length}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-blue-600">
                  {applications.filter((app) => app.status === 'reviewing').length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-green-600">
                  {applications.filter((app) => app.status === 'accepted').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Under Review</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredApplications.length} of {applications.length} applications
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No applications found</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchTerm || selectedStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start applying to jobs to see them here'}
              </p>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {application.companyLogo ? (
                        <img
                          src={application.companyLogo}
                          alt={application.companyName}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500 text-xl font-bold">
                            {application.companyName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{application.jobTitle}</h3>
                        <p className="text-gray-600">{application.companyName}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                          {application.location && <span>{application.location}</span>}
                          {application.location && application.jobType && <span>•</span>}
                          {application.jobType && <span>{application.jobType}</span>}
                          {application.salary && (
                            <>
                              <span>•</span>
                              <span>{application.salary}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          {getStatusBadge(application.status)}
                          {application.appliedDate && (
                            <span className="text-sm text-gray-500">
                              Applied {getTimeAgo(application.appliedDate)}
                            </span>
                          )}
                          {application.lastUpdated && (
                            <span className="text-sm text-gray-500">
                              • Updated {getTimeAgo(application.lastUpdated)}
                            </span>
                          )}
                        </div>
                        {application.notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">{application.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedApplication(application);
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {application.resumeUrl && (
                      <a
                        href={application.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Open Resume"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    )}
                    {application.status === 'pending' && (
                      <button
                        onClick={() => withdrawApplication(application.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Application Details Modal */}
        {showModal && selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Application Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedApplication.jobTitle}</h3>
                    <p className="text-gray-600">{selectedApplication.companyName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                    </div>
                    {selectedApplication.appliedDate && (
                      <div>
                        <p className="text-sm text-gray-500">Applied</p>
                        <p className="text-gray-900">
                          {selectedApplication.appliedDate.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedApplication.location && (
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="text-gray-900">{selectedApplication.location}</p>
                      </div>
                    )}
                    {selectedApplication.jobType && (
                      <div>
                        <p className="text-sm text-gray-500">Job Type</p>
                        <p className="text-gray-900">{selectedApplication.jobType}</p>
                      </div>
                    )}
                    {selectedApplication.salary && (
                      <div>
                        <p className="text-sm text-gray-500">Salary</p>
                        <p className="text-gray-900">{selectedApplication.salary}</p>
                      </div>
                    )}
                    {selectedApplication.lastUpdated && (
                      <div>
                        <p className="text-sm text-gray-500">Last Updated</p>
                        <p className="text-gray-900">
                          {selectedApplication.lastUpdated.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedApplication.coverLetter && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Cover Letter</p>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedApplication.coverLetter}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                  {selectedApplication.resumeUrl && (
                    <a
                      href={selectedApplication.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Open Resume
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
