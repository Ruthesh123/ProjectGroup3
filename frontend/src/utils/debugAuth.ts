import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Debug utility to monitor auth state changes
 * Add this to your browser console or component
 */
export function debugAuth() {
  console.log('🔍 Starting auth state monitoring...');

  // Monitor auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('✅ User logged in:', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      });
    } else {
      console.log('❌ User logged out or no user');
    }
  });

  // Test logout directly
  const testLogout = async () => {
    try {
      console.log('🚀 Testing logout...');
      await auth.signOut();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  // Make it available globally
  if (typeof window !== 'undefined') {
    (window as any).testLogout = testLogout;
    (window as any).currentUser = () => auth.currentUser;
  }

  return {
    testLogout,
    getCurrentUser: () => auth.currentUser
  };
}

// Auto-start debugging in development
if (import.meta.env.DEV) {
  debugAuth();
}