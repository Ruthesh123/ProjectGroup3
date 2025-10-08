import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Job } from '../../types';
import { SiteHeader } from '../../components/shared/SiteHeader';

type JobDoc = Partial<Job> & {
  id: string;
  // current PostJob shapes
  skills?: string[];
  salary?: any; // string | number | { min, max, currency } | null
  requirements?: string | string[];
  benefits?: string | string[];
  applicationCount?: number;
  viewCount?: number;
  createdAt?: any; // Timestamp | Date | string
  status?: string;
  type?: string;
  location?: string;
  companyName?: string;
  title?: string;
  description?: string;
  employerId?: string;
};

function formatSalary(s: any): string | null {
  if (!s) return null;
  if (typeof s === 'string') return s;
  if (typeof s === 'number') return `${s}`;
  const cur = s?.currency ? `${s.currency} ` : '';
  const min = typeof s?.min === 'number' ? s.min.toLocaleString() : null;
  const max = typeof s?.max === 'number' ? s.max.toLocaleString() : null;
  if (min && max) return `${cur}${min} – ${cur}${max}`;
  if (min) return `${cur}${min}`;
  if (max) return `${cur}${max}`;
  return null;
}

function toLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function toDateString(v: any): string {
  try {
    if (!v) return '—';
    if (typeof v?.toDate === 'function') return v.toDate().toLocaleDateString();
    const d = typeof v === 'string' ? new Date(v) : v;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
  } catch {
    return '—';
  }
}

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useAuth(); // not used here for uid; /apply route can handle auth

  const [job, setJob] = useState<JobDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setNotFound(false);
      try {
        const ref = doc(db, 'jobs', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = snap.data() as Partial<JobDoc>;
        if (!cancelled) setJob({ ...data, id: snap.id } as JobDoc);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const salaryText = formatSalary(job?.salary);
  const requirementLines = toLines(job?.requirements);
  const benefitLines = toLines(job?.benefits);

  const handleApply = () => {
    if (!id) return;
    navigate(`/apply/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading */}
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-2/3 bg-gray-200 rounded" />
            <div className="h-5 w-1/3 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-64 bg-gray-100 rounded lg:col-span-2" />
              <div className="h-48 bg-gray-100 rounded" />
            </div>
          </div>
        )}

        {/* Not found */}
        {!loading && (notFound || !job) && (
          <div className="text-center">
            <h1 className="text-xl font-semibold">Job not found</h1>
            <p className="text-gray-600 mt-2">The job may have been removed or the link is invalid.</p>
            <Link to="/jobs" className="text-blue-600 hover:underline mt-4 inline-block">
              Back to Jobs
            </Link>
          </div>
        )}

        {/* Content */}
        {!loading && job && (
          <>
            {/* Breadcrumbs */}
            <nav className="text-sm text-gray-500 mb-4">
              <Link to="/jobs" className="hover:underline">Jobs</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-700">{job.title}</span>
            </nav>

            {/* Hero header */}
            <div className="bg-white border rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex items-start gap-4">
                {/* Logo placeholder */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 text-blue-700 grid place-items-center font-semibold">
                  {(job.companyName || 'C')[0]}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">{job.title}</h1>
                  <p className="text-gray-600 mt-1">{job.companyName}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
                    {job.type && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.type}
                      </span>
                    )}
                    {job.location && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {job.location}
                      </span>
                    )}
                    {salaryText && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {salaryText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats (desktop) */}
                <div className="hidden sm:flex flex-col items-end gap-1 text-sm text-gray-600">
                  <div>{job.applicationCount ?? 0} applicants</div>
                  <div>{job.viewCount ?? 0} views</div>
                  <div>Posted {toDateString(job.createdAt)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <section className="bg-white border rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">About the role</h2>
                  <p className="text-gray-700 mt-2 whitespace-pre-line">
                    {job.description || 'No description provided.'}
                  </p>
                </section>

                {/* Skills */}
                {!!(job.skills && job.skills.length) && (
                  <section className="bg-white border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Requirements */}
                {requirementLines.length > 0 && (
                  <section className="bg-white border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Requirements</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {requirementLines.map((r, idx) => <li key={idx}>{r}</li>)}
                    </ul>
                  </section>
                )}

                {/* Benefits */}
                {benefitLines.length > 0 && (
                  <section className="bg-white border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Benefits</h3>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      {benefitLines.map((b, idx) => <li key={idx}>{b}</li>)}
                    </ul>
                  </section>
                )}
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="bg-white border rounded-2xl p-6 shadow-sm sticky top-6">
                  <button
                    onClick={handleApply}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                  >
                    Apply Now
                  </button>

                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Employment</dt>
                      <dd className="font-medium text-gray-900">{job.type || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Location</dt>
                      <dd className="font-medium text-gray-900">{job.location || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Salary</dt>
                      <dd className="font-medium text-gray-900">{salaryText || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Applicants</dt>
                      <dd className="font-medium text-gray-900">{job.applicationCount ?? 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Views</dt>
                      <dd className="font-medium text-gray-900">{job.viewCount ?? 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Posted</dt>
                      <dd className="font-medium text-gray-900">{toDateString(job.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="mt-6 text-center">
                    <Link to="/jobs" className="text-blue-600 hover:underline text-sm">
                      ← Back to Jobs
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JobDetails;
