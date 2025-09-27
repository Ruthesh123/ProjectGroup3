import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      const configDoc = await db.collection('config').doc('email').get();
      
      if (configDoc.exists) {
        const config = configDoc.data() as EmailConfig;
        
        this.transporter = nodemailer.createTransport({
          host: config.host || 'smtp.gmail.com',
          port: config.port || 587,
          secure: config.secure || false,
          auth: {
            user: config.auth.user || process.env.EMAIL_USER || '',
            pass: config.auth.pass || process.env.EMAIL_PASS || ''
          }
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'noreply@interlink.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      await this.initializeTransporter();
    }

    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'InternLink <noreply@interlink.com>',
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html
      };

      await this.transporter.sendMail(mailOptions);

      await db.collection('emailLogs').add({
        to: options.to,
        subject: options.subject,
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      await db.collection('emailLogs').add({
        to: options.to,
        subject: options.subject,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return false;
    }
  }

  async sendWithRetry(options: EmailOptions, maxRetries: number = 3): Promise<boolean> {
    let retries = 0;
    
    while (retries < maxRetries) {
      const sent = await this.sendEmail(options);
      
      if (sent) {
        return true;
      }
      
      retries++;
      
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
    
    return false;
  }

  async sendApplicationConfirmation(studentEmail: string, jobTitle: string, companyName: string): Promise<boolean> {
    const subject = 'Application Submitted Successfully';
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
            <h1>Application Submitted</h1>
          </div>
          <div class="content">
            <p>Dear Student,</p>
            <p>Your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.</p>
            <p>The employer will review your application and get back to you soon.</p>
            <p>You can track your application status in your dashboard.</p>
            <p>Best of luck!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 InternLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendWithRetry({ to: studentEmail, subject, html });
  }

  async sendStatusUpdate(studentEmail: string, jobTitle: string, companyName: string, newStatus: string): Promise<boolean> {
    const subject = `Application Status Update - ${jobTitle}`;
    const statusMessages: { [key: string]: string } = {
      reviewing: 'is currently being reviewed',
      accepted: 'has been accepted! Congratulations!',
      rejected: 'has been reviewed and we regret to inform you that you were not selected at this time',
      interview: 'has moved to the interview stage! You will be contacted soon with interview details'
    };

    const message = statusMessages[newStatus] || 'has been updated';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .status-box { padding: 15px; margin: 20px 0; background-color: ${newStatus === 'accepted' ? '#4CAF50' : newStatus === 'rejected' ? '#f44336' : '#FF9800'}; color: white; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Status Update</h1>
          </div>
          <div class="content">
            <p>Dear Student,</p>
            <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> ${message}.</p>
            <div class="status-box">
              <h3>Status: ${newStatus.toUpperCase()}</h3>
            </div>
            <p>Please check your dashboard for more details.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 InternLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendWithRetry({ to: studentEmail, subject, html });
  }

  async sendNewApplicationNotification(employerEmail: string, studentName: string, jobTitle: string): Promise<boolean> {
    const subject = `New Application Received - ${jobTitle}`;
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
          .button { display: inline-block; padding: 10px 20px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Application Received</h1>
          </div>
          <div class="content">
            <p>Dear Employer,</p>
            <p>You have received a new application for the position of <strong>${jobTitle}</strong>.</p>
            <p>Applicant: <strong>${studentName}</strong></p>
            <p>Please log in to your dashboard to review the application.</p>
            <p><a href="${process.env.APP_URL}/employer/applications" class="button">View Application</a></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 InternLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendWithRetry({ to: employerEmail, subject, html });
  }

  async sendJobMatchAlert(studentEmail: string, jobs: any[]): Promise<boolean> {
    const subject = 'New Jobs Match Your Profile';
    const jobListHtml = jobs.map(job => `
      <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
        <h3>${job.title}</h3>
        <p><strong>${job.companyName}</strong> - ${job.location}</p>
        <p>${job.description.substring(0, 150)}...</p>
        <a href="${process.env.APP_URL}/jobs/${job.id}" style="color: #4A90E2;">View Job</a>
      </div>
    `).join('');

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
            <h1>New Job Opportunities</h1>
          </div>
          <div class="content">
            <p>We found ${jobs.length} new job(s) that match your profile:</p>
            ${jobListHtml}
          </div>
          <div class="footer">
            <p>To unsubscribe from these alerts, update your preferences in your dashboard.</p>
            <p>&copy; 2024 InternLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendWithRetry({ to: studentEmail, subject, html });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    const subject = 'Password Reset Request';
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
          .button { display: inline-block; padding: 15px 30px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>You requested a password reset for your InternLink account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 InternLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendWithRetry({ to: email, subject, html });
  }

  async sendDailySummary(adminEmail: string, summary: any): Promise<boolean> {
    const subject = `Daily Platform Summary - ${new Date().toLocaleDateString()}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-box { background: white; padding: 15px; border-radius: 5px; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Daily Summary</h1>
          </div>
          <div class="content">
            <h2>Platform Statistics</h2>
            <div class="stats">
              <div class="stat-box">
                <h3>${summary.newUsers || 0}</h3>
                <p>New Users</p>
              </div>
              <div class="stat-box">
                <h3>${summary.newJobs || 0}</h3>
                <p>New Jobs</p>
              </div>
              <div class="stat-box">
                <h3>${summary.newApplications || 0}</h3>
                <p>New Applications</p>
              </div>
              <div class="stat-box">
                <h3>${summary.pendingReviews || 0}</h3>
                <p>Pending Reviews</p>
              </div>
            </div>
            ${summary.alerts && summary.alerts.length > 0 ? `
              <h2>Alerts</h2>
              <ul>
                ${summary.alerts.map((alert: string) => `<li>${alert}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
          <div class="footer">
            <p>&copy; 2024 InternLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendWithRetry({ to: adminEmail, subject, html });
  }
}

export const emailService = new EmailService();