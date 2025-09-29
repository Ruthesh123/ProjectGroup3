import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Job } from '../types';

export const ApplyJob: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (!jobId) return;
        const ref = doc(db, 'jobs', jobId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Job not found.');
          return;
        }
        const d = snap.data() as any;
        const j: Job = {
          id: snap.id,
          employerId: d.employerId || '',
          companyName: d.companyName || 'Unknown Company',
          title: d.title || 'Untitled Position',
          description: d.description || '',
          location: d.location || 'Not specified',
          type: d.type || 'full-time',
          skills: d.skills || [],
          salary: d.salary,
          status: d.status || 'active',
          createdAt: d.createdAt?.toDate?.() || new Date(),
          updatedAt: d.updatedAt?.toDate?.() || new Date(),
          viewCount: d.viewCount || 0,
          applicationCount: d.applicationCount || 0,
        };
        setJob(j);
      } catch (e: any) {
        setError(e?.message || 'Failed to load job.');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!user) return navigate('/login');
    if (user.role !== 'student') {
      setError('Only students can apply.');
      return;
    }
    if (!job || !jobId) {
      setError('Missing job.');
      return;
    }
    if (!resumeUrl.trim()) {
      setError('Please provide a resume URL.');
      return;
    }
    if (job.status !== 'active') {
      setError('This job is closed.');
      return;
    }

    setSubmitting(true);
    try {
      // Write a new application doc (simple, no duplicates check)
      await addDoc(collection(db, 'applications'), {
        studentId: user.id,
        employerId: job.employerId,      // IMPORTANT: for your current read rule
        jobId: jobId,
        jobTitle: job.title,
        companyName: job.companyName,
        status: 'pending',
        appliedAt: serverTimestamp(),
        resume: resumeUrl.trim(),
        coverLetter: coverLetter.trim() || null,
      });

      setSuccess('Application submitted!');
      setTimeout(() => navigate('/student/applications'), 800);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-red-600">{error || 'Job not found.'}</p>
          <button
            onClick={() => navigate('/jobs')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Apply to {job.title}</h1>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
          <p className="text-gray-600">{job.companyName} • {job.location}</p>
          <div className="mt-2 text-sm text-gray-600 capitalize">{job.type.replace('-', ' ')}</div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume URL *</label>
            <input
              type="url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://drive.google.com/your-resume.pdf"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Make sure link sharing is enabled.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
            <textarea
              rows={6}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Write a short cover letter..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyJob;
