import * as functions from 'firebase-functions';
import { db, UserRole } from '../config/firebase';

interface UserProfileData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyName?: string;
  university?: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  profileComplete: boolean;
}

// Cloud Function triggered when a new user is created
export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    // Create default user profile
    const userProfile: UserProfileData = {
      uid: user.uid,
      email: user.email || '',
      firstName: '',
      lastName: '',
      role: UserRole.STUDENT, // Default role
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: user.emailVerified || false,
      profileComplete: false
    };

    // Save to Firestore
    await db.collection('users').doc(user.uid).set(userProfile);

    console.log(`User profile created for ${user.uid}`);
    return null;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
});