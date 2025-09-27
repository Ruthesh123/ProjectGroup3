export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  subject: string;
  message: string;
  read: boolean;
  metadata?: NotificationMetadata;
  sentBy?: string;
  sentAt: Date | any;
  readAt?: Date | any;
  expiresAt?: Date | any;
}

export enum NotificationType {
  SYSTEM = 'system',
  JOB_APPLICATION = 'job_application',
  APPLICATION_STATUS = 'application_status',
  JOB_MATCH = 'job_match',
  ACCOUNT = 'account',
  MESSAGE = 'message',
  REMINDER = 'reminder',
  ALERT = 'alert'
}

export interface NotificationMetadata {
  jobId?: string;
  applicationId?: string;
  employerId?: string;
  studentId?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationTypes: {
    [key in NotificationType]?: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  subjectTemplate: string;
  messageTemplate: string;
  emailTemplate?: string;
  variables: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationBatch {
  id: string;
  type: 'broadcast' | 'targeted' | 'scheduled';
  targetAudience: {
    roles?: string[];
    userIds?: string[];
    conditions?: any;
  };
  notification: Omit<Notification, 'userId' | 'id'>;
  scheduledFor?: Date;
  sentAt?: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  stats?: {
    total: number;
    sent: number;
    failed: number;
    read: number;
  };
}