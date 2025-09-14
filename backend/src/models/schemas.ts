/**
 * Firestore Database Schemas
 * Defines the structure for all collections in the Interlink platform
 */

// User Types
export interface BaseUser {
  uid: string;
  email: string;
  role: 'student' | 'employer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export interface StudentProfile extends BaseUser {
  role: 'student';
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    studentId: string;
    program: string;
    year: number;
    campus: string;
    resumeUrl?: string;
    skills: string[];
    experience?: string;
    linkedIn?: string;
    portfolio?: string;
  };
  preferences?: {
    jobTypes: string[];
    locations: string[];
    industries: string[];
  };
}

export interface EmployerProfile extends BaseUser {
  role: 'employer';
  company: {
    name: string;
    industry: string;
    size: string;
    website: string;
    description: string;
    logoUrl?: string;
    address: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
    contactPerson: {
      name: string;
      title: string;
      email: string;
      phone: string;
    };
  };
  isVerified: boolean;
  verifiedAt?: Date;
}

export interface AdminProfile extends BaseUser {
  role: 'admin';
  profile: {
    firstName: string;
    lastName: string;
    department: string;
    permissions: string[];
  };
}

// Job Schema
export interface Job {
  id: string;
  employerId: string;
  companyName: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'co-op';
  location: {
    city: string;
    province: string;
    isRemote: boolean;
  };
  salary?: {
    min: number;
    max: number;
    currency: string;
    period: 'hourly' | 'annually';
  };
  benefits?: string[];
  deadline: Date;
  postedAt: Date;
  updatedAt: Date;
  status: 'draft' | 'active' | 'closed' | 'filled';
  applicantCount: number;
  viewCount: number;
  tags: string[];
}

// Application Schema
export interface Application {
  id: string;
  jobId: string;
  studentId: string;
  employerId: string;
  studentName: string;
  jobTitle: string;
  companyName: string;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted' | 'withdrawn';
  appliedAt: Date;
  updatedAt: Date;
  coverLetter?: string;
  resumeUrl: string;
  portfolio?: string;
  answers?: Array<{
    question: string;
    answer: string;
  }>;
  notes?: {
    employer?: string;
    internal?: string;
  };
  timeline: Array<{
    status: string;
    timestamp: Date;
    actor: string;
    notes?: string;
  }>;
}

// Notification Schema
export interface Notification {
  id: string;
  recipientId: string;
  recipientRole: 'student' | 'employer' | 'admin';
  type: 'application' | 'job' | 'message' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}

// Audit Log Schema
export interface AuditLog {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// Saved Jobs Schema
export interface SavedJob {
  id: string;
  studentId: string;
  jobId: string;
  savedAt: Date;
  notes?: string;
}

// Message Schema
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'student' | 'employer';
  recipientId: string;
  recipientRole: 'student' | 'employer';
  content: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
  sentAt: Date;
  readAt?: Date;
  isSystemMessage?: boolean;
}

// Conversation Schema
export interface Conversation {
  id: string;
  participants: Array<{
    id: string;
    role: 'student' | 'employer';
    name: string;
  }>;
  lastMessage?: {
    content: string;
    sentAt: Date;
    senderId: string;
  };
  jobId?: string;
  applicationId?: string;
  createdAt: Date;
  updatedAt: Date;
  unreadCount: {
    [userId: string]: number;
  };
}

// Collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  JOBS: 'jobs',
  APPLICATIONS: 'applications',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
  SAVED_JOBS: 'saved_jobs',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations'
} as const;