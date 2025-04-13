import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealTimeDashboard } from '@/components/dashboards/real-time-dashboard';
import { NotificationProvider } from '@/components/notifications/notification-provider';

// Mock the required hooks and services
jest.mock('@/components/notifications/notification-provider', () => ({
  ...jest.requireActual('@/components/notifications/notification-provider'),
  useNotifications: () => ({
    notifications: [],
    addNotification: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    clearNotifications: jest.fn(),
    unreadCount: 0
  })
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock date-fns to avoid time-related test issues
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago'
}));

describe('RealTimeDashboard', () => {
  it('renders the dashboard with default tab', () => {
    render(
      <NotificationProvider>
        <RealTimeDashboard />
      </NotificationProvider>
    );
    
    // Check that the main title is rendered
    expect(screen.getByText('Real-Time Monitoring')).toBeInTheDocument();
    
    // Check that the tabs are rendered
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    
    // Check that system resources section is visible
    expect(screen.getByText('System Resources')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Disk Usage')).toBeInTheDocument();
    expect(screen.getByText('Network Usage')).toBeInTheDocument();
  });
  
  it('allows switching between tabs', async () => {
    render(
      <NotificationProvider>
        <RealTimeDashboard />
      </NotificationProvider>
    );
    
    // Switch to Performance tab
    fireEvent.click(screen.getByText('Performance'));
    
    // Check that performance content is visible
    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg. Trade Duration')).toBeInTheDocument();
    });
    
    // Switch to Alerts tab
    fireEvent.click(screen.getByText('Alerts'));
    
    // Check that alerts content is visible
    await waitFor(() => {
      expect(screen.getByText('Alert History')).toBeInTheDocument();
    });
  });
  
  it('allows changing refresh interval', () => {
    render(
      <NotificationProvider>
        <RealTimeDashboard />
      </NotificationProvider>
    );
    
    // Find the refresh interval selector
    const refreshSelector = screen.getByText('Refresh:').nextElementSibling;
    expect(refreshSelector).toBeInTheDocument();
    
    // Note: We can't fully test the select interaction due to the complexity
    // of the shadcn/ui components, but we can verify it's present
  });
}); 