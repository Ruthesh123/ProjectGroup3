import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Firebase Authentication Hook
 * Used across all portals (Student, Employer, Admin)
 */

export interface UserProfile {
  uid: string;
  email: string;
  role: 'student' | 'employer' | 'admin';
  profile?: any;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string, profileData: any) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

// Create Auth Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          // Fetch user profile from Firestore
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            setState({
              user,
              profile: profileData,
              loading: false,
              error: null
            });
          } else {
            // Profile doesn't exist
            setState({
              user,
              profile: null,
              loading: false,
              error: 'User profile not found'
            });
          }
        } catch (error: any) {
          setState({
            user: null,
            profile: null,
            loading: false,
            error: error.message
          });
        }
      } else {
        setState({
          user: null,
          profile: null,
          loading: false,
          error: null
        });
      }
    });

    return unsubscribe;
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user profile
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (!profileDoc.exists()) {
        throw new Error('User profile not found');
      }

      const profile = profileDoc.data() as UserProfile;

      // Check if user is active
      if (!profile.isActive) {
        await signOut(auth);
        throw new Error('Your account has been suspended. Please contact support.');
      }

      setState({
        user,
        profile,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  // Register function
  const register = useCallback(async (
    email: string,
    password: string,
    role: string,
    profileData: any
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name if provided
      if (profileData.name) {
        await updateProfile(user, { displayName: profileData.name });
      }

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: email,
        role: role as 'student' | 'employer' | 'admin',
        profile: profileData,
        isActive: true,
        emailVerified: false,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);

      setState({
        user,
        profile: userProfile,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await signOut(auth);
      setState({
        user: null,
        profile: null,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      throw error;
    }
  }, []);

  // Reset password function
  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message
      }));
      throw error;
    }
  }, []);

  // Update user profile
  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!state.user) {
      throw new Error('No authenticated user');
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      await setDoc(doc(db, 'users', state.user.uid), data, { merge: true });

      const updatedProfile = {
        ...state.profile,
        ...data
      } as UserProfile;

      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        loading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      throw error;
    }
  }, [state.user, state.profile]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile,
    clearError
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Role-based auth hooks
export const useStudentAuth = () => {
  const auth = useAuth();

  if (auth.profile?.role !== 'student') {
    throw new Error('This hook can only be used by students');
  }

  return auth;
};

export const useEmployerAuth = () => {
  const auth = useAuth();

  if (auth.profile?.role !== 'employer') {
    throw new Error('This hook can only be used by employers');
  }

  return auth;
};

export const useAdminAuth = () => {
  const auth = useAuth();

  if (auth.profile?.role !== 'admin') {
    throw new Error('This hook can only be used by admins');
  }

  return auth;
};

// Auth guard hook
export const useAuthGuard = (allowedRoles: string[]) => {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        // Redirect to login
        window.location.href = '/login';
      } else if (!allowedRoles.includes(profile.role)) {
        // Redirect to unauthorized
        window.location.href = '/unauthorized';
      }
    }
  }, [user, profile, loading, allowedRoles]);

  return { isAuthorized: user && profile && allowedRoles.includes(profile.role), loading };
};

export default useAuth;