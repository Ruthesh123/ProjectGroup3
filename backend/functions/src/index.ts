import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

// Initialize admin
admin.initializeApp();

// Import auth functions
import { registerUser } from './auth/register';
import { loginUser } from './auth/login';
import { resetPassword } from './auth/passwordReset';
import { verifyToken, checkRole } from './auth/authMiddleware';

// Import API routes
import * as applicationsApi from './api/applications';
import * as jobsApi from './api/jobs';
import * as adminApi from './api/admin';

// Import middleware
import {
  generalRateLimiter,
  authRateLimiter,
  applicationRateLimiter,
  uploadRateLimiter,
  securityHeaders,
  sanitizeInput,
  errorHandler,
  corsOptions,
  logRequest
} from './middleware/security';

import {
  validateRegistration,
  validateLogin,
  validateJobCreation,
  validateJobUpdate,
  validateApplication,
  validateApplicationStatus,
  validatePagination,
  validateSearch,
  validateUserVerification,
  validateUserSuspension,
  validateRoleChange,
  validateContentModeration,
  validateSystemNotification,
  validatePasswordReset,
  validateBulkUpdate
} from './middleware/validation';

import {
  uploadResume,
  uploadCompanyLogo,
  uploadProfilePicture,
  handleResumeUpload,
  handleLogoUpload,
  handleProfilePictureUpload
} from './services/uploadService';

// Initialize Express
const app = express();

// Apply security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(generalRateLimiter);
app.use(logRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'InternLink Backend API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints
app.post('/auth/register', authRateLimiter, validateRegistration, registerUser);
app.post('/auth/login', authRateLimiter, validateLogin, loginUser);
app.post('/auth/reset-password', authRateLimiter, validatePasswordReset, resetPassword);

// Application endpoints
app.post(
  '/applications/submit',
  verifyToken,
  checkRole(['student']),
  applicationRateLimiter,
  validateApplication,
  applicationsApi.submitApplication
);

app.get(
  '/applications/student',
  verifyToken,
  checkRole(['student']),
  validatePagination,
  applicationsApi.getStudentApplications
);

app.get(
  '/applications/employer',
  verifyToken,
  checkRole(['employer']),
  validatePagination,
  applicationsApi.getEmployerApplicants
);

app.put(
  '/applications/:applicationId/status',
  verifyToken,
  checkRole(['employer']),
  validateApplicationStatus,
  applicationsApi.updateApplicationStatus
);

app.delete(
  '/applications/:applicationId/withdraw',
  verifyToken,
  checkRole(['student']),
  applicationsApi.withdrawApplication
);

app.put(
  '/applications/bulk-update',
  verifyToken,
  checkRole(['employer']),
  validateBulkUpdate,
  applicationsApi.bulkUpdateApplications
);

// Job endpoints
app.post(
  '/jobs',
  verifyToken,
  checkRole(['employer']),
  validateJobCreation,
  jobsApi.createJob
);

app.put(
  '/jobs/:jobId',
  verifyToken,
  checkRole(['employer']),
  validateJobUpdate,
  jobsApi.updateJob
);

app.delete(
  '/jobs/:jobId',
  verifyToken,
  checkRole(['employer']),
  jobsApi.deleteJob
);

app.get(
  '/jobs',
  validatePagination,
  validateSearch,
  jobsApi.getJobs
);

app.get('/jobs/:jobId', jobsApi.getJobById);

app.post(
  '/jobs/:jobId/save',
  verifyToken,
  checkRole(['student']),
  jobsApi.saveJob
);

app.delete(
  '/jobs/:jobId/unsave',
  verifyToken,
  checkRole(['student']),
  jobsApi.unsaveJob
);

app.get(
  '/jobs/saved',
  verifyToken,
  checkRole(['student']),
  validatePagination,
  jobsApi.getSavedJobs
);

app.get(
  '/jobs/employer',
  verifyToken,
  checkRole(['employer']),
  validatePagination,
  jobsApi.getEmployerJobs
);

// Admin endpoints
app.get(
  '/admin/users',
  verifyToken,
  checkRole(['admin']),
  validatePagination,
  validateSearch,
  adminApi.getUsers
);

app.put(
  '/admin/users/:userId/verify',
  verifyToken,
  checkRole(['admin']),
  validateUserVerification,
  adminApi.verifyUser
);

app.put(
  '/admin/users/:userId/suspend',
  verifyToken,
  checkRole(['admin']),
  validateUserSuspension,
  adminApi.suspendUser
);

app.put(
  '/admin/users/:userId/role',
  verifyToken,
  checkRole(['admin']),
  validateRoleChange,
  adminApi.changeUserRole
);

app.post(
  '/admin/moderate/:contentType/:contentId',
  verifyToken,
  checkRole(['admin']),
  validateContentModeration,
  adminApi.moderateContent
);

app.get(
  '/admin/metrics',
  verifyToken,
  checkRole(['admin']),
  adminApi.getPlatformMetrics
);

app.get(
  '/admin/audit-logs',
  verifyToken,
  checkRole(['admin']),
  validatePagination,
  adminApi.getAuditLogs
);

app.get(
  '/admin/export',
  verifyToken,
  checkRole(['admin']),
  adminApi.exportData
);

app.post(
  '/admin/notify',
  verifyToken,
  checkRole(['admin']),
  validateSystemNotification,
  adminApi.sendSystemNotification
);

// Upload endpoints
app.post(
  '/upload/resume',
  verifyToken,
  checkRole(['student']),
  uploadRateLimiter,
  uploadResume,
  handleResumeUpload,
  (req, res) => {
    res.status(200).json({
      message: 'Resume uploaded successfully',
      fileUrl: (req as any).uploadedFileUrl
    });
  }
);

app.post(
  '/upload/logo',
  verifyToken,
  checkRole(['employer']),
  uploadRateLimiter,
  uploadCompanyLogo,
  handleLogoUpload,
  (req, res) => {
    res.status(200).json({
      message: 'Logo uploaded successfully',
      fileUrl: (req as any).uploadedFileUrl
    });
  }
);

app.post(
  '/upload/profile-picture',
  verifyToken,
  uploadRateLimiter,
  uploadProfilePicture,
  handleProfilePictureUpload,
  (req, res) => {
    res.status(200).json({
      message: 'Profile picture uploaded successfully',
      fileUrl: (req as any).uploadedFileUrl
    });
  }
);

// Error handling middleware (must be last)
app.use(errorHandler);

// Export the API
export const api = functions.https.onRequest(app);

// Export individual functions for direct access
export { registerUser as register } from './auth/register';
export { createUserProfile } from './auth/userProfile';