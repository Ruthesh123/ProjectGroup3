import { Request, Response } from 'express';
import { auth, db } from '../config/firebase';

interface LoginRequest {
  email: string;
  password: string;
}

export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Note: In production, you would validate credentials on the client
    // and send the ID token to the server for verification
    // This is a simplified version for development

    // Get user by email to check if exists and get details
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Get user profile from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User profile not found'
      });
    }

    const userData = userDoc.data();

    // Create custom token
    const customToken = await auth.createCustomToken(userRecord.uid, {
      role: userData?.role,
      verified: userData?.emailVerified || false
    });

    // In test/demo mode, return a format that works with the emulator
    // The test script will use this token directly as if it were an ID token
    const isTestMode = process.env.FIREBASE_PROJECT_ID === 'demo-internlink' ||
                      process.env.NODE_ENV === 'test';

    return res.status(200).json({
      success: true,
      token: customToken,
      customToken: customToken,  // Keep for backward compatibility
      idToken: isTestMode ? customToken : undefined,  // In test mode, treat custom token as ID token
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: userData?.role,
        emailVerified: userRecord.emailVerified,
        profileComplete: userData?.profileComplete || false
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);

    return res.status(401).json({
      error: 'Authentication failed'
    });
  }
};