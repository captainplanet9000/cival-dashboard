/**
 * Dashboard Layout Integration Tests
 * Tests the integration between dashboard components, navigation, and overall layout
 */

import { render, screen, waitFor } from '@testing-library/react';
import { SidebarNav } from '@/components/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard-header';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn()
  }))
}));

// Mock auth
jest.mock('@/components/auth/auth-check', () => ({
  AuthCheck: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock toast component
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('Dashboard Layout Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the sidebar navigation with correct links', () => {
    // Mock nav items
    const navItems = [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: 'LayoutDashboard'
      },
      {
        title: 'Vault',
        href: '/dashboard/vault',
        icon: 'Vault'
      },
      {
        title: 'Trading',
        href: '/dashboard/trading',
        icon: 'LineChart'
      }
    ];

    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <SidebarNav items={navItems} />
      </ErrorBoundary>
    );

    // Verify nav items are rendered correctly
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Vault')).toBeInTheDocument();
    expect(screen.getByText('Trading')).toBeInTheDocument();
  });

  it('should render the dashboard header with user menu', async () => {
    // Mock user
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      avatar_url: null
    };

    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <DashboardHeader user={user} />
      </ErrorBoundary>
    );

    // Check for header components
    expect(screen.getByText('Trading Farm')).toBeInTheDocument();
    
    // Verify user information is displayed
    await waitFor(() => {
      const userNameElement = screen.getByText('Test User');
      expect(userNameElement).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', () => {
    // Create a component that will throw an error
    const ErrorComponent = () => {
      throw new Error('Test error');
      return null;
    };

    // Render with error boundary
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Check that the fallback UI is rendered
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
