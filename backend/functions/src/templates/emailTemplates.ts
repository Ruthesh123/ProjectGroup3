export const emailTemplates = {
  verification: (name: string, verificationLink: string) => ({
    subject: 'Verify Your InternLink Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.95;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
          }
          .message {
            color: #4a5568;
            font-size: 16px;
            margin-bottom: 30px;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .link-fallback {
            margin-top: 30px;
            padding: 20px;
            background-color: #f7fafc;
            border-radius: 8px;
            word-break: break-all;
          }
          .link-fallback p {
            margin: 5px 0;
            color: #718096;
            font-size: 14px;
          }
          .link-fallback a {
            color: #667eea;
            font-size: 14px;
          }
          .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 5px 0;
            color: #718096;
            font-size: 14px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .social-links {
            margin-top: 20px;
          }
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #718096;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>InternLink</h1>
            <p>Your Gateway to Career Success</p>
          </div>

          <div class="content">
            <div class="greeting">Hello ${name}! 👋</div>

            <div class="message">
              Welcome to InternLink! We're excited to have you join our community of students and employers.
              To get started, please verify your email address by clicking the button below.
            </div>

            <div class="button-container">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>

            <div class="link-fallback">
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <a href="${verificationLink}">${verificationLink}</a>
            </div>

            <div class="message">
              <strong>Why verify your email?</strong><br>
              • Ensure you receive important notifications<br>
              • Access all platform features<br>
              • Maintain account security<br><br>

              This verification link will expire in 24 hours for security reasons.
            </div>
          </div>

          <div class="footer">
            <p>This email was sent to you because you signed up for InternLink.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p style="margin-top: 20px;">
              <a href="https://interlink.com/help">Help Center</a> •
              <a href="https://interlink.com/privacy">Privacy Policy</a> •
              <a href="https://interlink.com/terms">Terms of Service</a>
            </p>
            <p style="margin-top: 20px; color: #a0aec0;">
              © 2024 InternLink. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Reset Your InternLink Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .alert {
            background-color: #fff5f5;
            border-left: 4px solid #fc8181;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 4px;
          }
          .alert-title {
            color: #c53030;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .alert-message {
            color: #742a2a;
            font-size: 14px;
          }
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
          }
          .message {
            color: #4a5568;
            font-size: 16px;
            margin-bottom: 30px;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
          }
          .link-fallback {
            margin-top: 30px;
            padding: 20px;
            background-color: #f7fafc;
            border-radius: 8px;
            word-break: break-all;
          }
          .link-fallback p {
            margin: 5px 0;
            color: #718096;
            font-size: 14px;
          }
          .link-fallback a {
            color: #667eea;
            font-size: 14px;
          }
          .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 5px 0;
            color: #718096;
            font-size: 14px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>

          <div class="content">
            <div class="alert">
              <div class="alert-title">Security Notice</div>
              <div class="alert-message">
                You're receiving this email because a password reset was requested for your account.
              </div>
            </div>

            <div class="greeting">Hi ${name},</div>

            <div class="message">
              We received a request to reset your InternLink password. Click the button below to create a new password.
              If you didn't request this, please ignore this email - your password won't be changed.
            </div>

            <div class="button-container">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>

            <div class="link-fallback">
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <a href="${resetLink}">${resetLink}</a>
            </div>

            <div class="message">
              <strong>For your security:</strong><br>
              • This link will expire in 1 hour<br>
              • After resetting, you'll need to log in with your new password<br>
              • Consider using a strong, unique password<br>
            </div>
          </div>

          <div class="footer">
            <p>If you didn't request a password reset, please ignore this email.</p>
            <p>Your password won't be changed unless you click the link above.</p>
            <p style="margin-top: 20px;">
              <a href="https://interlink.com/help">Help Center</a> •
              <a href="https://interlink.com/security">Security</a>
            </p>
            <p style="margin-top: 20px; color: #a0aec0;">
              © 2024 InternLink. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  applicationStatus: (name: string, jobTitle: string, company: string, status: string, message?: string) => ({
    subject: `Application Update: ${jobTitle} at ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: ${status === 'accepted' ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' :
                        status === 'interview' ? 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)' :
                        status === 'rejected' ? 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)' :
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            background-color: rgba(255,255,255,0.2);
            border-radius: 20px;
            margin-top: 15px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .content {
            padding: 40px 30px;
          }
          .job-details {
            background-color: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .job-title {
            font-size: 20px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 16px;
            color: #718096;
          }
          .message {
            color: #4a5568;
            font-size: 16px;
            margin: 20px 0;
          }
          .feedback-box {
            background-color: #edf2f7;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 4px;
            margin: 30px 0;
          }
          .feedback-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
          }
          .next-steps {
            margin-top: 30px;
            padding: 20px;
            background-color: #f0fff4;
            border-radius: 8px;
          }
          .next-steps-title {
            font-weight: 600;
            color: #22543d;
            margin-bottom: 10px;
          }
          .button {
            display: inline-block;
            padding: 12px 28px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin-top: 20px;
          }
          .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 5px 0;
            color: #718096;
            font-size: 14px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${status === 'accepted' ? '🎉 Congratulations!' :
                 status === 'interview' ? '📅 Interview Invitation' :
                 status === 'rejected' ? 'Application Update' :
                 'Application Status Update'}</h1>
            <div class="status-badge">${status}</div>
          </div>

          <div class="content">
            <div class="job-details">
              <div class="job-title">${jobTitle}</div>
              <div class="company-name">${company}</div>
            </div>

            <div class="message">
              Dear ${name},<br><br>
              ${status === 'accepted' ?
                `We're thrilled to inform you that your application has been accepted! The employer was impressed with your qualifications and would like to move forward with you.` :
                status === 'interview' ?
                `Great news! The employer would like to schedule an interview with you. This is an exciting opportunity to discuss how you can contribute to their team.` :
                status === 'rejected' ?
                `Thank you for your interest in this position. After careful consideration, the employer has decided to move forward with other candidates. We encourage you to continue applying to other opportunities that match your skills.` :
                status === 'reviewing' ?
                `Good news! Your application is being reviewed by the employer. They are carefully considering your qualifications.` :
                `Your application status has been updated. Please log in to your account for more details.`}
            </div>

            ${message ? `
            <div class="feedback-box">
              <div class="feedback-title">Message from Employer:</div>
              ${message}
            </div>
            ` : ''}

            ${status === 'accepted' || status === 'interview' ? `
            <div class="next-steps">
              <div class="next-steps-title">Next Steps:</div>
              ${status === 'accepted' ?
                `• Check your email regularly for further instructions<br>
                 • Prepare any required documents<br>
                 • Respond promptly to employer communications` :
                `• Check your email for interview details<br>
                 • Research the company and prepare questions<br>
                 • Review your resume and be ready to discuss your experience`}
            </div>
            ` : ''}

            <center>
              <a href="https://interlink.com/applications" class="button">View Application</a>
            </center>
          </div>

          <div class="footer">
            <p>You're receiving this because you applied for a job through InternLink.</p>
            <p style="margin-top: 20px;">
              <a href="https://interlink.com/applications">My Applications</a> •
              <a href="https://interlink.com/help">Help Center</a>
            </p>
            <p style="margin-top: 20px; color: #a0aec0;">
              © 2024 InternLink. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  welcome: (name: string, role: string) => ({
    subject: 'Welcome to InternLink!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 50px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 36px;
            font-weight: 600;
          }
          .header p {
            margin: 0;
            font-size: 18px;
            opacity: 0.95;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
          }
          .message {
            color: #4a5568;
            font-size: 16px;
            margin-bottom: 30px;
          }
          .features {
            background-color: #f7fafc;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
          }
          .features-title {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
          }
          .feature-item {
            display: flex;
            align-items: start;
            margin-bottom: 15px;
          }
          .feature-icon {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            margin-right: 15px;
            flex-shrink: 0;
          }
          .feature-text {
            color: #4a5568;
            font-size: 15px;
          }
          .cta-section {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
          }
          .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 5px 0;
            color: #718096;
            font-size: 14px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to InternLink! 🎉</h1>
            <p>Your journey to success starts here</p>
          </div>

          <div class="content">
            <div class="greeting">Hello ${name}!</div>

            <div class="message">
              Your account has been successfully verified and you're all set to start ${
                role === 'student' ? 'exploring amazing internship opportunities' :
                role === 'employer' ? 'finding talented candidates for your team' :
                'managing the platform'
              }.
            </div>

            <div class="features">
              <div class="features-title">
                ${role === 'student' ? 'What you can do now:' :
                  role === 'employer' ? 'Get started with:' :
                  'Your capabilities:'}
              </div>

              ${role === 'student' ? `
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Browse and apply to internship opportunities</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Upload your resume and build your profile</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Track your application status in real-time</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Save jobs and get notifications about new opportunities</div>
              </div>
              ` : role === 'employer' ? `
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Post job opportunities and internships</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Review and manage applications</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Connect with talented students</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Track recruitment metrics and insights</div>
              </div>
              ` : `
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Manage users and verify accounts</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Monitor platform activity</div>
              </div>
              <div class="feature-item">
                <div class="feature-icon">✓</div>
                <div class="feature-text">Generate reports and analytics</div>
              </div>
              `}
            </div>

            <div class="cta-section">
              <a href="${role === 'student' ? 'https://interlink.com/jobs' :
                        role === 'employer' ? 'https://interlink.com/dashboard' :
                        'https://interlink.com/admin'}" class="button">
                ${role === 'student' ? 'Browse Jobs' :
                  role === 'employer' ? 'Go to Dashboard' :
                  'Admin Panel'}
              </a>
            </div>

            <div class="message">
              <strong>Need help getting started?</strong><br>
              Check out our <a href="https://interlink.com/guide" style="color: #667eea;">getting started guide</a>
              or visit our <a href="https://interlink.com/help" style="color: #667eea;">help center</a> for tutorials and tips.
            </div>
          </div>

          <div class="footer">
            <p>Questions? We're here to help!</p>
            <p><a href="mailto:support@interlink.com">support@interlink.com</a></p>
            <p style="margin-top: 20px;">
              <a href="https://interlink.com">Website</a> •
              <a href="https://interlink.com/help">Help Center</a> •
              <a href="https://interlink.com/contact">Contact Us</a>
            </p>
            <p style="margin-top: 20px; color: #a0aec0;">
              © 2024 InternLink. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};