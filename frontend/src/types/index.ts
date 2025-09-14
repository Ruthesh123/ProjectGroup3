// User Types
export type UserRole = 'student' | 'employer' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  userId: string;
  name: string;
  university: string;
  program: string;
  graduationYear: number;
  skills: string[];
  bio: string;
  resume?: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
}

export interface EmployerProfile {
  userId: string;
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  logo?: string;
  description: string;
  verified: boolean;
  location: string;
}

// Job Types
export interface Job {
  id: string;
  employerId: string;
  companyName: string;
  title: string;
  description: string;
  location: string;
  type: 'full-time' | 'part-time' | 'internship' | 'contract';
  skills: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  status: 'active' | 'closed' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  applicationCount: number;
}

// Application Types
export interface Application {
  id: string;
  studentId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  appliedAt: Date;
  resume: string;
  coverLetter?: string;
  notes?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'application_update' | 'new_job' | 'profile_update' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}