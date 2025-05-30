/**
 * Tests for the auth-guard component
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { AuthProvider, ProtectedRoute, useAuth, UserRole } from './auth-guard';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createBrowserClient: jest.fn(),
}));

describe('AuthGuard Components', () => {
  // Common mock setup
  const mockPush = jest.fn();
  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup router mock
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    
    // Setup Supabase mock
    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('AuthProvider', () => {
    it('should initialize with loading state and null user', async () => {
      // Setup mock to return no session
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
      
      // Create a test component to access auth context
      const TestComponent = () => {
        const { isLoading, user } = useAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="user">{JSON.stringify(user)}</div>
          </div>
        );
      };
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      // Initial state should be loading
      expect(screen.getByTestId('loading').textContent).toBe('true');
      
      // After auth check, loading should be false and user should be null
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('user').textContent).toBe('null');
      });
    });
    
    it('should load user profile when session exists', async () => {
      // Mock a valid session
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
      
      // Mock profile data
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          roles: ['user', 'premium'],
          permissions: ['read:trades', 'write:trades'],
          two_factor_enabled: true,
        },
        error: null,
      });
      
      // Create a test component to access auth context
      const TestComponent = () => {
        const { isLoading, user, isAuthenticated } = useAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
            <div data-testid="user-roles">{user?.roles?.join(',') || 'none'}</div>
          </div>
        );
      };
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      // After auth check, loading should be false and user should be populated
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
        expect(screen.getByTestId('user-roles').textContent).toBe('user,premium');
      });
    });
    
    it('should handle authentication errors gracefully', async () => {
      // Mock an error during session retrieval
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Authentication error'));
      
      // Create a test component to access auth context
      const TestComponent = () => {
        const { isLoading, user, isAuthenticated } = useAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
          </div>
        );
      };
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      // After error, loading should be false and user should not be authenticated
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });
      
      // Check that we logged the error
      expect(console.error).toHaveBeenCalledWith(
        'Authentication error:',
        expect.any(Error)
      );
    });
  });

  describe('useAuth hook', () => {
    it('should throw an error when used outside AuthProvider', () => {
      // Silence console.error for this test
      const originalError = console.error;
      console.error = jest.fn();
      
      const TestComponent = () => {
        // This should throw an error
        useAuth();
        return <div>Should not render</div>;
      };
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      // Restore console.error
      console.error = originalError;
    });
    
    it('should provide role and permission checking functions', async () => {
      // Mock a valid session with roles and permissions
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      
      // Mock profile data with specific roles and permissions
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          roles: ['user', 'premium'],
          permissions: ['read:trades', 'write:trades'],
          two_factor_enabled: false,
        },
        error: null,
      });
      
      // Create a test component to check roles and permissions
      const TestComponent = () => {
        const { hasRole, hasPermission, isLoading } = useAuth();
        if (isLoading) return <div>Loading...</div>;
        
        return (
          <div>
            <div data-testid="is-user">{hasRole('user').toString()}</div>
            <div data-testid="is-admin">{hasRole('admin').toString()}</div>
            <div data-testid="can-read-trades">{hasPermission('read:trades').toString()}</div>
            <div data-testid="can-delete-trades">{hasPermission('delete:trades').toString()}</div>
          </div>
        );
      };
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      // Check that role and permission functions work correctly
      await waitFor(() => {
        expect(screen.getByTestId('is-user').textContent).toBe('true');
        expect(screen.getByTestId('is-admin').textContent).toBe('false');
        expect(screen.getByTestId('can-read-trades').textContent).toBe('true');
        expect(screen.getByTestId('can-delete-trades').textContent).toBe('false');
      });
    });
    
    it('should provide a working logout function', async () => {
      // Mock successful signOut
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      
      // Mock a valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      
      // Mock profile data
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          roles: ['user'],
          permissions: [],
          two_factor_enabled: false,
        },
        error: null,
      });
      
      // Create a test component that uses the logout function
      const TestComponent = () => {
        const { logout, isLoading } = useAuth();
        if (isLoading) return <div>Loading...</div>;
        
        return (
          <button data-testid="logout-button" onClick={() => logout()}>
            Logout
          </button>
        );
      };
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('logout-button')).toBeInTheDocument();
      });
      
      // Click the logout button
      act(() => {
        screen.getByTestId('logout-button').click();
      });
      
      // Verify signOut was called and router.push to login
      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('ProtectedRoute', () => {
    it('should render children when user is authenticated with required roles', async () => {
      // Mock a valid session with admin role
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      
      // Mock profile data with admin role
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'admin@example.com',
          roles: ['admin'],
          permissions: ['manage:users'],
          two_factor_enabled: false,
        },
        error: null,
      });
      
      render(
        <AuthProvider>
          <ProtectedRoute requiredRoles={['admin']}>
            <div data-testid="protected-content">Admin Content</div>
          </ProtectedRoute>
        </AuthProvider>
      );
      
      // Initially should show loading
      expect(screen.queryByText('Verifying access...')).toBeInTheDocument();
      
      // After auth check, should show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
    
    it('should redirect to login when user is not authenticated', async () => {
      // Mock no session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      
      render(
        <AuthProvider>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      );
      
      // After auth check, should redirect to login
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard');
      });
      
      // Protected content should not be rendered
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
    
    it('should show fallback content when user lacks required roles', async () => {
      // Mock a valid session with regular user role
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      
      // Mock profile data with only user role (not admin)
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          roles: ['user'],
          permissions: [],
          two_factor_enabled: false,
        },
        error: null,
      });
      
      render(
        <AuthProvider>
          <ProtectedRoute 
            requiredRoles={['admin']} 
            fallback={<div data-testid="fallback">Access Denied</div>}
          >
            <div data-testid="protected-content">Admin Content</div>
          </ProtectedRoute>
        </AuthProvider>
      );
      
      // After auth check, should show fallback content
      await waitFor(() => {
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });
    });
    
    it('should check for required permissions', async () => {
      // Mock a valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
        error: null,
      });
      
      // Mock profile data with specific permissions
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          roles: ['user'],
          permissions: ['read:trades', 'write:trades'],
          two_factor_enabled: false,
        },
        error: null,
      });
      
      render(
        <AuthProvider>
          <ProtectedRoute requiredPermissions={['read:trades', 'write:trades']}>
            <div data-testid="protected-content">Trading Dashboard</div>
          </ProtectedRoute>
        </AuthProvider>
      );
      
      // After auth check, should show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });
});
