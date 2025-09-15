import { Request, Response } from 'express';
import { auth, db, UserRole } from '../config/firebase';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyName?: string; // For employers
  university?: string; // For students
}

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      companyName,
      university
    }: RegisterRequest = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        error: 'Invalid role specified'
      });
    }

    // Additional validation for specific roles
    if (role === UserRole.EMPLOYER && !companyName) {
      return res.status(400).json({
        error: 'Company name is required for employers'
      });
    }

    if (role === UserRole.STUDENT && !university) {
      return res.status(400).json({
        error: 'University is required for students'
      });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false
    });

    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      verified: false
    });

    // Create user profile in Firestore
    const userProfile = {
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      companyName: role === UserRole.EMPLOYER ? companyName : null,
      university: role === UserRole.STUDENT ? university : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false,
      profileComplete: false
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);

    // Send verification email
    const link = await auth.generateEmailVerificationLink(email);

    // TODO: Send actual email using email service
    console.log('Verification email link:', link);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      uid: userRecord.uid
    });

  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        error: 'Invalid email address'
      });
    }

    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        error: 'Password should be at least 6 characters'
      });
    }

    res.status(500).json({
      error: 'Registration failed. Please try again.'
    });
  }
};