import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  addDoc,
  getDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  BookmarkX,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  Search,
  Filter,
  ExternalLink,
  Send,
} from 'lucide-react';

interface SavedJob {
  id: string;              // saved doc id (== jobId)
  jobId: string;
  title: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  type: string;
  salary?: string;
  description: string;
  requirements: string[];
  savedDate: Date;
  deadline?: Date;
  isActive: boolean;
  hasApplied: boolean;
  employerId?: string;
  resumeUrl?: string;      // optional if you want to prefill application
  coverLetter?: string;    // optional if you want to prefill application
}

export const StudentSavedJobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedJobs();
    } else {
      setSavedJobs([]);
      setFilteredJobs([]);
    }
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [savedJobs, searchTerm, filterType]);

  const fetchSavedJobs = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // READ FROM users/{user.id}/savedJobs  ✅
      const savedCol = collection(db, 'users', user.id, 'savedJobs');
      // try to order by savedAt if available; otherwise plain query
      let savedSnap;
      try {
        savedSnap = await getDocs(query(savedCol, orderBy('savedAt', 'desc')));
      } catch {
        savedSnap = await getDocs(savedCol);
      }

      const jobsData: SavedJob[] = [];

      for (const d of savedSnap.docs) {
        const data: any = d.data();
        const jobId = data.jobId || d.id;

        // fetch full job doc for rich details (title/companyName already denormalized)
        let jobData: any = {};
        try {
          const jobDoc = await getDoc(doc(db, 'jobs', jobId));
          if (jobDoc.exists()) jobData = jobDoc.data();
        } catch (_) {}

        // check applications for this user+job to mark "Applied"
        const appsQ = query(
          collection(db, 'applications'),
          where('studentId', '==', user.id),       // ✅ use user.id
          where('jobId', '==', jobId)
        );
        const appsSnap = await getDocs(appsQ);
        const hasApplied = !appsSnap.empty;

        jobsData.push({
          id: d.id, // saved doc id (we set doc id == jobId in our save flow)
          jobId,
          title: jobData.title ?? data.title ?? 'Unknown Position',
          companyName: jobData.companyName ?? data.companyName ?? 'Unknown Company',
          companyLogo: jobData.companyLogo,
          location: jobData.location ?? data.location ?? 'Remote',
          type: jobData.type ?? data.type ?? 'Full-time',
          salary:
            typeof jobData.salary === 'string'
              ? jobData.salary
              : jobData.salary?.range || data.salary,
          description: jobData.description ?? data.description ?? '',
          requirements: Array.isArray(jobData.requirements) ? jobData.requirements : [],
          savedDate: (data.savedAt?.toDate?.() || data.savedDate?.toDate?.() || new Date()) as Date,
          deadline: jobData.deadline?.toDate?.(),
          isActive: (jobData.status ?? 'active') === 'active',
          hasApplied,
          employerId: jobData.employerId,
        });
      }

      // Stable sort by savedDate desc
      jobsData.sort((a, b) => b.savedDate.getTime() - a.savedDate.getTime());
      setSavedJobs(jobsData);
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      setSavedJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...savedJobs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.companyName.toLowerCase().includes(term) ||
          job.location.toLowerCase().includes(term)
      );
    }

    if (filterType === 'active') {
      filtered = filtered.filter(
        (job) => job.isActive && (!job.deadline || job.deadline > new Date())
      );
    } else if (filterType === 'expired') {
      filtered = filtered.filter(
        (job) => !job.isActive || (job.deadline && job.deadline < new Date())
      );
    } else if (filterType === 'applied') {
      filtered = filtered.filter((job) => job.hasApplied);
    } else if (filterType === 'notApplied') {
      filtered = filtered.filter((job) => !job.hasApplied);
    }

    filtered.sort((a, b) => b.savedDate.getTime() - a.savedDate.getTime());
    setFilteredJobs(filtered);
  };

  // Remove from saved: users/{user.id}/savedJobs/{jobId}  ✅
  const unsaveJob = async (savedJobId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to remove this job from your saved list?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.id, 'savedJobs', savedJobId));
      setSavedJobs((prev) => prev.filter((j) => j.id !== savedJobId));
    } catch (error) {
      console.error('Error removing saved job:', error);
      alert('Failed to remove job. Please try again.');
    }
  };

  // Create application with your 8 fields + prevent duplicates  ✅
  const applyToJob = async (job: SavedJob) => {
    if (!user) return;

    try {
      // prevent double apply
      const existsQ = query(
        collection(db, 'applications'),
        where('studentId', '==', user.id),
        where('jobId', '==', job.jobId)
      );
      const existsSnap = await getDocs(existsQ);
      if (!existsSnap.empty) {
        alert('You have already applied to this job.');
        return;
      }

      await addDoc(collection(db, 'applications'), {
        companyName: job.companyName,         // 1
        coverLetter: '',                      // 2 (fill from profile or a form)
        employerId: job.employerId || '',     // 3
        jobId: job.jobId,                     // 4
        jobTitle: job.title,                  // 5
        resume: '',                           // 6 (URL to resume)
        status: 'pending',                    // 7
        studentId: user.id,                   // 8
        appliedDate: Timestamp.now(),         // extra (ok to have more fields)
        lastUpdated: Timestamp.now(),
      });

      setSavedJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, hasApplied: true } : j))
      );

      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying to job:', error);
      alert('Failed to submit application. Please try again.');
    }
  };

  const getDaysUntilDeadline = (deadline: Date) => {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Saved Jobs</h1>
          <p className="text-gray-600 mt-2">Jobs you've bookmarked for later</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Saved</p>
                <p className="text-2xl font-bold text-gray-900">{savedJobs.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Bookmark className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-green-600">
                  {savedJobs.filter(
                    (job) => job.isActive && (!job.deadline || job.deadline > new Date())
                  ).length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Applied</p>
                <p className="text-2xl font-bold text-blue-600">
                  {savedJobs.filter((job) => job.hasApplied).length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">
                  {savedJobs.filter((job) => {
                    if (!job.deadline) return false;
                    const days = getDaysUntilDeadline(job.deadline);
                    return days > 0 && days <= 7;
                  }).length}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
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
                  placeholder="Search saved jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Jobs</option>
                  <option value="active">Active Only</option>
                  <option value="expired">Expired</option>
                  <option value="applied">Applied</option>
                  <option value="notApplied">Not Applied</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredJobs.length} of {savedJobs.length} saved jobs
            </div>
          </div>
        </div>

        {/* Saved Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
              <BookmarkX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No saved jobs found</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Browse jobs and save them for later'}
              </p>
              <button
                onClick={() => navigate('/jobs')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Browse Jobs
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                  !job.isActive || (job.deadline && job.deadline < new Date())
                    ? 'opacity-75'
                    : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          alt={job.companyName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500 font-bold">
                            {job.companyName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        <p className="text-sm text-gray-600">{job.companyName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => unsaveJob(job.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove from saved"
                    >
                      <BookmarkX className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Briefcase className="h-4 w-4" />
                      {job.type}
                    </div>
                    {job.salary && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        {job.salary}
                      </div>
                    )}
                  </div>

                  {job.deadline && (
                    <div className="mb-4">
                      {getDaysUntilDeadline(job.deadline) > 0 ? (
                        <span
                          className={`text-sm ${
                            getDaysUntilDeadline(job.deadline) <= 7
                              ? 'text-orange-600 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          <Clock className="inline h-3 w-3 mr-1" />
                          {getDaysUntilDeadline(job.deadline) === 1
                            ? 'Expires tomorrow'
                            : `Expires in ${getDaysUntilDeadline(job.deadline)} days`}
                        </span>
                      ) : (
                        <span className="text-sm text-red-600 font-medium">
                          <Clock className="inline h-3 w-3 mr-1" />
                          Expired
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setShowModal(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View Details
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    {job.hasApplied ? (
                      <span className="text-sm text-green-600 font-medium">✓ Applied</span>
                    ) : job.isActive && (!job.deadline || job.deadline > new Date()) ? (
                      <button
                        onClick={() => applyToJob(job)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Apply Now
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">Not Available</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Job Details Modal */}
        {showModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedJob.title}</h3>
                    <p className="text-gray-600">{selectedJob.companyName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="text-gray-900">{selectedJob.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Job Type</p>
                      <p className="text-gray-900">{selectedJob.type}</p>
                    </div>
                    {selectedJob.salary && (
                      <div>
                        <p className="text-sm text-gray-500">Salary</p>
                        <p className="text-gray-900">{selectedJob.salary}</p>
                      </div>
                    )}
                    {selectedJob.deadline && (
                      <div>
                        <p className="text-sm text-gray-500">Application Deadline</p>
                        <p className="text-gray-900">{selectedJob.deadline.toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Description</p>
                    <p className="text-gray-700">{selectedJob.description}</p>
                  </div>

                  {selectedJob.requirements.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Requirements</p>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedJob.requirements.map((req, index) => (
                          <li key={index} className="text-gray-700">{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      Saved on {selectedJob.savedDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => unsaveJob(selectedJob.id)}
                    className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    Remove from Saved
                  </button>
                  {selectedJob.hasApplied ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                    >
                      Already Applied
                    </button>
                  ) : selectedJob.isActive && (!selectedJob.deadline || selectedJob.deadline > new Date()) ? (
                    <button
                      onClick={() => {
                        applyToJob(selectedJob);
                        setShowModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Apply Now
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                    >
                      Job Expired
                    </button>
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
