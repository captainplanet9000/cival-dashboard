import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogViewer } from '@/components/monitoring/AuditLogViewer';
import * as tradingAuditUtils from '@/utils/supabase/trading-audit';

// Mock the trading audit utility
vi.mock('@/utils/supabase/trading-audit', () => ({
  getTradingAuditLogs: vi.fn(),
  getAuditLogDetails: vi.fn(),
  exportAuditLogs: vi.fn(),
}));

describe('AuditLogViewer Component', () => {
  const mockAuditLogs = [
    {
      id: '1',
      user_id: 'user123',
      action_type: 'order_created',
      action_result: 'success',
      details: { orderId: 'ord123', symbol: 'BTC/USDT', type: 'limit' },
      created_at: new Date().toISOString(),
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      exchange_id: 'coinbase',
      entity_id: 'ord123',
    },
    {
      id: '2',
      user_id: 'user123',
      action_type: 'order_cancelled',
      action_result: 'success',
      details: { orderId: 'ord123', symbol: 'BTC/USDT', reason: 'user_requested' },
      created_at: new Date(Date.now() - 60000).toISOString(),
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      exchange_id: 'coinbase',
      entity_id: 'ord123',
    },
    {
      id: '3',
      user_id: 'user456',
      action_type: 'position_closed',
      action_result: 'failure',
      details: { positionId: 'pos123', symbol: 'ETH/USDT', error: 'insufficient_balance' },
      created_at: new Date(Date.now() - 120000).toISOString(),
      ip_address: '192.168.1.2',
      user_agent: 'Mozilla/5.0',
      exchange_id: 'bybit',
      entity_id: 'pos123',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (tradingAuditUtils.getTradingAuditLogs as any).mockResolvedValue(mockAuditLogs);
    (tradingAuditUtils.getAuditLogDetails as any).mockResolvedValue(mockAuditLogs[0]);
    (tradingAuditUtils.exportAuditLogs as any).mockResolvedValue('audit_logs_export.csv');
  });

  it('renders the audit log viewer with data', async () => {
    renderWithProviders(<AuditLogViewer />);
    
    // Wait for the component to load data
    await waitFor(() => {
      expect(tradingAuditUtils.getTradingAuditLogs).toHaveBeenCalled();
    });
    
    // Check if the component renders the table header
    expect(screen.getByText(/Trading Audit Log/i)).toBeInTheDocument();
    
    // Check if the data table is rendered with some of our mock data
    expect(screen.getByText(/order_created/i)).toBeInTheDocument();
    expect(screen.getByText(/coinbase/i)).toBeInTheDocument();
    
    // Check if success/failure indicators are rendered
    expect(screen.getByText(/success/i)).toBeInTheDocument();
    expect(screen.getByText(/failure/i)).toBeInTheDocument();
  });

  it('filters logs when filter options are changed', async () => {
    renderWithProviders(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(tradingAuditUtils.getTradingAuditLogs).toHaveBeenCalled();
    });
    
    // Find and click the filter button
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await userEvent.click(filterButton);
    
    // Select "Success" in the result filter
    const resultFilter = screen.getByLabelText(/result/i);
    await userEvent.click(resultFilter);
    await userEvent.click(screen.getByText(/success/i));
    
    // Apply the filter
    const applyButton = screen.getByRole('button', { name: /apply/i });
    await userEvent.click(applyButton);
    
    // The getTradingAuditLogs should be called again with filter params
    expect(tradingAuditUtils.getTradingAuditLogs).toHaveBeenCalledTimes(2);
    expect(tradingAuditUtils.getTradingAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ actionResult: 'success' })
    );
  });

  it('shows log details when view details button is clicked', async () => {
    renderWithProviders(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(tradingAuditUtils.getTradingAuditLogs).toHaveBeenCalled();
    });
    
    // Find and click the view details button for the first log
    const detailsButtons = screen.getAllByRole('button', { name: /details/i });
    await userEvent.click(detailsButtons[0]);
    
    // The getAuditLogDetails should be called with the log ID
    expect(tradingAuditUtils.getAuditLogDetails).toHaveBeenCalledWith('1');
    
    // Wait for the details dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/Audit Log Details/i)).toBeInTheDocument();
    });
    
    // Check if detail fields are shown
    expect(screen.getByText(/BTC\/USDT/i)).toBeInTheDocument();
    expect(screen.getByText(/limit/i)).toBeInTheDocument();
  });

  it('exports logs when export button is clicked', async () => {
    renderWithProviders(<AuditLogViewer />);
    
    await waitFor(() => {
      expect(tradingAuditUtils.getTradingAuditLogs).toHaveBeenCalled();
    });
    
    // Find and click the export button
    const exportButton = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportButton);
    
    // The exportAuditLogs should be called
    expect(tradingAuditUtils.exportAuditLogs).toHaveBeenCalled();
  });
});
