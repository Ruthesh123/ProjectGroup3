import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthRequest } from '../auth/authMiddleware';
import { emailService } from '../services/emailService';
import { FieldValue } from 'firebase-admin/firestore';

// Lazy load to ensure admin is initialized
const getDb = () => admin.firestore();
const getAuth = () => admin.auth();

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { role, status, verified, page = 1, limit = 20, search } = req.query;

    let query = getDb().collection('users') as any;

    if (role) {
      query = query.where('role', '==', role);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    if (verified !== undefined) {
      query = query.where('verified', '==', verified === 'true');
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    let users = await Promise.all(
      snapshot.docs.map(async (doc: any) => {
        const data = doc.data();
        try {
          const authUser = await getAuth().getUser(doc.id);
          return {
            id: doc.id,
            ...data,
            emailVerified: authUser.emailVerified,
            disabled: authUser.disabled,
            lastSignIn: authUser.metadata.lastSignInTime,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          };
        } catch (error) {
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          };
        }
      })
    );

    if (search) {
      const searchLower = (search as string).toLowerCase();
      users = users.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.companyName?.toLowerCase().includes(searchLower)
      );
    }

    const totalCount = await query.count().get();

    res.status(200).json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const verifyUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { userId } = req.params;
    const { verified, verificationNotes } = req.body;

    const userDoc = await getDb().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await getDb().collection('users').doc(userId).update({
      verified,
      verifiedAt: verified ? FieldValue.serverTimestamp() : null,
      verifiedBy: verified ? req.user.uid : null,
      verificationNotes,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await getDb().collection('auditLogs').add({
      action: verified ? 'USER_VERIFIED' : 'USER_UNVERIFIED',
      targetUserId: userId,
      performedBy: req.user.uid,
      notes: verificationNotes,
      timestamp: FieldValue.serverTimestamp(),
    });

    const userData = userDoc.data()!;
    if (userData.email) {
      // Email notification can be sent here if needed
      // const subject = verified ? 'Account Verified' : 'Account Verification Update';
      // const message = verified
      //   ? 'Your account has been verified. You now have full access to the platform.'
      //   : 'Your account verification status has been updated. Please contact support for more information.';
    }

    res.status(200).json({ 
      message: `User ${verified ? 'verified' : 'unverified'} successfully` 
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

export const suspendUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { userId } = req.params;
    const { suspended, reason, duration } = req.body;

    const userDoc = await getDb().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await getAuth().updateUser(userId, { disabled: suspended });

    const suspensionData: any = {
      status: suspended ? 'suspended' : 'active',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (suspended) {
      suspensionData.suspendedAt = FieldValue.serverTimestamp();
      suspensionData.suspendedBy = req.user.uid;
      suspensionData.suspensionReason = reason;
      
      if (duration) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(duration));
        suspensionData.suspensionExpiry = expiryDate;
      }
    } else {
      suspensionData.suspendedAt = null;
      suspensionData.suspendedBy = null;
      suspensionData.suspensionReason = null;
      suspensionData.suspensionExpiry = null;
    }

    await getDb().collection('users').doc(userId).update(suspensionData);

    await getDb().collection('auditLogs').add({
      action: suspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      targetUserId: userId,
      performedBy: req.user.uid,
      reason,
      duration,
      timestamp: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ 
      message: `User ${suspended ? 'suspended' : 'unsuspended'} successfully` 
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

export const changeUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { userId } = req.params;
    const { newRole } = req.body;

    const validRoles = ['student', 'employer', 'admin'];
    if (!validRoles.includes(newRole)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const userDoc = await getDb().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const oldRole = userDoc.data()?.role;

    await getAuth().setCustomUserClaims(userId, { role: newRole });

    await getDb().collection('users').doc(userId).update({
      role: newRole,
      previousRole: oldRole,
      roleChangedAt: FieldValue.serverTimestamp(),
      roleChangedBy: req.user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await getDb().collection('auditLogs').add({
      action: 'ROLE_CHANGED',
      targetUserId: userId,
      performedBy: req.user.uid,
      oldValue: oldRole,
      newValue: newRole,
      timestamp: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ 
      message: 'User role changed successfully',
      newRole 
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    res.status(500).json({ error: 'Failed to change user role' });
  }
};

export const moderateContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { contentType, contentId } = req.params;
    const { action, reason } = req.body;

    const validActions = ['approve', 'reject', 'flag'];
    if (!validActions.includes(action)) {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    const validContentTypes = ['job', 'profile', 'application'];
    if (!validContentTypes.includes(contentType)) {
      res.status(400).json({ error: 'Invalid content type' });
      return;
    }

    const collection = contentType === 'job' ? 'jobs' : 
                       contentType === 'profile' ? 'users' : 'applications';

    const contentDoc = await getDb().collection(collection).doc(contentId).get();
    
    if (!contentDoc.exists) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    const statusMap: { [key: string]: string } = {
      approve: 'active',
      reject: 'rejected',
      flag: 'flagged'
    };

    await getDb().collection(collection).doc(contentId).update({
      status: statusMap[action],
      moderatedAt: FieldValue.serverTimestamp(),
      moderatedBy: req.user.uid,
      moderationReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await getDb().collection('moderationLogs').add({
      contentType,
      contentId,
      action,
      reason,
      performedBy: req.user.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ 
      message: `Content ${action}d successfully` 
    });
  } catch (error) {
    console.error('Error moderating content:', error);
    res.status(500).json({ error: 'Failed to moderate content' });
  }
};

export const getPlatformMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [usersSnapshot, jobsSnapshot, applicationsSnapshot] = await Promise.all([
      getDb().collection('users').where('createdAt', '>=', start).where('createdAt', '<=', end).get(),
      getDb().collection('jobs').where('createdAt', '>=', start).where('createdAt', '<=', end).get(),
      getDb().collection('applications').where('appliedAt', '>=', start).where('appliedAt', '<=', end).get(),
    ]);

    const usersByRole = usersSnapshot.docs.reduce((acc: any, doc) => {
      const role = doc.data().role;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const jobsByStatus = jobsSnapshot.docs.reduce((acc: any, doc) => {
      const status = doc.data().status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const applicationsByStatus = applicationsSnapshot.docs.reduce((acc: any, doc) => {
      const status = doc.data().status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const totalCounts = await Promise.all([
      getDb().collection('users').count().get(),
      getDb().collection('jobs').count().get(),
      getDb().collection('applications').count().get(),
    ]);

    const metrics = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      totals: {
        users: totalCounts[0].data().count,
        jobs: totalCounts[1].data().count,
        applications: totalCounts[2].data().count,
      },
      newInPeriod: {
        users: usersSnapshot.size,
        jobs: jobsSnapshot.size,
        applications: applicationsSnapshot.size,
      },
      breakdown: {
        usersByRole,
        jobsByStatus,
        applicationsByStatus,
      },
      dailyAverages: {
        users: Math.round(usersSnapshot.size / Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
        jobs: Math.round(jobsSnapshot.size / Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
        applications: Math.round(applicationsSnapshot.size / Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))),
      },
    };

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error getting platform metrics:', error);
    res.status(500).json({ error: 'Failed to get platform metrics' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { action, performedBy, targetUserId, page = 1, limit = 50 } = req.query;

    let query = getDb().collection('auditLogs') as any;

    if (action) {
      query = query.where('action', '==', action);
    }

    if (performedBy) {
      query = query.where('performedBy', '==', performedBy);
    }

    if (targetUserId) {
      query = query.where('targetUserId', '==', targetUserId);
    }

    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(Number(limit))
      .offset((Number(page) - 1) * Number(limit))
      .get();

    const logs = await Promise.all(
      snapshot.docs.map(async (doc: any) => {
        const data = doc.data();
        const [performerDoc, targetDoc] = await Promise.all([
          data.performedBy ? getDb().collection('users').doc(data.performedBy).get() : null,
          data.targetUserId ? getDb().collection('users').doc(data.targetUserId).get() : null,
        ]);

        return {
          id: doc.id,
          ...data,
          performedByEmail: performerDoc?.data()?.email || 'Unknown',
          targetUserEmail: targetDoc?.data()?.email || null,
          timestamp: data.timestamp?.toDate(),
        };
      })
    );

    const totalCount = await query.count().get();

    res.status(200).json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.data().count,
        totalPages: Math.ceil(totalCount.data().count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
};

export const exportData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { dataType, format = 'json' } = req.query;

    const validDataTypes = ['users', 'jobs', 'applications', 'audit'];
    if (!dataType || !validDataTypes.includes(dataType as string)) {
      res.status(400).json({ error: 'Invalid data type' });
      return;
    }

    const collection = dataType === 'audit' ? 'auditLogs' : dataType as string;
    const snapshot = await getDb().collection(collection).get();

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (format === 'csv') {
      if (data.length === 0) {
        res.status(200).send('');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = (row as any)[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value).includes(',') ? `"${String(value)}"` : String(value);
          }).join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dataType}-export.csv"`);
      res.status(200).send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${dataType}-export.json"`);
      res.status(200).json(data);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

export const sendSystemNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { targetRole, subject, message } = req.body;

    if (!targetRole || !subject || !message) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const validRoles = ['all', 'student', 'employer'];
    if (!validRoles.includes(targetRole)) {
      res.status(400).json({ error: 'Invalid target role' });
      return;
    }

    let query = getDb().collection('users');
    
    if (targetRole !== 'all') {
      query = query.where('role', '==', targetRole) as any;
    }

    const snapshot = await query.get();
    
    const batch = getDb().batch();
    const notificationPromises: Promise<boolean>[] = [];

    snapshot.docs.forEach(doc => {
      const userData = doc.data();
      
      batch.set(getDb().collection('notifications').doc(), {
        userId: doc.id,
        type: 'system',
        subject,
        message,
        read: false,
        sentBy: req.user!.uid,
        sentAt: FieldValue.serverTimestamp(),
      });

      if (userData.email && userData.emailNotifications !== false) {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .footer { text-align: center; padding: 20px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>System Notification</h1>
              </div>
              <div class="content">
                <h2>${subject}</h2>
                <p>${message}</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 InternLink. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        notificationPromises.push(
          emailService.sendEmail({
            to: userData.email,
            subject: `InternLink: ${subject}`,
            html
          })
        );
      }
    });

    await batch.commit();
    const emailResults = await Promise.all(notificationPromises);
    const successCount = emailResults.filter(r => r).length;

    res.status(200).json({ 
      message: 'Notification sent successfully',
      recipientCount: snapshot.size,
      emailsSent: successCount
    });
  } catch (error) {
    console.error('Error sending system notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};