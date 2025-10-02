import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Job } from '../types';
import { JobCard } from '../components/student/JobCard';
import { ProfileDropdown } from '../components/shared/ProfileDropdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SiteHeader } from '../components/shared/SiteHeader';
import { useSavedJobs } from '../hooks/useSavedJobs'; 

export const JobsListing: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { user } = useAuth();
  const uid = user?.id || null;
  const navigate = useNavigate();

  const { isSaved, toggle } = useSavedJobs(uid);

  useEffect(() => {
    fetchJobs();
  }, [filterType, filterLocation]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let jobsQuery = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));

      // Apply filters
      if (filterType !== 'all') {
        jobsQuery = query(jobsQuery, where('type', '==', filterType));
      }

      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsData: Job[] = [];

      jobsSnapshot.forEach((doc) => {
        const data = doc.data();
        jobsData.push({
          id: doc.id,
          employerId: data.employerId || '',
          companyName: data.companyName || 'Unknown Company',
          title: data.title || 'Untitled Position',
          description: data.description || '',
          location: data.location || 'Not specified',
          type: data.type || 'full-time',
          skills: data.skills || [],
          salary: data.salary,
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          viewCount: data.viewCount || 0,
          applicationCount: data.applicationCount || 0,
        } as Job);
      });

      // Filter by location if needed (client-side for now)
      let filteredJobs = jobsData;
      if (filterLocation !== 'all') {
        filteredJobs = jobsData.filter(job =>
          job.location.toLowerCase().includes(filterLocation.toLowerCase())
        );
      }

      // Filter by search term
      if (searchTerm) {
        filteredJobs = filteredJobs.filter(job =>
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      setJobs(filteredJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Set some fallback data if Firebase fails
      setJobs([
        {
          id: '1',
          employerId: 'emp1',
          companyName: 'TechCorp Inc.',
          title: 'Frontend Developer Intern',
          description: 'Join our dynamic team to build cutting-edge web applications using React and TypeScript.',
          location: 'Toronto, ON',
          type: 'internship',
          skills: ['React', 'TypeScript', 'Tailwind CSS'],
          salary: { min: 40000, max: 50000, currency: 'CAD' },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          viewCount: 245,
          applicationCount: 12,
        },
        {
          id: '2',
          employerId: 'emp2',
          companyName: 'DataSoft Solutions',
          title: 'Backend Developer Co-op',
          description: 'Work on scalable backend systems using Node.js and cloud technologies.',
          location: 'Remote',
          type: 'full-time',
          skills: ['Node.js', 'AWS', 'MongoDB'],
          salary: { min: 60000, max: 80000, currency: 'CAD' },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          viewCount: 189,
          applicationCount: 8,
        },
        {
          id: '3',
          employerId: 'emp3',
          companyName: 'StartupHub',
          title: 'Full Stack Developer',
          description: 'Looking for a versatile full stack developer to join our growing startup.',
          location: 'Vancouver, BC',
          type: 'full-time',
          skills: ['React', 'Node.js', 'PostgreSQL'],
          salary: { min: 70000, max: 90000, currency: 'CAD' },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          viewCount: 156,
          applicationCount: 15,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (jobId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Navigate to application page
    navigate(`/apply/${jobId}`);
  };

  const handleSave = (jobId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    console.log('Saving job:', jobId);
    // TODO: Implement save functionality
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Find Your Dream Internship</h1>
          <p className="text-xl mb-8">Discover opportunities from top companies across Canada</p>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-2 flex">
              <input
                type="text"
                placeholder="Search by job title, company, or skills..."
                className="flex-1 px-4 py-2 text-gray-900 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and View Options */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="internship">Internship</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
            </select>

            {/* Location Filter */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Locations</option>
              <option value="remote">Remote</option>
              <option value="toronto">Toronto</option>
              <option value="vancouver">Vancouver</option>
              <option value="montreal">Montreal</option>
              <option value="waterloo">Waterloo</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-600">{jobs.length} jobs found</span>

            {/* View Mode Toggle */}
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

      {/* Jobs Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
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
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={Boolean(isSaved?.(job.id))}
                onApply={handleApply}
                onSave={() => {
                  if (!uid) return navigate('/login');
                  try {
                    toggle(uid, job);
                  } catch (e) {
                    console.error('Failed to toggle job', e);
                  } 
              }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};