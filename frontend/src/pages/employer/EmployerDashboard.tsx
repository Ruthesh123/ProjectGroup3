import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileDropdown } from '../../components/shared/ProfileDropdown';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

type AppStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn' | string;

interface Application {
  id: string;
  employerId?: string;
  studentId?: string;
  companyName?: string;
  jobId?: string;
  jobTitle?: string;
  status: AppStatus;
  appliedDate?: Date;
  lastUpdated?: Date;
}

interface JobRow {
  id: string;
  employerId?: string;
  status?: string;
}

export const EmployerDashboard: React.FC = () => {
  const [activeTab] = useState('overview'); // kept for future tabs
  const navigate = useNavigate();

  const { user } = useAuth() as any;
  // prefer Firebase uid; fallback to any custom id if your context uses that
  const uid: string | null = user?.uid ?? user?.id ?? null;

  // Live data
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // utils
  const safeToDate = (v: any): Date | undefined => {
    if (!v) return undefined;
    if (typeof v?.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const timeAgo = (d?: Date) => {
    if (!d) return '—';
    const now = Date.now();
    const diff = Math.max(0, now - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  };

  useEffect(() => {
    if (!uid) return;

    setLoading(true);

    // Live jobs for this employer
    const jobsQ = query(collection(db, 'jobs'), where('employerId', '==', uid));
    const unsubJobs = onSnapshot(jobsQ, (snap) => {
      const rows: JobRow[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          employerId: data.employerId,
          status: data.status ?? 'active',
        };
      });
      setJobs(rows);
    });

    // Live applications for this employer
    const appsQ = query(collection(db, 'applications'), where('employerId', '==', uid));
    const unsubApps = onSnapshot(appsQ, (snap) => {
      const rows: Application[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          employerId: data.employerId,
          studentId: data.studentId,
          companyName: data.companyName,
          jobId: data.jobId,
          jobTitle: data.jobTitle,
          status: data.status ?? 'pending',
          appliedDate: safeToDate(data.appliedDate ?? data.appliedAt),
          lastUpdated: safeToDate(data.lastUpdated),
        };
      });
      setApplications(rows);
      setLoading(false);
    });

    return () => {
      unsubJobs();
      unsubApps();
    };
  }, [uid]);

  // ----- Derived metrics -----
  const activeJobs = useMemo(
    () => jobs.filter((j) => (j.status ?? 'active') === 'active').length,
    [jobs]
  );

  const totalApplicants = useMemo(() => applications.length, [applications]);

  const pendingReview = useMemo(
    () => applications.filter((a) => a.status === 'pending' || a.status === 'reviewing').length,
    [applications]
  );

  const hiredThisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-based
    return applications.filter((a) => {
      if (a.status !== 'accepted') return false;
      const d = a.lastUpdated ?? a.appliedDate;
      if (!d) return false;
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  }, [applications]);

  // Recent applications (latest first) — sort by lastUpdated -> appliedDate
  const recentApps = useMemo(() => {
    const sorted = [...applications].sort((a, b) => {
      const aT = (a.lastUpdated ?? a.appliedDate)?.getTime?.() ?? 0;
      const bT = (b.lastUpdated ?? b.appliedDate)?.getTime?.() ?? 0;
      return bT - aT;
    });
    return sorted.slice(0, 5);
  }, [applications]);

  // Loading skeletons (keep your current look)
  if (!uid) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center">
        <p className="text-gray-600">Please sign in as an employer to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">InternLink Employer</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="/employer/jobs" className="text-gray-700 hover:text-primary">My Jobs</a>
              <a href="/employer/applicants" className="text-gray-700 hover:text-primary">Applicants</a>
              <a href="/employer/analytics" className="text-gray-700 hover:text-primary">Analytics</a>
              <a href="/employer/profile" className="text-gray-700 hover:text-primary">Company Profile</a>
            </nav>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/employer/post-job')}
              className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 flex flex-col items-center transition-colors"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Post New Job
            </button>
            <button
              onClick={() => navigate('/employer/applicants')}
              className="bg-white border border-gray-300 p-4 rounded-lg hover:bg-gray-50 flex flex-col items-center transition-colors"
            >
              <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 4 4 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View Applicants
            </button>
            <button
              onClick={() => navigate('/employer/analytics')}
              className="bg-white border border-gray-300 p-4 rounded-lg hover:bg-gray-50 flex flex-col items-center transition-colors"
            >
              <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Analytics
            </button>
            <button
              onClick={() => navigate('/employer/profile')}
              className="bg-white border border-gray-300 p-4 rounded-lg hover:bg-gray-50 flex flex-col items-center transition-colors"
            >
              <svg className="w-8 h-8 mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Active Jobs */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : activeJobs}
                </p>
              </div>
              <div className="text-green-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 01-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Applicants */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Total Applicants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : totalApplicants}
                </p>
              </div>
              <div className="text-blue-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : pendingReview}
                </p>
              </div>
              <div className="text-yellow-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Hired This Month */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Hired This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : hiredThisMonth}
                </p>
              </div>
              <div className="text-purple-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
          </div>

          {loading ? (
            <div className="divide-y">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div>
                        <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-60 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="h-5 w-24 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="divide-y">
                {recentApps.length === 0 ? (
                  <div className="px-6 py-10 text-center text-gray-500">
                    No recent applications yet.
                  </div>
                ) : recentApps.map((a) => (
                  <div key={a.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 grid place-items-center">
                          <span className="text-gray-500 text-sm font-semibold">
                            {(a.companyName || 'C')[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {a.jobTitle || 'Unknown Position'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {a.companyName || 'Your company'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          a.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          a.status === 'reviewing' ? 'bg-blue-100 text-blue-800' :
                          a.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          a.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          a.status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {String(a.status).replace(/^\w/, (c) => c.toUpperCase())}
                        </span>
                        <span className="text-sm text-gray-500">
                          {timeAgo(a.lastUpdated ?? a.appliedDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t">
                <a href="/employer/applicants" className="text-sm text-primary hover:text-blue-700">
                  View all applications →
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
