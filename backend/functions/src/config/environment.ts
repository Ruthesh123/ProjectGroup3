/**
 * Environment configuration for Firebase Functions
 * This approach works with Firebase emulators and production
 */

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface AppConfig {
  email: EmailConfig;
  frontend: {
    url: string;
  };
  environment: string;
}

/**
 * Get environment configuration
 * Priority: process.env > defaults
 */
export function getConfig(): AppConfig {
  return {
    email: {
      host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.EMAIL_PORT || '2525'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '6a9a6d4b5c492a',
        pass: process.env.EMAIL_PASS || 'da34aa249cf662'
      },
      from: process.env.EMAIL_FROM || 'InternLink <noreply@interlink.com>'
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:3000'
    },
    environment: process.env.NODE_ENV || 'development'
  };
}

// Export a singleton instance
export const config = getConfig();