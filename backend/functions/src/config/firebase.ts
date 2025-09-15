import * as admin from 'firebase-admin';

// Initialize if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();

// User roles enum
export enum UserRole {
  STUDENT = 'student',
  EMPLOYER = 'employer',
  ADMIN = 'admin'
}

// Custom claims interface
export interface CustomClaims {
  role: UserRole;
  verified?: boolean;
}