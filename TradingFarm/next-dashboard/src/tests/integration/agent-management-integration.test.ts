/**
 * Agent Management Integration Tests
 * Tests the integration between the agent management service and UI components
 */

import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { useAgentManagement } from '@/hooks/use-agent-management';
import { agentManagementService } from '@/services/agent-management-service';
import { AgentManagementWidget } from '@/components/widgets/agent-management-widget';
import { TradingAgent, TradingStrategy, AgentConfig, AgentPerformanceMetrics } from '@/types/agent-types';

// Mock the hooks directly to avoid having to use renderHook
jest.mock('@/hooks/use-agent-management', () => ({
  useAgentManagement: jest.fn()
}));

// Mock the agent management service
jest.mock('@/services/agent-management-service', () => ({
  agentManagementService: {
    getAgents: jest.fn(),
    getAgentById: jest.fn(),
    createAgent: jest.fn(),
    updateAgent: jest.fn(),
    deleteAgent: jest.fn(),
    startAgent: jest.fn(),
    stopAgent: jest.fn(),
    getAgentLogs: jest.fn(),
    getAgentPerformance: jest.fn(),
    getStrategies: jest.fn(),
    getStrategyById: jest.fn(),
  }
}));

// Mock toast component
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
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

describe('Agent Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock data for tests conforming to the correct types
  const mockAgentConfig: AgentConfig = {
    agent_id: 'agent-1',
    parameters: { period: 20, threshold: 0.01 },
    risk_controls: {
      max_position_size: 0.1,
      stop_loss: true,
      stop_loss_pct: 2,
      take_profit_pct: 5
    },
    active: true
  };

  const mockPerformance: AgentPerformanceMetrics = {
    total_trades: 42,
    winning_trades: 28,
    losing_trades: 14,
    profit_loss: 3240.50,
    win_rate: 0.68,
    average_win: 157.25,
    average_loss: 78.35,
    largest_win: 450.20,
    largest_loss: 210.15,
    max_drawdown: 0.15,
    sharpe_ratio: 1.2
  };

  const mockAgents: TradingAgent[] = [
    {
      id: 'agent-1',
      name: 'Bitcoin Trend Agent',
      description: 'A trend-following agent for Bitcoin',
      type: 'trading',
      status: 'running',
      created_at: '2023-03-10T08:00:00Z',
      updated_at: '2023-04-15T10:30:00Z',
      strategyId: 'strategy-1',
      exchangeId: 'exchange-1',
      marketSymbol: 'BTC/USDT',
      config: mockAgentConfig,
      performance: mockPerformance
    },
    {
      id: 'agent-2',
      name: 'Ethereum Scalper',
      description: 'Short-term scalping agent for Ethereum',
      type: 'trading',
      status: 'stopped',
      created_at: '2023-03-15T09:30:00Z',
      updated_at: '2023-04-14T16:45:00Z',
      strategyId: 'strategy-2',
      exchangeId: 'exchange-1',
      marketSymbol: 'ETH/USDT',
      config: {
        ...mockAgentConfig,
        agent_id: 'agent-2',
        risk_controls: {
          ...mockAgentConfig.risk_controls,
          max_position_size: 0.2,
          stop_loss_pct: 1
        }
      },
      performance: {
        ...mockPerformance,
        total_trades: 156,
        win_rate: 0.55,
        profit_loss: 1520.75,
        sharpe_ratio: 0.9,
        max_drawdown: 0.22
      }
    }
  ];

  const mockStrategies: TradingStrategy[] = [
    {
      id: 'strategy-1',
      name: 'Trend Following',
      description: 'Follows medium to long term market trends',
      category: 'technical',
      config: {
        timeframe: '1d',
        parameters: [
          { name: 'period', type: 'number', default: 20, min: 5, max: 200 },
          { name: 'threshold', type: 'number', default: 0.01, min: 0.001, max: 0.1 }
        ]
      },
      supportedTimeframes: ['1h', '4h', '1d'],
      supportedMarkets: ['crypto'],
      performance: {
        backtestReturn: 0.35,
        sharpeRatio: 1.5,
        maxDrawdown: 0.25,
        winRate: 0.6
      },
      createdAt: '2023-01-05T00:00:00Z',
      updatedAt: '2023-04-01T00:00:00Z'
    },
    {
      id: 'strategy-2',
      name: 'Scalping',
      description: 'Short-term trading capturing small price movements',
      category: 'technical',
      config: {
        timeframe: '5m',
        parameters: [
          { name: 'volumeThreshold', type: 'number', default: 1.5, min: 0.5, max: 5 },
          { name: 'priceDeviationPct', type: 'number', default: 0.005, min: 0.001, max: 0.02 }
        ]
      },
      supportedTimeframes: ['1m', '5m', '15m'],
      supportedMarkets: ['crypto', 'forex'],
      performance: {
        backtestReturn: 0.28,
        sharpeRatio: 1.2,
        maxDrawdown: 0.15,
        winRate: 0.52
      },
      createdAt: '2023-01-10T00:00:00Z',
      updatedAt: '2023-03-15T00:00:00Z'
    }
  ];

  describe('Integration with components', () => {
    it('should render agent management widget with data from the hook', async () => {
      // Mock the hook implementation for this test
      (useAgentManagement as jest.Mock).mockReturnValue({
        agents: mockAgents,
        strategies: mockStrategies,
        loading: false,
        error: null,
        isAgentSystemEnabled: true,
        loadAgents: jest.fn(),
        loadStrategies: jest.fn(),
        createAgent: jest.fn(),
        updateAgent: jest.fn(),
        deleteAgent: jest.fn(),
        startAgent: jest.fn(),
        stopAgent: jest.fn(),
      });
      
      // Mock service responses for the initial load
      (agentManagementService.getAgents as jest.Mock).mockResolvedValue({
        data: mockAgents,
        count: 2,
        total: 2
      });
      
      (agentManagementService.getStrategies as jest.Mock).mockResolvedValue({
        data: mockStrategies,
        count: 2,
        total: 2
      });
      
      render(<AgentManagementWidget />);
      
      // Verify agents are rendered
      await waitFor(() => {
        expect(screen.getByText('Bitcoin Trend Agent')).toBeInTheDocument();
        expect(screen.getByText('Ethereum Scalper')).toBeInTheDocument();
      });
      
      // Verify status badges
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('stopped')).toBeInTheDocument();
    });
    
    it('should display loading state when data is being fetched', async () => {
      // Mock the hook implementation for loading state
      (useAgentManagement as jest.Mock).mockReturnValue({
        agents: [],
        strategies: [],
        loading: true,
        error: null,
        isAgentSystemEnabled: true,
        loadAgents: jest.fn(),
        loadStrategies: jest.fn(),
      });
      
      render(<AgentManagementWidget />);
      
      // Verify loading indicator is shown
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
    
    it('should display error state when there is an error', async () => {
      // Mock the hook implementation for error state
      (useAgentManagement as jest.Mock).mockReturnValue({
        agents: [],
        strategies: [],
        loading: false,
        error: 'Failed to load agent data',
        isAgentSystemEnabled: true,
        loadAgents: jest.fn(),
        loadStrategies: jest.fn(),
      });
      
      render(<AgentManagementWidget />);
      
      // Verify error message is shown
      expect(screen.getByText(/Failed to load agent data/i)).toBeInTheDocument();
    });
  });
});
