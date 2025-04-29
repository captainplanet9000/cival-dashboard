'use client';

import React, { ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

// User role types for role-based access control
export type UserRole = 'user' | 'admin' | 'premium';

// User profile with security-related information
export interface UserProfile {
  id: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
  twoFactorEnabled: boolean;
}

// Auth context interface
interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider component for authentication state and functionality
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Check if user is authenticated and load profile
  const loadUserProfile = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Fetch user profile with roles and permissions
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id, email, roles, permissions, two_factor_enabled')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error loading user profile:', error);
        setUser(null);
      } else {
        setUser({
          id: profile.id,
          email: profile.email || session.user.email || '',
          roles: profile.roles || ['user'],
          permissions: profile.permissions || [],
          twoFactorEnabled: profile.two_factor_enabled || false,
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize authentication state
  useEffect(() => {
    loadUserProfile();
    
    // Set up auth state listener
    const supabase = createBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          loadUserProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Check if user has a specific role
  const hasRole = (role: UserRole) => {
    return user?.roles?.includes(role) || false;
  };
  
  // Check if user has a specific permission
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };
  
  // Refresh user profile data
  const refreshUser = async () => {
    setIsLoading(true);
    await loadUserProfile();
  };
  
  // Logout functionality
  const logout = async () => {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasRole,
        hasPermission,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
  fallback?: ReactNode;
}

/**
 * Component to protect routes based on authentication and authorization
 */
export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallback = <div>You do not have permission to access this page</div>,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, hasRole, hasPermission } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    // Check if user is authenticated after loading is complete
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Verifying access...</span>
      </div>
    );
  }
  
  // If not authenticated, don't render anything (the useEffect will redirect)
  if (!isAuthenticated) {
    return null;
  }
  
  // Check if user has required roles
  const hasRequiredRoles = requiredRoles.length === 0 || 
    requiredRoles.some(role => hasRole(role));
  
  // Check if user has required permissions
  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.every(permission => hasPermission(permission));
  
  // Return children if user has required roles and permissions
  if (hasRequiredRoles && hasRequiredPermissions) {
    return <>{children}</>;
  }
  
  // Otherwise return the fallback component
  return <>{fallback}</>;
}

/**
 * Higher-order component to protect components based on roles and permissions
 */
export function withProtection(
  Component: React.ComponentType<any>,
  options: {
    requiredRoles?: UserRole[];
    requiredPermissions?: string[];
    fallback?: ReactNode;
  } = {}
) {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute
        requiredRoles={options.requiredRoles}
        requiredPermissions={options.requiredPermissions}
        fallback={options.fallback}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
