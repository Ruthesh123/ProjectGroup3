import { Request, Response } from 'express';
import { auth } from '../config/firebase';
import { emailService } from '../services/emailService';

interface ResetPasswordRequest {
  email: string;
}

export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email }: ResetPasswordRequest = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);

    // Send email with reset link using the email service
    console.log('Password reset link generated:', link);

    const emailSent = await emailService.sendPasswordResetEmail(email, link);

    if (!emailSent) {
      console.error('Failed to send password reset email to:', email);
      return res.status(500).json({
        error: 'Failed to send password reset email. Please try again.'
      });
    }

    console.log('Password reset email sent successfully to:', email);

    return res.status(200).json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    });

  } catch (error: any) {
    console.error('Password reset error:', error);

    if (error.code === 'auth/user-not-found') {
      // Don't reveal if user exists for security reasons
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    }

    return res.status(500).json({
      error: 'Failed to send password reset email. Please try again.'
    });
  }
};