/**
 * Trading Summary Widget Component Tests
 */

import { render, screen } from '@testing-library/react';
import { TradingSummaryWidget } from '@/components/widgets/trading-summary-widget';
import { useLiveTrading } from '@/hooks/use-live-trading';

// Mock the hooks
jest.mock('@/hooks/use-live-trading', () => ({
  useLiveTrading: jest.fn()
}));

// Mock recharts to avoid rendering issues in Jest
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => children,
    LineChart: () => <></>,
    Line: () => <></>,
    XAxis: () => <></>,
    YAxis: () => <></>,
    CartesianGrid: () => <></>,
    Tooltip: () => <></>,
    Legend: () => <></>,
  };
});

describe('TradingSummaryWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a loading state when data is being fetched', () => {
    // Mock the hook to return loading state
    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      recentTrades: [],
      positions: [],
      orders: [],
      loading: true,
      error: null,
      loadRecentTrades: jest.fn(),
      loadPositions: jest.fn(),
      loadOrders: jest.fn(),
    });

    render(<TradingSummaryWidget />);

    // Check for loading indicator
    expect(screen.getByText(/Loading trading data/i)).toBeInTheDocument();
  });

  it('should render a message when live trading is disabled', () => {
    // Mock the hook to return disabled state
    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: false,
      recentTrades: [],
      positions: [],
      orders: [],
      loading: false,
      error: null,
      loadRecentTrades: jest.fn(),
      loadPositions: jest.fn(),
      loadOrders: jest.fn(),
    });

    render(<TradingSummaryWidget />);

    // Check for disabled message
    expect(screen.getByText(/Live trading is currently disabled/i)).toBeInTheDocument();
  });

  it('should render trading summary data when available', () => {
    // Mock trade and position data
    const mockTrades = [
      {
        id: 'trade-1',
        symbol: 'BTC/USDT',
        side: 'buy',
        price: 40000,
        amount: 0.1,
        cost: 4000,
        timestamp: Date.now() - 3600000, // 1 hour ago
        fee: { cost: 4, currency: 'USDT' },
        exchange: 'binance'
      },
      {
        id: 'trade-2',
        symbol: 'ETH/USDT',
        side: 'sell',
        price: 2800,
        amount: 0.5,
        cost: 1400,
        timestamp: Date.now() - 7200000, // 2 hours ago
        fee: { cost: 1.4, currency: 'USDT' },
        exchange: 'binance'
      }
    ];

    const mockPositions = [
      {
        symbol: 'BTC/USDT',
        amount: 0.1,
        entryPrice: 40000,
        currentPrice: 41000,
        pnl: 100,
        pnlPercentage: 2.5,
        liquidationPrice: 20000,
        updatedAt: Date.now()
      }
    ];

    const mockOrders = [
      {
        id: 'order-1',
        symbol: 'ETH/USDT',
        type: 'limit',
        side: 'buy',
        price: 2750,
        amount: 0.5,
        status: 'open',
        timestamp: Date.now() - 1800000 // 30 minutes ago
      }
    ];

    // Mock the hook to return data
    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      recentTrades: mockTrades,
      positions: mockPositions,
      orders: mockOrders,
      loading: false,
      error: null,
      loadRecentTrades: jest.fn(),
      loadPositions: jest.fn(),
      loadOrders: jest.fn(),
    });

    render(<TradingSummaryWidget />);

    // Check for summary components
    expect(screen.getByText(/Trading Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/BTC\/USDT/i)).toBeInTheDocument();
    expect(screen.getByText(/0.1/i)).toBeInTheDocument(); // Position amount
    expect(screen.getByText(/ETH\/USDT/i)).toBeInTheDocument(); // From order
  });

  it('should render error state when there is an error', () => {
    // Mock the hook to return error state
    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      recentTrades: [],
      positions: [],
      orders: [],
      loading: false,
      error: 'Failed to load trading data',
      loadRecentTrades: jest.fn(),
      loadPositions: jest.fn(),
      loadOrders: jest.fn(),
    });

    render(<TradingSummaryWidget />);

    // Check for error message
    expect(screen.getByText(/Failed to load trading data/i)).toBeInTheDocument();
  });

  it('should call load functions on mount', () => {
    // Create mock functions
    const loadRecentTradesMock = jest.fn();
    const loadPositionsMock = jest.fn();
    const loadOrdersMock = jest.fn();

    // Mock the hook
    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      recentTrades: [],
      positions: [],
      orders: [],
      loading: true,
      error: null,
      loadRecentTrades: loadRecentTradesMock,
      loadPositions: loadPositionsMock,
      loadOrders: loadOrdersMock,
    });

    render(<TradingSummaryWidget />);

    // Verify load functions were called
    expect(loadRecentTradesMock).toHaveBeenCalled();
    expect(loadPositionsMock).toHaveBeenCalled();
    expect(loadOrdersMock).toHaveBeenCalled();
  });
});
