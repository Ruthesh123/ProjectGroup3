import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import { body, validationResult } from 'express-validator';
import { StudentProfile } from '../models/schemas';
import { AuthenticationService, AuthMiddleware } from '../auth/authentication';

const app = express();
const db = admin.firestore();

/**
 * Validation rules for student registration
 */
const studentRegistrationValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').isMobilePhone('any'),
  body('studentId').notEmpty().trim(),
  body('program').notEmpty().trim(),
  body('year').isInt({ min: 1, max: 6 }),
  body('campus').notEmpty().trim(),
  body('skills').isArray().optional(),
];

/**
 * Validation rules for profile update
 */
const studentProfileUpdateValidation = [
  body('phone').isMobilePhone('any').optional(),
  body('skills').isArray().optional(),
  body('experience').isString().optional(),
  body('linkedIn').isURL().optional(),
  body('portfolio').isURL().optional(),
  body('preferences.jobTypes').isArray().optional(),
  body('preferences.locations').isArray().optional(),
  body('preferences.industries').isArray().optional(),
];

/**
 * Student Registration API
 */
app.post('/register', studentRegistrationValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      studentId,
      program,
      year,
      campus,
      skills = [],
      experience,
      linkedIn,
      portfolio
    } = req.body;

    // Check for duplicate student ID
    const existingStudent = await db.collection('users')
      .where('profile.studentId', '==', studentId)
      .limit(1)
      .get();

    if (!existingStudent.empty) {
      return res.status(409).json({
        error: 'Student ID already registered',
        field: 'studentId'
      });
    }

    // Check for duplicate email
    const existingEmail = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingEmail.empty) {
      return res.status(409).json({
        error: 'Email already registered',
        field: 'email'
      });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false
    });

    // Set custom claims for student role
    await AuthenticationService.setUserRole(userRecord.uid, 'student');

    // Create student profile in Firestore
    const studentProfile: StudentProfile = {
      uid: userRecord.uid,
      email,
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      emailVerified: false,
      profile: {
        firstName,
        lastName,
        phone,
        studentId,
        program,
        year,
        campus,
        skills,
        experience,
        linkedIn,
        portfolio
      }
    };

    await db.collection('users').doc(userRecord.uid).set(studentProfile);

    // Generate verification token
    const verificationToken = AuthenticationService.generateEmailVerificationToken(
      userRecord.uid,
      email
    );

    // Send welcome email (would integrate with email service)
    await sendWelcomeEmail(email, firstName, verificationToken);

    // Generate tokens for immediate login
    const accessToken = AuthenticationService.generateAccessToken(studentProfile);
    const refreshToken = AuthenticationService.generateRefreshToken(studentProfile);

    // Log the registration
    await logAudit({
      userId: userRecord.uid,
      userRole: 'student',
      action: 'STUDENT_REGISTRATION',
      resource: 'users',
      resourceId: userRecord.uid,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      message: 'Student registration successful',
      user: {
        uid: userRecord.uid,
        email,
        role: 'student',
        profile: studentProfile.profile
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error: any) {
    console.error('Student registration error:', error);

    // Log failed attempt
    await logAudit({
      userId: 'anonymous',
      userRole: 'anonymous',
      action: 'STUDENT_REGISTRATION_FAILED',
      resource: 'users',
      resourceId: 'n/a',
      success: false,
      errorMessage: error.message,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * Update Student Profile
 */
app.put('/profile/:uid',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('student'),
  studentProfileUpdateValidation,
  async (req, res) => {
    try {
      const { uid } = req.params;

      // Ensure student can only update their own profile
      if (req.user.uid !== uid) {
        return res.status(403).json({ error: 'Unauthorized to update this profile' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      // Build update object dynamically
      const allowedFields = [
        'phone', 'skills', 'experience', 'linkedIn', 'portfolio', 'resumeUrl'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[`profile.${field}`] = req.body[field];
        }
      });

      // Handle preferences
      if (req.body.preferences) {
        updateData.preferences = req.body.preferences;
      }

      // Update Firestore
      await db.collection('users').doc(uid).update(updateData);

      // Get updated profile
      const updatedDoc = await db.collection('users').doc(uid).get();
      const updatedProfile = updatedDoc.data();

      // Log the update
      await logAudit({
        userId: uid,
        userRole: 'student',
        action: 'PROFILE_UPDATE',
        resource: 'users',
        resourceId: uid,
        changes: {
          before: {},
          after: updateData
        },
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });

    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(500).json({
        error: 'Profile update failed',
        message: error.message
      });
    }
  }
);

/**
 * Verify Student Email
 */
app.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    // Verify token
    const decoded = AuthenticationService.verifyAccessToken(token);

    if (decoded.type !== 'email-verification') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    // Update user email verification status
    await admin.auth().updateUser(decoded.uid, {
      emailVerified: true
    });

    await db.collection('users').doc(decoded.uid).update({
      emailVerified: true,
      updatedAt: new Date()
    });

    res.json({ message: 'Email verified successfully' });

  } catch (error: any) {
    res.status(400).json({
      error: 'Email verification failed',
      message: error.message
    });
  }
});

/**
 * Check Duplicate Student
 */
app.post('/check-duplicate', async (req, res) => {
  try {
    const { email, studentId } = req.body;
    const duplicates: any = {};

    if (email) {
      const emailCheck = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      duplicates.email = !emailCheck.empty;
    }

    if (studentId) {
      const studentIdCheck = await db.collection('users')
        .where('profile.studentId', '==', studentId)
        .limit(1)
        .get();
      duplicates.studentId = !studentIdCheck.empty;
    }

    res.json({ duplicates });

  } catch (error: any) {
    res.status(500).json({
      error: 'Duplicate check failed',
      message: error.message
    });
  }
});

/**
 * Send welcome email to student
 */
async function sendWelcomeEmail(email: string, firstName: string, verificationToken: string): Promise<void> {
  // This would integrate with an email service like SendGrid, AWS SES, etc.
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${verificationToken}`;

  console.log(`Sending welcome email to ${email}`);
  console.log(`Verification URL: ${verificationUrl}`);

  // TODO: Implement actual email sending
  // Example with SendGrid:
  // await sendgrid.send({
  //   to: email,
  //   from: 'noreply@interlink.com',
  //   subject: 'Welcome to Interlink!',
  //   html: `
  //     <h1>Welcome ${firstName}!</h1>
  //     <p>Thank you for registering with Interlink.</p>
  //     <p>Please verify your email by clicking <a href="${verificationUrl}">here</a></p>
  //   `
  // });
}

/**
 * Log audit event
 */
async function logAudit(data: any): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      ...data,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export const studentRegistration = functions.https.onRequest(app);