import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc,            // ✅ was missing
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Job } from '../../types';            // ✅ don’t import Application to avoid extends mismatch
import { Modal } from '../../components/shared/Modal';

// Status used in this page (wider than your global type)
type AppStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn' | string;

// Self-contained row shape used by this UI (no extends)
interface ApplicationWithJob {
  id: string;
  studentId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: AppStatus;
  appliedAt: Date;            // ✅ always a Date so no undefined error
  lastUpdated?: Date;

  // optional extras
  coverLetter?: string;
  notes?: string;
  resume?: string;            // url string if present
  studentEmail?: string;
  studentName?: string;
}

const toDateSafe = (v: any): Date | undefined => {
  if (!v) return undefined;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const chunk = <T,>(arr: T[], n = 10): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export const EmployerApplicants: React.FC = () => {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobIdFilter = searchParams.get('jobId');

  // prefer Firebase uid; fallback to custom id
  const uid: string | null = user?.uid ?? user?.id ?? null;

  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [filterJob, setFilterJob] = useState<string>(jobIdFilter || 'all');
  const [error, setError] = useState<string | null>(null);

  // cache student meta
  const studentMetaRef = useRef<Map<string, { name?: string; email?: string }>>(new Map());

  // ----- Live jobs -----
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    const qJobs = query(collection(db, 'jobs'), where('employerId', '==', uid));
    const unsubJobs = onSnapshot(
      qJobs,
      (snap) => {
        const list: Job[] = snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: toDateSafe(data.createdAt) || new Date(0),
            updatedAt: toDateSafe(data.updatedAt) || new Date(0),
          } as Job;
        });
        setJobs(list);
      },
      (err) => {
        console.error('Jobs listener error:', err);
        setError('Failed to load jobs.');
      }
    );

    return () => unsubJobs();
  }, [uid]);

  // ----- Live applications (prefers employerId, falls back to jobId chunks) -----
  useEffect(() => {
    if (!uid) return;

    setApplications([]);
    setLoading(true);

    const qAppsByEmployer = query(collection(db, 'applications'), where('employerId', '==', uid));
    const fallbackUnsubs: Array<() => void> = [];
    let primaryUnsub: (() => void) | null = null;

    const handleAppsSnapshot = async (snap: QuerySnapshot<DocumentData>) => {
      if (snap.empty && jobs.length > 0) {
        // fallback: chunk by jobId (<=10)
        if (primaryUnsub) primaryUnsub();
        const chunks = chunk(jobs.map(j => j.id), 10);
        setApplications([]);
        chunks.forEach((ids) => {
          const qChunk = query(collection(db, 'applications'), where('jobId', 'in', ids));
          const unsub = onSnapshot(
            qChunk,
            (s) => mergeAppsSnapshot(s),
            (e) => console.error('Apps fallback error:', e)
          );
          fallbackUnsubs.push(unsub);
        });
        setLoading(false);
        return;
      }

      mergeAppsSnapshot(snap);
      setLoading(false);
    };

    const mergeAppsSnapshot = async (snap: QuerySnapshot<DocumentData>) => {
      const list: ApplicationWithJob[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data: any = d.data();

          // normalized dates; ensure appliedAt is ALWAYS a Date
          const applied = toDateSafe(data.appliedAt ?? data.appliedDate) || new Date(0);
          const lastUpd = toDateSafe(data.lastUpdated ?? data.updatedAt);

          // student meta (cached)
          let studentEmail: string | undefined;
          let studentName: string | undefined;
          if (data.studentId) {
            const cached = studentMetaRef.current.get(data.studentId);
            if (cached) {
              studentEmail = cached.email;
              studentName = cached.name || cached.email;
            } else {
              try {
                const uDoc = await getDoc(doc(db, 'users', data.studentId));
                if (uDoc.exists()) {
                  const u = uDoc.data() as any;
                  studentEmail = u?.email || 'Unknown';
                  studentName = u?.name || studentEmail;
                  studentMetaRef.current.set(data.studentId, { email: studentEmail, name: studentName });
                } else {
                  const qs = await getDocs(query(collection(db, 'users'), where('id', '==', data.studentId)));
                  if (!qs.empty) {
                    const u = qs.docs[0].data() as any;
                    studentEmail = u?.email || 'Unknown';
                    studentName = u?.name || studentEmail;
                    studentMetaRef.current.set(data.studentId, { email: studentEmail, name: studentName });
                  }
                }
              } catch (e) {
                console.warn('Student meta fetch failed:', e);
              }
            }
          }

          // job enrichment
          const jobFromList = jobs.find((j) => j.id === data.jobId);
          const jobTitle = data.jobTitle || jobFromList?.title || 'Unknown Position';
          const companyName = data.companyName || jobFromList?.companyName || 'Unknown';

          const item: ApplicationWithJob = {
            id: d.id,
            studentId: String(data.studentId || ''),
            jobId: String(data.jobId || ''),
            jobTitle,
            companyName,
            status: (data.status ?? 'pending') as AppStatus,
            appliedAt: applied,           // ✅ required
            lastUpdated: lastUpd,
            resume: data.resumeUrl ?? data.resume ?? '',
            coverLetter: data.coverLetter,
            notes: data.notes,
            studentEmail: studentEmail ?? 'Unknown',
            studentName: studentName ?? 'Unknown Student',
          };

          return item;
        })
      );

      // Merge by id (for multiple chunk listeners)
      setApplications((prev) => {
        const map = new Map<string, ApplicationWithJob>();
        prev.forEach((p) => map.set(p.id, p));
        list.forEach((n) => map.set(n.id, n));
        const arr = Array.from(map.values()).sort((a, b) => {
          const aT = (a.lastUpdated ?? a.appliedAt)?.getTime?.() ?? 0;
          const bT = (b.lastUpdated ?? b.appliedAt)?.getTime?.() ?? 0;
          return bT - aT;
        });
        return arr;
      });
    };

    primaryUnsub = onSnapshot(qAppsByEmployer, handleAppsSnapshot, (err) => {
      console.error('Applications listener error:', err);
      setError('Failed to load applications.');
      setLoading(false);
    });

    return () => {
      if (primaryUnsub) primaryUnsub();
      if (fallbackUnsubs.length) fallbackUnsubs.forEach((u) => u());
    };
  }, [uid, jobs]);

  // ----- Filters / stats -----
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchStatus = filterStatus === 'all' || app.status === filterStatus;
      const matchJob = filterJob === 'all' || app.jobId === filterJob;
      return matchStatus && matchJob;
    });
  }, [applications, filterStatus, filterJob]);

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    reviewing: applications.filter((a) => a.status === 'reviewing').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }), [applications]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // ----- Accept / Reject / etc. -----
  const handleStatusUpdate = async (application: ApplicationWithJob, newStatus: AppStatus) => {
    try {
      await updateDoc(doc(db, 'applications', application.id), {
        status: newStatus,
        lastUpdated: Timestamp.now(),
      });

      // ✅ functional update returns ApplicationWithJob[]
      setApplications((prev) =>
        prev.map((a) =>
          a.id === application.id ? { ...a, status: newStatus, lastUpdated: new Date() } : a
        )
      );

      // Optional: notify the student (works with your bell)
      if (application.studentId) {
        await addDoc(collection(db, 'users', application.studentId, 'notifications'), {
          type: 'application_status',
          title: `Application ${newStatus}`,
          body: `${application.companyName || ''} — ${application.jobTitle || ''}`.trim(),
          appId: application.id,
          jobId: application.jobId ?? null,
          status: newStatus,
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    } catch (e) {
      console.error('Error updating application status:', e);
    }
  };

  if (!uid) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center">
        <p className="text-gray-600">Please sign in as an employer to view applicants.</p>
      </div>
    );
  }

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

      {/* Main */}
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
              {jobs.map((job) => (
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
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        {/* List */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {app.studentName && <div className="text-sm font-medium text-gray-900">{app.studentName}</div>}
                        {app.studentEmail && <div className="text-sm text-gray-500">{app.studentEmail}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.jobTitle || 'Unknown Position'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.appliedAt ? app.appliedAt.toLocaleDateString() : '—'}
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
                          onChange={(e) => handleStatusUpdate(app, e.target.value as AppStatus)}
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

      {/* Modal */}
      {showModal && selectedApplication && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Application Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">Applicant</h4>
                {selectedApplication.studentName && (
                  <p className="mt-1 text-gray-600">{selectedApplication.studentName}</p>
                )}
                {selectedApplication.studentEmail && (
                  <p className="text-sm text-gray-500">{selectedApplication.studentEmail}</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Position</h4>
                <p className="mt-1 text-gray-600">{selectedApplication.jobTitle || 'Unknown Position'}</p>
              </div>
              {selectedApplication.appliedAt && (
                <div>
                  <h4 className="font-semibold text-gray-900">Applied Date</h4>
                  <p className="mt-1 text-gray-600">
                    {selectedApplication.appliedAt.toLocaleString()}
                  </p>
                </div>
              )}
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
                <a
                  href={selectedApplication.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-primary hover:text-blue-700 inline-flex items-center"
                >
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
