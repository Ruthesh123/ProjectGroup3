import { Request, Response } from 'express';
import { auth } from '../config/firebase';

interface ResetPasswordRequest {
  email: string;
}

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email }: ResetPasswordRequest = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);

    // TODO: Send email with reset link
    console.log('Password reset link:', link);

    res.status(200).json({
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

    res.status(500).json({
      error: 'Failed to send password reset email. Please try again.'
    });
  }
};