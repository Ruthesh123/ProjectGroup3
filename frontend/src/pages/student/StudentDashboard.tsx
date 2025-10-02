import React, { useEffect, useMemo, useState } from 'react';
import { JobCard } from '../../components/student/JobCard';
import { ProfileDropdown } from '../../components/shared/ProfileDropdown';
import { Job } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedJobs } from '../../hooks/useSavedJobs';
import { useNavigate } from 'react-router-dom';

import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export const StudentDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    type: '',
    skills: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const uid = user?.id || null;
  const navigate = useNavigate();
  const { isSaved, toggle } = useSavedJobs(uid);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load jobs from Firestore (tries createdAt ordering first, then falls back)
  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      let snap;
      try {
        const q1 = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
        snap = await getDocs(q1);
      } catch {
        // If createdAt isn’t present on some docs, just fetch without order
        const { getDocs: getDocsOnly, collection: collOnly } = await import('firebase/firestore');
        snap = await getDocsOnly(collOnly(db, 'jobs'));
      }

      const rows: Job[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          employerId: data.employerId || '',
          companyName: data.companyName || 'Unknown Company',
          title: data.title || 'Untitled Position',
          description: data.description || '',
          location: data.location || 'Not specified',
          type: data.type || 'full-time',
          skills: Array.isArray(data.skills) ? data.skills : [],
          salary: data.salary ?? null,
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate?.() || new Date(0),
          updatedAt: data.updatedAt?.toDate?.() || new Date(0),
          viewCount: data.viewCount || 0,
          applicationCount: data.applicationCount || 0,
        } as Job;
      });

      // If not ordered at query level, sort by createdAt client-side
      const sorted = [...rows].sort(
        (a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0)
      );

      setJobs(sorted);
    } catch (e: any) {
      console.error('Failed to fetch jobs:', e);
      setError(e?.message || 'Failed to fetch jobs.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Derived list after search + filters (all client-side for now)
  const visibleJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !term ||
        job.title.toLowerCase().includes(term) ||
        job.companyName.toLowerCase().includes(term) ||
        (job.skills || []).some((s) => s.toLowerCase().includes(term));

      const matchesType = !filters.type || job.type === filters.type;

      const matchesLocation =
        !filters.location ||
        (job.location || '').toLowerCase().includes(filters.location.toLowerCase());

      const matchesSkills =
        !filters.skills?.length ||
        filters.skills.every((s) =>
          (job.skills || []).map((x) => x.toLowerCase()).includes(s.toLowerCase())
        );

      return matchesSearch && matchesType && matchesLocation && matchesSkills;
    });
  }, [jobs, searchTerm, filters]);

  // Handlers (mirror JobsListing)
  const handleApply = (jobId: string) => {
    if (!uid) return navigate('/login');
    navigate(`/apply/${jobId}`);
  };

  const handleSave = (jobId: string) => {
    if (!uid) return navigate('/login');
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    toggle(uid, job);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">InternLink</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="/jobs" className="text-gray-700 hover:text-primary">Browse Jobs</a>
              <a href="/student/applications" className="text-gray-700 hover:text-primary">My Applications</a>
              <a href="/profile" className="text-gray-700 hover:text-primary">Profile</a>
              <a href="/student/saved" className="text-gray-700 hover:text-primary">Saved Jobs</a>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Search / quick controls */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search jobs by title, company, or skills..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Type filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="">All Types</option>
              <option value="internship">Internship</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
            </select>

            {/* Location filter (contains) */}
            <input
              value={filters.location}
              onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
              placeholder="Filter by location"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />

            {/* View toggle */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-600'} rounded-l-lg`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-600'} rounded-r-lg`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Available Opportunities</h2>
          <p className="text-gray-600">{visibleJobs.length} jobs found</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={() => handleApply(job.id)}
                onSave={() => handleSave(job.id)}
                // If your JobCard supports showing a saved state, you can pass:
                // saved={uid ? isSaved(job.id) : false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
