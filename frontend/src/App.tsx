import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { SetupTestData } from './pages/SetupTestData';
import { JobsListing } from './pages/JobsListing';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UsersManagement } from './pages/admin/UsersManagement';
import { JobsManagement } from './pages/admin/JobsManagement';
import { ApplicationsView } from './pages/admin/ApplicationsView';
import { AdminSettings } from './pages/admin/AdminSettings';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentApplications } from './pages/student/StudentApplications';
import { StudentSavedJobs } from './pages/student/StudentSavedJobs';
import { EmployerDashboard } from './pages/employer/EmployerDashboard';
import { PostJob } from './pages/employer/PostJob';
import { EmployerProfile } from './pages/employer/EmployerProfile';
import { EmployerJobs } from './pages/employer/EmployerJobs';
import { EmployerApplicants } from './pages/employer/EmployerApplicants';
import { EmployerAnalytics } from './pages/employer/EmployerAnalytics';
import { ApplyJob } from './pages/ApplyJob';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/setup" element={<SetupTestData />} />
          <Route path="/jobs" element={<JobsListing />} />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <JobsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ApplicationsView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/applications"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/saved"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentSavedJobs />
              </ProtectedRoute>
            }
          />
          <Route path="/apply/:jobId" element={<ApplyJob />} />

          {/* Employer Routes */}
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/post-job"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <PostJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/profile"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/applicants"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerApplicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/analytics"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;