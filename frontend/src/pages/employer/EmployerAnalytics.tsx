import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileDropdown } from '../../components/shared/ProfileDropdown';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Local types to avoid conflicts with your global Application type
type AppStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn' | string;

interface JobRow {
  id: string;
  title: string;
  companyName: string;
  status: string;
  viewCount: number;
  applicationCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ApplicationRow {
  id: string;
  jobId: string;
  studentId?: string;
  status: AppStatus;
  appliedAt: Date;       // normalized, never undefined
  lastUpdated?: Date;
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

export const EmployerAnalytics: React.FC = () => {
  const { user } = useAuth() as any;
  const navigate = useNavigate();

  // Prefer Firebase uid; fallback to custom id if your AuthContext uses that
  const uid: string | null = user?.uid ?? user?.id ?? null;

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== Listen to employer's jobs =====
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    const qJobs = query(collection(db, 'jobs'), where('employerId', '==', uid));
    const unsub = onSnapshot(
      qJobs,
      (snap) => {
        const rows: JobRow[] = snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            title: String(data.title || 'Untitled'),
            companyName: String(data.companyName || 'Unknown'),
            status: String(data.status || 'active'),
            viewCount: Number(data.viewCount || 0),
            applicationCount: Number(data.applicationCount || 0),
            createdAt: toDateSafe(data.createdAt),
            updatedAt: toDateSafe(data.updatedAt),
          };
        });
        setJobs(rows);
      },
      (err) => {
        console.error('Jobs listener error:', err);
        setError('Failed to load jobs.');
      }
    );

    return () => unsub();
  }, [uid]);

  // ===== Listen to employer's applications (employerId first; fallback to jobId chunks) =====
  useEffect(() => {
    if (!uid) return;

    setApplications([]);
    setLoading(true);

    const qApps = query(collection(db, 'applications'), where('employerId', '==', uid));
    const fallbackUnsubs: Array<() => void> = [];
    let primaryUnsub: (() => void) | null = null;

    const normalizeAppsSnapshot = (snap: QuerySnapshot<DocumentData>) => {
      return snap.docs.map((d) => {
        const data: any = d.data();
        const applied = toDateSafe(data.appliedAt ?? data.appliedDate) || new Date(0);
        const lastUpd = toDateSafe(data.lastUpdated ?? data.updatedAt);
        const row: ApplicationRow = {
          id: d.id,
          jobId: String(data.jobId || ''),
          studentId: data.studentId ? String(data.studentId) : undefined,
          status: (data.status ?? 'pending') as AppStatus,
          appliedAt: applied,
          lastUpdated: lastUpd,
        };
        return row;
      });
    };

    const mergeAndSet = (list: ApplicationRow[]) => {
      setApplications((prev) => {
        const map = new Map<string, ApplicationRow>();
        prev.forEach((p) => map.set(p.id, p));
        list.forEach((n) => map.set(n.id, n));
        // newest by lastUpdated -> appliedAt
        const arr = Array.from(map.values()).sort((a, b) => {
          const aT = (a.lastUpdated ?? a.appliedAt).getTime();
          const bT = (b.lastUpdated ?? b.appliedAt).getTime();
          return bT - aT;
        });
        return arr;
      });
    };

    const handlePrimary = async (snap: QuerySnapshot<DocumentData>) => {
      if (!snap.empty) {
        mergeAndSet(normalizeAppsSnapshot(snap));
        setLoading(false);
        return;
      }

      // Fallback: if employerId isn't stored on applications, read by jobId chunks (<=10)
      if (jobs.length > 0) {
        if (primaryUnsub) primaryUnsub();
        const idChunks = chunk(jobs.map((j) => j.id), 10);
        setApplications([]);
        idChunks.forEach((ids) => {
          const qChunk = query(collection(db, 'applications'), where('jobId', 'in', ids));
          const unsub = onSnapshot(
            qChunk,
            (s) => mergeAndSet(normalizeAppsSnapshot(s)),
            (e) => console.error('Applications fallback error:', e)
          );
          fallbackUnsubs.push(unsub);
        });
      }
      setLoading(false);
    };

    primaryUnsub = onSnapshot(qApps, handlePrimary, (err) => {
      console.error('Applications listener error:', err);
      setError('Failed to load applications.');
      setLoading(false);
    });

    return () => {
      if (primaryUnsub) primaryUnsub();
      if (fallbackUnsubs.length) fallbackUnsubs.forEach((u) => u());
    };
  }, [uid, jobs]);

  // ===== Derived metrics =====
  const totalJobs = jobs.length;
  const activeJobs = useMemo(() => jobs.filter((j) => j.status === 'active').length, [jobs]);
  const totalViews = useMemo(() => jobs.reduce((sum, j) => sum + (j.viewCount || 0), 0), [jobs]);
  const totalApplications = applications.length;

  const avgApplicantsPerJob = totalJobs ? (totalApplications / totalJobs) : 0;
  const conversionRate = totalViews ? (totalApplications / totalViews) : 0;

  // Top jobs by applicants (use live applications count by job for accuracy)
  const appsByJob = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of applications) {
      if (!a.jobId) continue;
      m.set(a.jobId, (m.get(a.jobId) || 0) + 1);
    }
    return m;
  }, [applications]);

  const topByApplicants = useMemo(() => {
    const rows = jobs
      .map((j) => ({ job: j, count: appsByJob.get(j.id) || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return rows;
  }, [jobs, appsByJob]);

  const topByViews = useMemo(() => {
    return [...jobs].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5);
  }, [jobs]);

  // Applications trend (last 30 days)
  const dailySeries = useMemo(() => {
    const days = 30;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const buckets: { [ymd: string]: number } = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    for (const a of applications) {
      const d = new Date(a.appliedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      if (key in buckets) buckets[key] += 1;
    }

    const series = Object.entries(buckets).map(([date, count]) => ({ date, count }));
    const max = series.reduce((m, x) => Math.max(m, x.count), 0);
    return { series, max };
  }, [applications]);

  if (!uid) {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center">
        <p className="text-gray-600">Please sign in as an employer to view analytics.</p>
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
              <button
                onClick={() => navigate('/employer/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
                title="Back to Dashboard"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            </div>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Active Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : activeJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Total Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : totalJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Total Views</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : totalViews}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Total Applicants</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : totalApplications}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Avg Applicants / Job</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '—' : avgApplicantsPerJob.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Trend (last 30 days) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Applications (Last 30 Days)</h3>
          </div>
          <div className="px-6 py-6">
            {loading ? (
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
            ) : (
              <div className="space-y-2">
                {/* simple horizontal bars without extra libs */}
                {dailySeries.series.map(({ date, count }) => {
                  const pct = dailySeries.max ? Math.round((count / dailySeries.max) * 100) : 0;
                  const label = new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  return (
                    <div key={date} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-gray-500">{label}</div>
                      <div className="flex-1 h-3 bg-gray-100 rounded">
                        <div
                          className="h-3 rounded bg-blue-600 transition-all"
                          style={{ width: `${pct}%` }}
                          title={`${count} application${count !== 1 ? 's' : ''}`}
                        />
                      </div>
                      <div className="w-10 text-xs text-gray-600 text-right">{count}</div>
                    </div>
                  );
                })}
                {dailySeries.max === 0 && (
                  <p className="text-sm text-gray-500">No applications in the last 30 days.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top Jobs by Applicants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Top Jobs by Applicants</h3>
            </div>
            <div className="divide-y">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between animate-pulse">
                    <div className="h-4 w-48 bg-gray-100 rounded" />
                    <div className="h-4 w-10 bg-gray-100 rounded" />
                  </div>
                ))
              ) : topByApplicants.length === 0 ? (
                <div className="px-6 py-8 text-sm text-gray-500">No applications yet.</div>
              ) : (
                topByApplicants.map(({ job, count }) => (
                  <div key={job.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{job.title}</div>
                      <div className="text-sm text-gray-500">{job.companyName}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{count}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Jobs by Views */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Top Jobs by Views</h3>
            </div>
            <div className="divide-y">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between animate-pulse">
                    <div className="h-4 w-48 bg-gray-100 rounded" />
                    <div className="h-4 w-10 bg-gray-100 rounded" />
                  </div>
                ))
              ) : topByViews.length === 0 ? (
                <div className="px-6 py-8 text-sm text-gray-500">No views yet.</div>
              ) : (
                topByViews.map((job) => (
                  <div key={job.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{job.title}</div>
                      <div className="text-sm text-gray-500">{job.companyName}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{job.viewCount}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Conversion */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Conversion</h3>
          </div>
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Views → Applicants</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : `${(conversionRate * 100).toFixed(1)}%`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalApplications} / {totalViews} ({totalViews === 0 ? 'n/a' : 'last total'})
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Applicants</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : totalApplications}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Views</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : totalViews}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployerAnalytics;
