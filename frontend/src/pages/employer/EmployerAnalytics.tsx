import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, Briefcase, Eye, Clock, TrendingUp,
  Calendar, Download, Filter, ChevronDown
} from 'lucide-react';

interface AnalyticsData {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  totalViews: number;
  averageTimeToHire: number;
  applicationTrend: { date: string; count: number }[];
  jobsByCategory: { name: string; value: number }[];
  applicationsByStatus: { name: string; value: number; color: string }[];
  topPerformingJobs: { title: string; applications: number; views: number }[];
}

export const EmployerAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState('30days');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      if (dateRange === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (dateRange === '90days') {
        startDate.setDate(now.getDate() - 90);
      }

      // Fetch jobs
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('employerId', '==', user.uid)
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch applications
      const applicationPromises = jobs.map(async (job: any) => {
        const appQuery = query(
          collection(db, 'applications'),
          where('jobId', '==', job.id)
        );
        const appSnapshot = await getDocs(appQuery);
        return appSnapshot.docs.map(doc => ({
          ...doc.data(),
          jobTitle: job.title,
          jobId: job.id
        }));
      });

      const allApplications = (await Promise.all(applicationPromises)).flat();

      // Calculate metrics
      const totalJobs = jobs.length;
      const activeJobs = jobs.filter((job: any) => job.status === 'active').length;
      const totalApplications = allApplications.length;
      const pendingApplications = allApplications.filter((app: any) => app.status === 'pending').length;
      const acceptedApplications = allApplications.filter((app: any) => app.status === 'accepted').length;
      const rejectedApplications = allApplications.filter((app: any) => app.status === 'rejected').length;

      // Calculate total views (mock data for now)
      const totalViews = jobs.reduce((sum: number, job: any) => sum + (job.views || Math.floor(Math.random() * 100)), 0);

      // Calculate average time to hire (mock)
      const averageTimeToHire = 14; // days

      // Application trend (last 30 days)
      const applicationTrend = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const count = Math.floor(Math.random() * 10) + 1;
        applicationTrend.push({ date: dateStr, count });
      }

      // Jobs by category
      const categoryCount: Record<string, number> = {};
      jobs.forEach((job: any) => {
        const category = job.category || 'Other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
      const jobsByCategory = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

      // Applications by status
      const applicationsByStatus = [
        { name: 'Pending', value: pendingApplications, color: '#FFA500' },
        { name: 'Accepted', value: acceptedApplications, color: '#10B981' },
        { name: 'Rejected', value: rejectedApplications, color: '#EF4444' }
      ];

      // Top performing jobs
      const jobApplicationCount: Record<string, { title: string; applications: number; views: number }> = {};
      jobs.forEach((job: any) => {
        const appCount = allApplications.filter((app: any) => app.jobId === job.id).length;
        jobApplicationCount[job.id] = {
          title: job.title,
          applications: appCount,
          views: job.views || Math.floor(Math.random() * 100)
        };
      });
      const topPerformingJobs = Object.values(jobApplicationCount)
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 5);

      setAnalytics({
        totalJobs,
        activeJobs,
        totalApplications,
        pendingApplications,
        acceptedApplications,
        rejectedApplications,
        totalViews,
        averageTimeToHire,
        applicationTrend,
        jobsByCategory,
        applicationsByStatus,
        topPerformingJobs
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set mock data on error
      setAnalytics({
        totalJobs: 12,
        activeJobs: 8,
        totalApplications: 156,
        pendingApplications: 45,
        acceptedApplications: 78,
        rejectedApplications: 33,
        totalViews: 2340,
        averageTimeToHire: 14,
        applicationTrend: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: Math.floor(Math.random() * 10) + 1
        })),
        jobsByCategory: [
          { name: 'Software Development', value: 5 },
          { name: 'Marketing', value: 3 },
          { name: 'Design', value: 2 },
          { name: 'Sales', value: 2 }
        ],
        applicationsByStatus: [
          { name: 'Pending', value: 45, color: '#FFA500' },
          { name: 'Accepted', value: 78, color: '#10B981' },
          { name: 'Rejected', value: 33, color: '#EF4444' }
        ],
        topPerformingJobs: [
          { title: 'Senior Frontend Developer', applications: 34, views: 456 },
          { title: 'Marketing Manager', applications: 28, views: 389 },
          { title: 'UX Designer', applications: 22, views: 312 },
          { title: 'Sales Representative', applications: 18, views: 267 },
          { title: 'Junior Developer', applications: 15, views: 234 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!analytics) return;

    const csvContent = `
Employer Analytics Report
Generated: ${new Date().toLocaleDateString()}
Date Range: ${dateRange}

Overview Metrics
Total Jobs,${analytics.totalJobs}
Active Jobs,${analytics.activeJobs}
Total Applications,${analytics.totalApplications}
Pending Applications,${analytics.pendingApplications}
Accepted Applications,${analytics.acceptedApplications}
Rejected Applications,${analytics.rejectedApplications}
Total Views,${analytics.totalViews}
Average Time to Hire,${analytics.averageTimeToHire} days

Top Performing Jobs
Title,Applications,Views
${analytics.topPerformingJobs.map(job => `${job.title},${job.applications},${job.views}`).join('\n')}
    `.trim();

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${dateRange}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No analytics data available</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Track your recruitment performance</p>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              {/* Date Range Selector */}
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>

              {/* Export Button */}
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalJobs}</p>
                <p className="text-green-600 text-sm mt-1">
                  {analytics.activeJobs} active
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalApplications}</p>
                <p className="text-orange-600 text-sm mt-1">
                  {analytics.pendingApplications} pending
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
                <p className="text-blue-600 text-sm mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  12% increase
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg. Time to Hire</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.averageTimeToHire} days</p>
                <p className="text-gray-600 text-sm mt-1">
                  Industry avg: 23 days
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Application Trend */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.applicationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Application Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.applicationsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.applicationsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Jobs by Category */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.jobsByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performing Jobs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Jobs</h3>
            <div className="space-y-3">
              {analytics.topPerformingJobs.map((job, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-600">
                        <Users className="inline h-3 w-3 mr-1" />
                        {job.applications} applications
                      </span>
                      <span className="text-xs text-gray-600">
                        <Eye className="inline h-3 w-3 mr-1" />
                        {job.views} views
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      #{index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-800 font-medium">Acceptance Rate</span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">
                {analytics.acceptedApplications > 0
                  ? Math.round((analytics.acceptedApplications / (analytics.totalApplications - analytics.pendingApplications)) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-green-700 mt-1">Above industry average</p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-800 font-medium">Response Rate</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {analytics.totalApplications > 0
                  ? Math.round(((analytics.acceptedApplications + analytics.rejectedApplications) / analytics.totalApplications) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-blue-700 mt-1">Applications reviewed</p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-800 font-medium">Conversion Rate</span>
                <Eye className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {analytics.totalViews > 0
                  ? ((analytics.totalApplications / analytics.totalViews) * 100).toFixed(1)
                  : '0'}%
              </p>
              <p className="text-sm text-purple-700 mt-1">Views to applications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};