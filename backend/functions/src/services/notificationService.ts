import * as admin from 'firebase-admin';
import { Notification, NotificationType, NotificationPreferences, NotificationTemplate } from '../types/notification';
import { emailService } from './emailService';

const db = admin.firestore();

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async createNotification(notification: Omit<Notification, 'id'>): Promise<string> {
    try {
      const docRef = await db.collection('notifications').add({
        ...notification,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      // Check user preferences and send email if enabled
      await this.sendNotificationChannels(notification.userId, notification);

      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async createBulkNotifications(
    userIds: string[],
    notification: Omit<Notification, 'id' | 'userId'>
  ): Promise<void> {
    try {
      const batch = db.batch();

      userIds.forEach(userId => {
        const docRef = db.collection('notifications').doc();
        batch.set(docRef, {
          ...notification,
          userId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      });

      await batch.commit();

      // Send to notification channels for each user
      await Promise.all(
        userIds.map(userId => this.sendNotificationChannels(userId, { ...notification, userId } as Notification))
      );
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const docRef = db.collection('notifications').doc(notificationId);
      const doc = await docRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return false;
      }

      await docRef.update({
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {}
  ): Promise<Notification[]> {
    try {
      let query = db.collection('notifications')
        .where('userId', '==', userId) as any;

      if (options.unreadOnly) {
        query = query.where('read', '==', false);
      }

      if (options.type) {
        query = query.where('type', '==', options.type);
      }

      query = query.orderBy('sentAt', 'desc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.offset(options.offset);
      }

      const snapshot = await query.get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate(),
        readAt: doc.data().readAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const docRef = db.collection('notifications').doc(notificationId);
      const doc = await docRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return false;
      }

      await docRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const snapshot = await db.collection('notifications')
        .where('sentAt', '<', cutoffDate)
        .where('read', '==', true)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      return 0;
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const doc = await db.collection('notificationPreferences').doc(userId).get();
      if (!doc.exists) {
        // Return default preferences
        return {
          userId,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          notificationTypes: {
            [NotificationType.SYSTEM]: true,
            [NotificationType.JOB_APPLICATION]: true,
            [NotificationType.APPLICATION_STATUS]: true,
            [NotificationType.JOB_MATCH]: true,
            [NotificationType.ACCOUNT]: true,
            [NotificationType.MESSAGE]: true,
            [NotificationType.REMINDER]: true,
            [NotificationType.ALERT]: true
          }
        };
      }
      return doc.data() as NotificationPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      await db.collection('notificationPreferences').doc(userId).set(
        {
          ...preferences,
          userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  private async sendNotificationChannels(
    userId: string,
    notification: Notification
  ): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);

      if (!preferences) return;

      // Check if this notification type is enabled
      if (preferences.notificationTypes[notification.type] === false) {
        return;
      }

      // Send email if enabled
      if (preferences.emailNotifications) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.email) {
          await this.sendEmailNotification(userData.email, notification, userData);
        }
      }

      // Push notifications can be implemented here
      if (preferences.pushNotifications) {
        // await this.sendPushNotification(userId, notification);
      }

      // SMS notifications can be implemented here
      if (preferences.smsNotifications && notification.metadata?.priority === 'high') {
        // await this.sendSMSNotification(userId, notification);
      }
    } catch (error) {
      console.error('Error sending notification channels:', error);
    }
  }

  private async sendEmailNotification(
    email: string,
    notification: Notification,
    userData: any
  ): Promise<void> {
    try {
      const html = this.generateEmailHTML(notification, userData);

      await emailService.sendEmail({
        to: email,
        subject: `InternLink: ${notification.subject}`,
        html
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  private generateEmailHTML(notification: Notification, userData: any): string {
    const actionButton = notification.metadata?.actionUrl
      ? `<a href="${notification.metadata.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">View Details</a>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px 20px; background-color: #f9f9f9; }
          .notification-type { display: inline-block; padding: 4px 12px; background-color: #e2e8f0; color: #4a5568; border-radius: 12px; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; }
          .message { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .footer a { color: #4A90E2; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>InternLink</h1>
          </div>
          <div class="content">
            <span class="notification-type">${notification.type.replace('_', ' ')}</span>
            <div class="message">
              <h2 style="color: #2d3748; margin-top: 0;">${notification.subject}</h2>
              <p style="color: #4a5568; font-size: 16px;">${notification.message}</p>
              ${actionButton}
            </div>
          </div>
          <div class="footer">
            <p>You're receiving this email because you have notifications enabled for your InternLink account.</p>
            <p><a href="https://interlink.com/settings/notifications">Manage your notification preferences</a></p>
            <p>&copy; 2024 InternLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Job-specific notifications
  async notifyJobMatch(studentId: string, jobId: string): Promise<void> {
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();

    if (!jobData) return;

    await this.createNotification({
      userId: studentId,
      type: NotificationType.JOB_MATCH,
      subject: 'New Job Match!',
      message: `A new job matching your profile has been posted: ${jobData.title} at ${jobData.companyName}`,
      read: false,
      metadata: {
        jobId,
        actionUrl: `/jobs/${jobId}`,
        priority: 'medium'
      },
      sentAt: new Date()
    });
  }

  async notifyApplicationStatusChange(
    applicationId: string,
    newStatus: string
  ): Promise<void> {
    const appDoc = await db.collection('applications').doc(applicationId).get();
    const appData = appDoc.data();

    if (!appData) return;

    const statusMessages: { [key: string]: string } = {
      reviewing: 'Your application is being reviewed',
      accepted: 'Congratulations! Your application has been accepted',
      rejected: 'Your application status has been updated',
      interview: 'You have been selected for an interview!'
    };

    await this.createNotification({
      userId: appData.studentId,
      type: NotificationType.APPLICATION_STATUS,
      subject: 'Application Status Update',
      message: statusMessages[newStatus] || `Your application status has been updated to ${newStatus}`,
      read: false,
      metadata: {
        applicationId,
        jobId: appData.jobId,
        actionUrl: `/applications/${applicationId}`,
        priority: newStatus === 'accepted' || newStatus === 'interview' ? 'high' : 'medium'
      },
      sentAt: new Date()
    });
  }
}

export const notificationService = NotificationService.getInstance();