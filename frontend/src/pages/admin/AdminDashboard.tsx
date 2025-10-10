import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ProfileDropdown } from '../../components/shared/ProfileDropdown';

interface DashboardStats {
  totalStudents: number;
  totalEmployers: number;
  totalJobs: number;
  activeApplications: number;
}

type RecentApp = {
  id: string;
  jobTitle?: string;
  companyName?: string;
  status?: string;
  appliedAt?: any; // Firestore Timestamp | Date
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalEmployers: 0,
    totalJobs: 0,
    activeApplications: 0,
  });
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentApplications();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const employersQuery = query(collection(db, 'users'), where('role', '==', 'employer'));

      const [studentsSnapshot, employersSnapshot, jobsSnapshot, applicationsSnapshot] =
        await Promise.all([
          getDocs(studentsQuery),
          getDocs(employersQuery),
          getDocs(collection(db, 'jobs')),
          getDocs(collection(db, 'applications')),
        ]);

      setStats({
        totalStudents: studentsSnapshot.size,
        totalEmployers: employersSnapshot.size,
        totalJobs: jobsSnapshot.size,
        activeApplications: applicationsSnapshot.size,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentApplications = async () => {
    try {
      // IMPORTANT: your schema uses appliedAt
      const appsQuery = query(
        collection(db, 'applications'),
        orderBy('appliedAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(appsQuery);

      const data: RecentApp[] = snapshot.docs.map((d) => {
        const v = d.data() as any;
        return {
          id: d.id,
          jobTitle: v.jobTitle || 'Unknown Position',
          companyName: v.companyName || 'Unknown Company',
          status: v.status || 'pending',
          appliedAt: v.appliedAt,
        };
      });

      setRecentApps(data);
    } catch (error) {
      console.error('Error fetching recent applications:', error);
      setRecentApps([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatWhen = (ts: any) => {
    if (!ts) return '—';
    const date = ts?.toDate ? ts.toDate() : ts;
    return new Date(date).toLocaleString();
  };

  const statusPill = (status?: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return map[status || 'pending'] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">IL</span>
                </div>
                <h1 className="ml-3 text-xl font-bold text-gray-900">InternLink Admin</h1>
              </div>
            </div>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, Admin!</h2>
          <p className="text-gray-600 mt-1">Here's what's happening with your platform today.</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employers</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEmployers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Applications</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeApplications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions (unchanged) */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">Manage Users</p>
            </button>

            <button
              onClick={() => navigate('/admin/jobs')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">Manage Jobs</p>
            </button>

            <button
              onClick={() => navigate('/admin/applications')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">View Applications</p>
            </button>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Applications</h2>
          {recentApps.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent applications found.</p>
          ) : (
            <div className="divide-y">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{app.jobTitle}</p>
                    <p className="text-xs text-gray-600">
                      {app.companyName} •{' '}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusPill(app.status || 'pending')}`}>
                        {app.status || 'pending'}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{formatWhen(app.appliedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};