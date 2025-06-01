'use client';

/**
 * Auth Bypass for Single-User Mode
 * 
 * This file creates a temporary bypass for the authentication system
 * to enable single-user operation without login requirements.
 */

import * as React from 'react';
const { createContext, useContext } = React;
type ReactNode = React.ReactNode;
import { UserProfile, UserRole } from './auth-guard';

// Mock user profile for auto-login
const MOCK_USER: UserProfile = {
  id: '1',
  email: 'admin@tradingfarm.com',
  roles: ['admin', 'user', 'premium'],
  permissions: ['all_access', 'trading', 'analytics', 'admin_panel', 'agents', 'vault'],
  twoFactorEnabled: false
};

// Auth bypass context
interface AuthBypassContextType {
  user: UserProfile;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

// Create the bypass context with default admin user
const AuthBypassContext = createContext<AuthBypassContextType>({
  user: MOCK_USER,
  isLoading: false,
  isAuthenticated: true,
  hasRole: () => true,
  hasPermission: () => true,
  refreshUser: async () => {},
  logout: async () => {},
});

/**
 * Auth Bypass Provider - automatically authenticates as admin
 */
export function AuthBypassProvider({ children }: { children: ReactNode }) {
  // Always authenticated with admin permissions
  const hasRole = (role: UserRole) => true;
  const hasPermission = (permission: string) => true;
  
  // Mock functions that do nothing
  const refreshUser = async () => {
    console.log('User refresh requested (bypassed)');
  };
  
  const logout = async () => {
    console.log('Logout requested (bypassed)');
  };
  
  return (
    <AuthBypassContext.Provider
      value={{
        user: MOCK_USER,
        isLoading: false,
        isAuthenticated: true,
        hasRole,
        hasPermission,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthBypassContext.Provider>
  );
}

// Hook to access bypass auth context
export function useAuthBypass() {
  const context = useContext(AuthBypassContext);
  if (context === undefined) {
    throw new Error('useAuthBypass must be used within an AuthBypassProvider');
  }
  return context;
}

// Component wrapper to bypass protection
export function BypassProtectedRoute({ children }: { children: ReactNode }) {
  // Always render children, bypassing any protection
  return <>{children}</>;
}
