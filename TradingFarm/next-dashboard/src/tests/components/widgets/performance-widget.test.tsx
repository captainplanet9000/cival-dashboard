/**
 * Performance Widget Component Tests
 */

import { render, screen } from '@testing-library/react';
import { PerformanceWidget } from '@/components/widgets/performance-widget';
import { useAgentManagement } from '@/hooks/use-agent-management';
import { useLiveTrading } from '@/hooks/use-live-trading';

// Mock the hooks
jest.mock('@/hooks/use-agent-management', () => ({
  useAgentManagement: jest.fn()
}));

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
    AreaChart: () => <></>,
    Area: () => <></>,
  };
});

describe('PerformanceWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a loading state when data is being fetched', () => {
    // Mock the hooks to return loading state
    (useAgentManagement as jest.Mock).mockReturnValue({
      agents: [],
      strategies: [],
      loading: true,
      error: null,
      loadAgents: jest.fn(),
      loadStrategies: jest.fn(),
    });

    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      accountSummary: null,
      loading: true,
      error: null,
      loadAccountSummary: jest.fn(),
    });

    render(<PerformanceWidget />);

    // Check for loading indicator
    expect(screen.getByText(/Loading performance data/i)).toBeInTheDocument();
  });

  it('should render a message when both agent system and live trading are disabled', () => {
    // Mock the hooks to return disabled state
    (useAgentManagement as jest.Mock).mockReturnValue({
      agents: [],
      strategies: [],
      loading: false,
      error: null,
      isAgentSystemEnabled: false,
      loadAgents: jest.fn(),
      loadStrategies: jest.fn(),
    });

    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: false,
      accountSummary: null,
      loading: false,
      error: null,
      loadAccountSummary: jest.fn(),
    });

    render(<PerformanceWidget />);

    // Check for disabled message
    expect(screen.getByText(/Performance tracking is currently disabled/i)).toBeInTheDocument();
  });

  it('should render performance data when agent data is available', () => {
    // Mock agent data
    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Bitcoin Trend Agent',
        description: 'A trend-following agent for Bitcoin',
        status: 'running',
        strategyId: 'strategy-1',
        exchangeId: 'exchange-1',
        marketSymbol: 'BTC/USDT',
        config: {
          riskLevel: 'medium',
          maxPositionSize: 0.1,
          useStopLoss: true,
          stopLossPercentage: 2,
          takeProfitPercentage: 5
        },
        performance: {
          totalTrades: 42,
          winRate: 0.68,
          profitFactor: 1.75,
          expectancy: 0.045,
          netProfit: 3240.50,
          sharpeRatio: 1.2,
          maxDrawdown: 0.15,
          lastUpdated: '2023-04-15T10:30:00Z'
        },
        createdAt: '2023-03-10T08:00:00Z',
        updatedAt: '2023-04-15T10:30:00Z'
      }
    ];

    // Mock the hooks to return data
    (useAgentManagement as jest.Mock).mockReturnValue({
      agents: mockAgents,
      strategies: [],
      loading: false,
      error: null,
      isAgentSystemEnabled: true,
      loadAgents: jest.fn(),
      loadStrategies: jest.fn(),
    });

    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      accountSummary: {
        totalEquity: 12500,
        availableBalance: 8000,
        unrealizedPnL: 1250,
        dailyPnL: 350,
        weeklyPnL: 1200,
        monthlyPnL: 3500,
        allTimePnL: 5000,
        currency: 'USDT',
        updatedAt: Date.now()
      },
      loading: false,
      error: null,
      loadAccountSummary: jest.fn(),
    });

    render(<PerformanceWidget />);

    // Check for performance metrics
    expect(screen.getByText(/Performance/i)).toBeInTheDocument();
    expect(screen.getByText(/Bitcoin Trend Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/68%/i)).toBeInTheDocument(); // Win rate
    expect(screen.getByText(/1.75/i)).toBeInTheDocument(); // Profit factor
    expect(screen.getByText(/3,240.50/i)).toBeInTheDocument(); // Net profit
  });

  it('should render error state when there is an error', () => {
    // Mock the hooks to return error state
    (useAgentManagement as jest.Mock).mockReturnValue({
      agents: [],
      strategies: [],
      loading: false,
      error: 'Failed to load agent data',
      isAgentSystemEnabled: true,
      loadAgents: jest.fn(),
      loadStrategies: jest.fn(),
    });

    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      accountSummary: null,
      loading: false,
      error: null,
      loadAccountSummary: jest.fn(),
    });

    render(<PerformanceWidget />);

    // Check for error message
    expect(screen.getByText(/Failed to load agent data/i)).toBeInTheDocument();
  });

  it('should call load functions on mount', () => {
    // Create mock functions
    const loadAgentsMock = jest.fn();
    const loadAccountSummaryMock = jest.fn();

    // Mock the hooks
    (useAgentManagement as jest.Mock).mockReturnValue({
      agents: [],
      strategies: [],
      loading: true,
      error: null,
      isAgentSystemEnabled: true,
      loadAgents: loadAgentsMock,
      loadStrategies: jest.fn(),
    });

    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      accountSummary: null,
      loading: true,
      error: null,
      loadAccountSummary: loadAccountSummaryMock,
    });

    render(<PerformanceWidget />);

    // Verify load functions were called
    expect(loadAgentsMock).toHaveBeenCalled();
    expect(loadAccountSummaryMock).toHaveBeenCalled();
  });

  it('should show account summary data when available', () => {
    // Mock the hooks
    (useAgentManagement as jest.Mock).mockReturnValue({
      agents: [],
      strategies: [],
      loading: false,
      error: null,
      isAgentSystemEnabled: true,
      loadAgents: jest.fn(),
      loadStrategies: jest.fn(),
    });

    (useLiveTrading as jest.Mock).mockReturnValue({
      isLiveTradingEnabled: true,
      accountSummary: {
        totalEquity: 12500,
        availableBalance: 8000,
        unrealizedPnL: 1250,
        dailyPnL: 350,
        weeklyPnL: 1200,
        monthlyPnL: 3500,
        allTimePnL: 5000,
        currency: 'USDT',
        updatedAt: Date.now()
      },
      loading: false,
      error: null,
      loadAccountSummary: jest.fn(),
    });

    render(<PerformanceWidget />);

    // Check for account summary data
    expect(screen.getByText(/12,500 USDT/i)).toBeInTheDocument(); // Total equity
    expect(screen.getByText(/350 USDT/i)).toBeInTheDocument(); // Daily P&L
    expect(screen.getByText(/1,200 USDT/i)).toBeInTheDocument(); // Weekly P&L
  });
});
