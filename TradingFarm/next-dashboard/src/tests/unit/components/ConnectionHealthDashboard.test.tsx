import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, waitForAsync } from '../../test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionHealthDashboard } from '@/components/monitoring/ConnectionHealthDashboard';
import * as connectionHealthUtils from '@/utils/supabase/connection-health';

// Mock the connection health utility
vi.mock('@/utils/supabase/connection-health', () => ({
  getConnectionHealthRecords: vi.fn(),
  updateConnectionHealthRecord: vi.fn(),
}));

describe('ConnectionHealthDashboard Component', () => {
  const mockHealthData = [
    {
      id: '1',
      exchange_id: 'coinbase',
      user_id: 'user123',
      status: 'online',
      latency_ms: 120,
      last_checked_at: new Date().toISOString(),
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      exchange_id: 'bybit',
      user_id: 'user123',
      status: 'offline',
      latency_ms: 0,
      last_checked_at: new Date(Date.now() - 10000).toISOString(),
      error_message: 'Connection timeout',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      exchange_id: 'binance',
      user_id: 'user123',
      status: 'degraded',
      latency_ms: 450,
      last_checked_at: new Date().toISOString(),
      error_message: 'High latency detected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (connectionHealthUtils.getConnectionHealthRecords as any).mockResolvedValue(mockHealthData);
  });

  it('renders the dashboard with connection health data', async () => {
    renderWithProviders(<ConnectionHealthDashboard />);
    
    // Wait for the component to load data
    await waitFor(() => {
      expect(connectionHealthUtils.getConnectionHealthRecords).toHaveBeenCalled();
    });
    
    // Check if the component renders the summary statistics
    expect(screen.getByText(/Connection Health Overview/i)).toBeInTheDocument();
    
    // Check if the data table is rendered with at least one of our mock exchanges
    expect(screen.getByText(/coinbase/i)).toBeInTheDocument();
    
    // Check if status indicators are rendered
    expect(screen.getByText(/online/i)).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText(/degraded/i)).toBeInTheDocument();
  });

  it('filters health data based on status tab selection', async () => {
    renderWithProviders(<ConnectionHealthDashboard />);
    
    await waitFor(() => {
      expect(connectionHealthUtils.getConnectionHealthRecords).toHaveBeenCalled();
    });
    
    // Click on the "Online" tab
    const onlineTab = screen.getByRole('tab', { name: /online/i });
    await userEvent.click(onlineTab);
    
    // Now we should only see the Coinbase exchange which is online
    expect(screen.getByText(/coinbase/i)).toBeInTheDocument();
    
    // Bybit which is offline should not be visible
    const bybitElement = screen.queryByText(/bybit/i);
    expect(bybitElement).not.toBeInTheDocument();
  });

  it('refreshes the data when refresh button is clicked', async () => {
    renderWithProviders(<ConnectionHealthDashboard />);
    
    await waitFor(() => {
      expect(connectionHealthUtils.getConnectionHealthRecords).toHaveBeenCalledTimes(1);
    });
    
    // Find and click the refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);
    
    // The getConnectionHealthRecords should be called again
    expect(connectionHealthUtils.getConnectionHealthRecords).toHaveBeenCalledTimes(2);
  });
});
