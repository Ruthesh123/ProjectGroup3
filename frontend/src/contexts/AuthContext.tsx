import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // TODO: Implement Firebase auth state check
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // TODO: Implement Firebase login
      console.log('Login:', email, password);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, role: UserRole) => {
    try {
      // TODO: Implement Firebase registration
      console.log('Register:', email, password, role);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // TODO: Implement Firebase logout
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // TODO: Implement password reset
      console.log('Password reset for:', email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};