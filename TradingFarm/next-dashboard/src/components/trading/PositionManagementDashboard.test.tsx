import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PositionManagementDashboard } from './PositionManagementDashboard';
import { usePositions } from '@/hooks/use-positions';
import { useOrderManagement } from '@/hooks/use-order-management';
import { useMarketData } from '@/hooks/use-market-data';

// Mock the hooks
jest.mock('@/hooks/use-positions', () => ({
  usePositions: jest.fn()
}));

jest.mock('@/hooks/use-order-management', () => ({
  useOrderManagement: jest.fn()
}));

jest.mock('@/hooks/use-market-data', () => ({
  useMarketData: jest.fn()
}));

// Mock the toast component
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('PositionManagementDashboard', () => {
  // Default props
  const defaultProps = {
    exchange: 'binance',
    exchangeCredentialId: 123
  };

  // Mock position data
  const mockPositions = [
    {
      symbol: 'BTC/USD',
      side: 'long' as const,
      size: 0.5,
      entryPrice: 48000,
      markPrice: 50000,
      liquidationPrice: 30000,
      notionalValue: 25000,
      unrealizedPnl: 1000,
      unrealizedPnlPercent: 4,
      initialMargin: 8000,
      exchange: 'binance'
    },
    {
      symbol: 'ETH/USD',
      side: 'short' as const,
      size: -2,
      entryPrice: 3000,
      markPrice: 2900,
      liquidationPrice: 4500,
      notionalValue: 5800,
      unrealizedPnl: 200,
      unrealizedPnlPercent: 3.45,
      initialMargin: 2000,
      exchange: 'binance'
    }
  ];

  // Mock position history data
  const mockPositionHistory = [
    {
      timestamp: '2023-01-01T10:00:00Z',
      symbol: 'BTC/USD',
      side: 'long' as const,
      size: 0.5,
      price: 47000,
      pnl: 500,
      cumulativePnl: 500
    },
    {
      timestamp: '2023-01-01T11:00:00Z',
      symbol: 'BTC/USD',
      side: 'long' as const,
      size: 0.5,
      price: 48000,
      pnl: 800,
      cumulativePnl: 1300
    }
  ];

  // Common mock setup
  beforeEach(() => {
    // Mock positions data
    (usePositions as jest.Mock).mockReturnValue({
      positions: mockPositions,
      positionHistory: mockPositionHistory,
      accountSummary: {
        totalBalance: 50000,
        totalAvailable: 40000,
        totalMargin: 10000,
        totalUnrealizedPnl: 1200,
        maintenanceMargin: 5000,
        marginLevel: 200
      },
      isLoading: false,
      error: null
    });

    // Mock order management
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder: jest.fn().mockResolvedValue({ id: 'order123' }),
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });

    // Mock market data
    (useMarketData as jest.Mock).mockReturnValue({
      ticker: { lastPrice: 50000 },
      orderBook: {
        bids: [[49900, 2], [49800, 3]],
        asks: [[50100, 1], [50200, 2]]
      }
    });
  });

  it('renders correctly with positions', () => {
    render(<PositionManagementDashboard {...defaultProps} />);
    
    // Check if overview section is rendered
    expect(screen.getByText('Position Overview')).toBeInTheDocument();
    
    // Check if position table is rendered with data
    expect(screen.getByText('BTC/USD')).toBeInTheDocument();
    expect(screen.getByText('ETH/USD')).toBeInTheDocument();
    
    // Check if P&L values are rendered
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    
    // Check if position actions are available
    expect(screen.getAllByText('TP/SL').length).toBe(2);
    expect(screen.getAllByText('Close').length).toBe(2);
  });

  it('renders empty state when no positions', () => {
    (usePositions as jest.Mock).mockReturnValue({
      positions: [],
      positionHistory: [],
      accountSummary: {
        totalBalance: 50000,
        totalAvailable: 50000,
        totalMargin: 0,
        totalUnrealizedPnl: 0,
        maintenanceMargin: 0,
        marginLevel: 0
      },
      isLoading: false,
      error: null
    });
    
    render(<PositionManagementDashboard {...defaultProps} />);
    
    // Check if empty state is rendered
    expect(screen.getByText('No open positions')).toBeInTheDocument();
  });

  it('handles position close action', async () => {
    const createOrder = jest.fn().mockResolvedValue({ id: 'order123' });
    
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder,
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });
    
    render(<PositionManagementDashboard {...defaultProps} />);
    
    // Click the close button for the first position
    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[0]);
    
    // Verify the order creation was called with correct parameters
    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
        symbol: 'BTC/USD',
        side: 'sell',
        type: 'market',
        quantity: 0.5,
        reduceOnly: true,
        exchangeCredentialId: 123
      }));
    });
  });

  it('opens TP/SL modal on button click', () => {
    render(<PositionManagementDashboard {...defaultProps} />);
    
    // Click the TP/SL button for the first position
    const tpslButtons = screen.getAllByText('TP/SL');
    fireEvent.click(tpslButtons[0]);
    
    // Check if modal was opened
    expect(screen.getByText('Set Take Profit / Stop Loss')).toBeInTheDocument();
    expect(screen.getByText(/Position: BTC\/USD LONG/i)).toBeInTheDocument();
  });

  it('submits TP/SL orders', async () => {
    const createOrder = jest.fn().mockResolvedValue({ id: 'order123' });
    
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder,
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });
    
    render(<PositionManagementDashboard {...defaultProps} />);
    
    // Open TP/SL modal
    const tpslButtons = screen.getAllByText('TP/SL');
    fireEvent.click(tpslButtons[0]);
    
    // Set take profit price
    const takeProfitInput = screen.getByLabelText('Take Profit Price');
    fireEvent.change(takeProfitInput, { target: { value: '55000' } });
    
    // Set stop loss price
    const stopLossInput = screen.getByLabelText('Stop Loss Price');
    fireEvent.change(stopLossInput, { target: { value: '45000' } });
    
    // Submit form
    const setOrdersButton = screen.getByText('Set Orders');
    fireEvent.click(setOrdersButton);
    
    // Verify the take profit order creation
    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
        symbol: 'BTC/USD',
        side: 'sell',
        type: 'limit',
        price: 55000,
        reduceOnly: true,
        metadata: expect.objectContaining({
          orderTag: 'take-profit'
        })
      }));
    });
    
    // Verify the stop loss order creation
    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
        symbol: 'BTC/USD',
        side: 'sell',
        type: 'stop_market',
        stopPrice: 45000,
        reduceOnly: true,
        metadata: expect.objectContaining({
          orderTag: 'stop-loss'
        })
      }));
    });
  });

  it('renders P&L chart', () => {
    render(<PositionManagementDashboard {...defaultProps} />);
    
    // Check if P&L history section is rendered
    expect(screen.getByText('P&L History')).toBeInTheDocument();
    
    // Check if chart tabs are available
    expect(screen.getByRole('tab', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Week' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Month' })).toBeInTheDocument();
  });
});
