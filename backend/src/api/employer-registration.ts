import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import { body, validationResult } from 'express-validator';
import { EmployerProfile } from '../models/schemas';
import { AuthenticationService, AuthMiddleware } from '../auth/authentication';

const app = express();
const db = admin.firestore();

/**
 * Validation rules for employer registration
 */
const employerRegistrationValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('company.name').notEmpty().trim(),
  body('company.industry').notEmpty().trim(),
  body('company.size').isIn(['1-10', '11-50', '51-200', '201-500', '500+']),
  body('company.website').isURL(),
  body('company.description').notEmpty().isLength({ min: 50, max: 1000 }),
  body('company.address.street').notEmpty(),
  body('company.address.city').notEmpty(),
  body('company.address.province').notEmpty(),
  body('company.address.postalCode').matches(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i),
  body('company.address.country').notEmpty(),
  body('company.contactPerson.name').notEmpty(),
  body('company.contactPerson.title').notEmpty(),
  body('company.contactPerson.email').isEmail(),
  body('company.contactPerson.phone').isMobilePhone('any'),
];

/**
 * Validation rules for company profile update
 */
const companyProfileUpdateValidation = [
  body('company.industry').notEmpty().trim().optional(),
  body('company.size').isIn(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  body('company.website').isURL().optional(),
  body('company.description').isLength({ min: 50, max: 1000 }).optional(),
  body('company.address').optional(),
  body('company.contactPerson').optional(),
];

/**
 * Employer Registration API
 */
app.post('/register', employerRegistrationValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, company } = req.body;

    // Check for duplicate company name
    const existingCompany = await db.collection('users')
      .where('company.name', '==', company.name)
      .limit(1)
      .get();

    if (!existingCompany.empty) {
      return res.status(409).json({
        error: 'Company already registered',
        field: 'company.name',
        suggestion: 'Please contact support if this is your company'
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

    // Verify company domain matches email domain (optional validation)
    const emailDomain = email.split('@')[1];
    const websiteDomain = new URL(company.website).hostname.replace('www.', '');

    if (emailDomain !== websiteDomain) {
      console.warn(`Email domain ${emailDomain} doesn't match website ${websiteDomain}`);
      // Could enforce this or just log as warning
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: company.name,
      emailVerified: false
    });

    // Set custom claims for employer role
    await AuthenticationService.setUserRole(userRecord.uid, 'employer');

    // Create employer profile in Firestore
    const employerProfile: EmployerProfile = {
      uid: userRecord.uid,
      email,
      role: 'employer',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      emailVerified: false,
      company: {
        name: company.name,
        industry: company.industry,
        size: company.size,
        website: company.website,
        description: company.description,
        logoUrl: company.logoUrl || null,
        address: company.address,
        contactPerson: company.contactPerson
      },
      isVerified: false // Requires admin approval
    };

    await db.collection('users').doc(userRecord.uid).set(employerProfile);

    // Generate verification token
    const verificationToken = AuthenticationService.generateEmailVerificationToken(
      userRecord.uid,
      email
    );

    // Send welcome email
    await sendEmployerWelcomeEmail(email, company.name, verificationToken);

    // Notify admins about new employer registration
    await notifyAdminsNewEmployer(employerProfile);

    // Generate tokens for immediate login
    const accessToken = AuthenticationService.generateAccessToken(employerProfile);
    const refreshToken = AuthenticationService.generateRefreshToken(employerProfile);

    // Log the registration
    await logAudit({
      userId: userRecord.uid,
      userRole: 'employer',
      action: 'EMPLOYER_REGISTRATION',
      resource: 'users',
      resourceId: userRecord.uid,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      message: 'Employer registration successful. Pending verification.',
      user: {
        uid: userRecord.uid,
        email,
        role: 'employer',
        company: employerProfile.company,
        isVerified: false
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error: any) {
    console.error('Employer registration error:', error);

    // Log failed attempt
    await logAudit({
      userId: 'anonymous',
      userRole: 'anonymous',
      action: 'EMPLOYER_REGISTRATION_FAILED',
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
 * Update Company Profile
 */
app.put('/profile/:uid',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('employer'),
  companyProfileUpdateValidation,
  async (req, res) => {
    try {
      const { uid } = req.params;

      // Ensure employer can only update their own profile
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

      // Build update object dynamically for company fields
      if (req.body.company) {
        Object.keys(req.body.company).forEach(key => {
          updateData[`company.${key}`] = req.body.company[key];
        });
      }

      // Update Firestore
      await db.collection('users').doc(uid).update(updateData);

      // Get updated profile
      const updatedDoc = await db.collection('users').doc(uid).get();
      const updatedProfile = updatedDoc.data();

      // Log the update
      await logAudit({
        userId: uid,
        userRole: 'employer',
        action: 'COMPANY_PROFILE_UPDATE',
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
        message: 'Company profile updated successfully',
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
 * Verify Company (Admin only)
 */
app.post('/verify/:uid',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole('admin'),
  async (req, res) => {
    try {
      const { uid } = req.params;
      const { verified, notes } = req.body;

      const updateData: any = {
        isVerified: verified,
        updatedAt: new Date()
      };

      if (verified) {
        updateData.verifiedAt = new Date();
      }

      await db.collection('users').doc(uid).update(updateData);

      // Get employer data for notification
      const employerDoc = await db.collection('users').doc(uid).get();
      const employerData = employerDoc.data() as EmployerProfile;

      // Send notification to employer
      await db.collection('notifications').add({
        recipientId: uid,
        recipientRole: 'employer',
        type: 'system',
        title: verified ? 'Company Verified!' : 'Verification Update',
        message: verified
          ? 'Your company has been verified. You can now post jobs.'
          : `Your company verification needs additional information: ${notes}`,
        read: false,
        createdAt: new Date()
      });

      // Log the verification
      await logAudit({
        userId: req.user.uid,
        userRole: 'admin',
        action: verified ? 'COMPANY_VERIFIED' : 'COMPANY_VERIFICATION_REJECTED',
        resource: 'users',
        resourceId: uid,
        changes: {
          before: { isVerified: !verified },
          after: { isVerified: verified, notes }
        },
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.json({
        message: `Company ${verified ? 'verified' : 'verification updated'} successfully`,
        company: employerData.company.name,
        verified
      });

    } catch (error: any) {
      console.error('Company verification error:', error);
      res.status(500).json({
        error: 'Verification failed',
        message: error.message
      });
    }
  }
);

/**
 * Check Duplicate Company
 */
app.post('/check-duplicate', async (req, res) => {
  try {
    const { email, companyName } = req.body;
    const duplicates: any = {};

    if (email) {
      const emailCheck = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      duplicates.email = !emailCheck.empty;
    }

    if (companyName) {
      const companyCheck = await db.collection('users')
        .where('company.name', '==', companyName)
        .limit(1)
        .get();
      duplicates.companyName = !companyCheck.empty;
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
 * Send welcome email to employer
 */
async function sendEmployerWelcomeEmail(email: string, companyName: string, verificationToken: string): Promise<void> {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${verificationToken}`;

  console.log(`Sending employer welcome email to ${email}`);
  console.log(`Company: ${companyName}`);
  console.log(`Verification URL: ${verificationUrl}`);

  // TODO: Implement actual email sending
  // await emailService.send({
  //   to: email,
  //   subject: 'Welcome to Interlink - Company Registration',
  //   template: 'employer-welcome',
  //   data: {
  //     companyName,
  //     verificationUrl
  //   }
  // });
}

/**
 * Notify admins about new employer registration
 */
async function notifyAdminsNewEmployer(employer: EmployerProfile): Promise<void> {
  // Get all admin users
  const adminsSnapshot = await db.collection('users')
    .where('role', '==', 'admin')
    .get();

  const notifications = adminsSnapshot.docs.map(doc => ({
    recipientId: doc.id,
    recipientRole: 'admin',
    type: 'system',
    title: 'New Employer Registration',
    message: `${employer.company.name} has registered and needs verification`,
    data: {
      employerId: employer.uid,
      companyName: employer.company.name,
      industry: employer.company.industry
    },
    read: false,
    createdAt: new Date()
  }));

  // Create notifications for all admins
  const batch = db.batch();
  notifications.forEach(notification => {
    const ref = db.collection('notifications').doc();
    batch.set(ref, notification);
  });
  await batch.commit();
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

export const employerRegistration = functions.https.onRequest(app);