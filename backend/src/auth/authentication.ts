import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { BaseUser, StudentProfile, EmployerProfile, AdminProfile } from '../models/schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

/**
 * Authentication Service
 * Handles JWT generation, verification, and role management
 */
export class AuthenticationService {

  /**
   * Generate JWT access token
   */
  static generateAccessToken(user: BaseUser): string {
    const payload = {
      uid: user.uid,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'interlink-api',
      audience: 'interlink-client'
    });
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(user: BaseUser): string {
    const payload = {
      uid: user.uid,
      tokenVersion: Date.now() // For invalidation tracking
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
      issuer: 'interlink-api'
    });
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'interlink-api',
        audience: 'interlink-client'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'interlink-api'
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Create custom Firebase token with role claims
   */
  static async createCustomToken(uid: string, role: string): Promise<string> {
    const customClaims = {
      role,
      timestamp: Date.now()
    };

    return admin.auth().createCustomToken(uid, customClaims);
  }

  /**
   * Set user role in Firebase Auth custom claims
   */
  static async setUserRole(uid: string, role: 'student' | 'employer' | 'admin'): Promise<void> {
    await admin.auth().setCustomUserClaims(uid, { role });
  }

  /**
   * Verify user role from Firebase token
   */
  static async verifyUserRole(idToken: string, expectedRole: string): Promise<boolean> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken.role === expectedRole;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(email: string): string {
    const payload = {
      email,
      type: 'password-reset',
      timestamp: Date.now()
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'interlink-api'
    });
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(uid: string, email: string): string {
    const payload = {
      uid,
      email,
      type: 'email-verification',
      timestamp: Date.now()
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'interlink-api'
    });
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = this.verifyRefreshToken(refreshToken);

    // Get user from database
    const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const user = userDoc.data() as BaseUser;

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}

/**
 * Express middleware for authentication
 */
export class AuthMiddleware {

  /**
   * Verify JWT token middleware
   */
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const decoded = AuthenticationService.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  /**
   * Check user role middleware
   */
  static requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    };
  }

  /**
   * Check if user is verified (for employers)
   */
  static async requireVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user || req.user.role !== 'employer') {
      res.status(403).json({ error: 'Only for verified employers' });
      return;
    }

    const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
    const userData = userDoc.data() as EmployerProfile;

    if (!userData.isVerified) {
      res.status(403).json({ error: 'Employer verification required' });
      return;
    }

    next();
  }
}

/**
 * Session Management Service
 */
export class SessionService {
  private static sessions = new Map<string, any>();

  /**
   * Create new session
   */
  static createSession(userId: string, data: any): string {
    const sessionId = `session_${userId}_${Date.now()}`;
    const sessionData = {
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ...data
    };

    this.sessions.set(sessionId, sessionData);

    // Schedule cleanup after 24 hours
    setTimeout(() => {
      this.destroySession(sessionId);
    }, 24 * 60 * 60 * 1000);

    return sessionId;
  }

  /**
   * Get session data
   */
  static getSession(sessionId: string): any {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.lastActivity = new Date();
      return session;
    }

    return null;
  }

  /**
   * Update session data
   */
  static updateSession(sessionId: string, data: any): void {
    const session = this.sessions.get(sessionId);

    if (session) {
      Object.assign(session, data, { lastActivity: new Date() });
    }
  }

  /**
   * Destroy session
   */
  static destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up inactive sessions
   */
  static cleanupInactiveSessions(maxInactivityMinutes: number = 30): void {
    const now = Date.now();
    const maxInactivity = maxInactivityMinutes * 60 * 1000;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > maxInactivity) {
        this.destroySession(sessionId);
      }
    }
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

export default {
  AuthenticationService,
  AuthMiddleware,
  SessionService
};