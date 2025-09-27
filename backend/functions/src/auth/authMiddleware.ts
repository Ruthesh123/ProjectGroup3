import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // In test/demo mode with emulator, accept custom tokens as valid
    const isTestMode = process.env.FIREBASE_PROJECT_ID === 'demo-internlink' ||
                      process.env.NODE_ENV === 'test';

    if (isTestMode) {
      try {
        // For test mode, decode the JWT without full verification
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const uid = payload.uid || payload.sub;

        if (!uid) {
          throw new Error('No uid in token');
        }

        // Get user details from Firestore instead of Auth
        const db = await import('../config/firebase').then(m => m.db);
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
          // User doesn't exist in Firestore, might be a newly created user
          // Try to get from Auth
          const userRecord = await auth.getUser(uid);

          req.user = {
            uid: uid,
            email: userRecord.email,
            role: userRecord.customClaims?.role || payload.claims?.role || payload.role || 'student'
          };
        } else {
          const userData = userDoc.data();

          req.user = {
            uid: uid,
            email: userData?.email || payload.email,
            role: userData?.role || payload.claims?.role || payload.role || 'student'
          };
        }

        next();
      } catch (testError) {
        console.error('Test mode token error:', testError);
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
    } else {
      // Production mode - verify as ID token
      const decodedToken = await auth.verifyIdToken(token);

      // Get custom claims from the token or user record
      let role = decodedToken.role || decodedToken.claims?.role;

      // If role not in token, fetch from user record
      if (!role) {
        const userRecord = await auth.getUser(decodedToken.uid);
        role = userRecord.customClaims?.role;
      }

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: role as string
      };

      next();
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const checkRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};