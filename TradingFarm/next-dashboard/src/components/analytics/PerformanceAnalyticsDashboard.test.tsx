import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformanceAnalyticsDashboard } from './PerformanceAnalyticsDashboard';
import { usePerformanceData } from '@/hooks/use-performance-data';

// Mock the hooks
jest.mock('@/hooks/use-performance-data', () => ({
  usePerformanceData: jest.fn()
}));

describe('PerformanceAnalyticsDashboard', () => {
  // Default props
  const defaultProps = {
    userId: 123,
    timeRange: 'month' as const
  };

  // Mock performance data
  const mockPerformanceData = {
    equityCurveData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2023, 0, i + 1).toISOString(),
      equity: 10000 + (i * 100) + (Math.random() * 200 - 100)
    })),
    performanceMetrics: {
      totalReturn: 12.5,
      sharpeRatio: 1.8,
      maxDrawdown: 5.2,
      winRate: 0.65,
      totalTrades: 125,
      winningTrades: 81,
      losingTrades: 44,
      avgHoldingTime: '2.5 days',
      profitFactor: 2.1,
      monthlyReturns: [
        { month: 'Jan', return: 3.2 },
        { month: 'Feb', return: -1.5 },
        { month: 'Mar', return: 4.8 },
        { month: 'Apr', return: 5.6 }
      ]
    },
    drawdownData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2023, 0, i + 1).toISOString(),
      drawdown: (Math.random() * 5).toFixed(2)
    })),
    tradeDistribution: [
      { name: 'Bitcoin', value: 5000 },
      { name: 'Ethereum', value: 3000 },
      { name: 'Solana', value: 1500 },
      { name: 'Other', value: 1000 }
    ],
    strategyPerformance: [
      {
        id: 'strat1',
        name: 'Moving Average Crossover',
        totalReturn: 15.3,
        sharpeRatio: 1.9,
        maxDrawdown: 4.2,
        winRate: 0.68
      },
      {
        id: 'strat2',
        name: 'RSI Momentum',
        totalReturn: 12.1,
        sharpeRatio: 1.6,
        maxDrawdown: 6.1,
        winRate: 0.62
      },
      {
        id: 'strat3',
        name: 'Mean Reversion',
        totalReturn: 8.5,
        sharpeRatio: 1.2,
        maxDrawdown: 3.8,
        winRate: 0.55
      }
    ],
    isLoading: false,
    error: null
  };

  // Common mock setup
  beforeEach(() => {
    // Mock performance data hook
    (usePerformanceData as jest.Mock).mockReturnValue(mockPerformanceData);
  });

  it('renders correctly with performance data', () => {
    render(<PerformanceAnalyticsDashboard {...defaultProps} />);
    
    // Check if title is rendered
    expect(screen.getByText('Performance Analytics')).toBeInTheDocument();
    
    // Check if metrics summary cards are rendered
    expect(screen.getByText('Total Return')).toBeInTheDocument();
    expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    
    // Check if actual values are displayed
    expect(screen.getByText('12.50%')).toBeInTheDocument();
    expect(screen.getByText('1.80')).toBeInTheDocument();
    expect(screen.getByText('5.20%')).toBeInTheDocument();
    expect(screen.getByText('65.00%')).toBeInTheDocument();
  });

  it('renders tabs correctly', () => {
    render(<PerformanceAnalyticsDashboard {...defaultProps} />);
    
    // Check if tabs are rendered
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trades' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Drawdown' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Strategies' })).toBeInTheDocument();
  });

  it('handles tab switching', () => {
    render(<PerformanceAnalyticsDashboard {...defaultProps} />);
    
    // Default tab should be Overview
    expect(screen.getByText('Equity Curve')).toBeInTheDocument();
    
    // Switch to Trades tab
    fireEvent.click(screen.getByRole('tab', { name: 'Trades' }));
    expect(screen.getByText('Trade Performance')).toBeInTheDocument();
    
    // Switch to Drawdown tab
    fireEvent.click(screen.getByRole('tab', { name: 'Drawdown' }));
    expect(screen.getByText('Drawdown Analysis')).toBeInTheDocument();
    
    // Switch to Strategies tab
    fireEvent.click(screen.getByRole('tab', { name: 'Strategies' }));
    expect(screen.getByText('Strategy Comparison')).toBeInTheDocument();
  });

  it('handles timeframe selection', () => {
    const mockUsePerformanceData = usePerformanceData as jest.Mock;
    
    render(<PerformanceAnalyticsDashboard {...defaultProps} />);
    
    // Default timeframe should be 'month'
    expect(mockUsePerformanceData).toHaveBeenCalledWith(123, 'month');
    
    // Change timeframe to 'week'
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'This Week' }));
    
    // Hook should be called with new timeframe
    expect(mockUsePerformanceData).toHaveBeenCalledWith(123, 'week');
  });

  it('renders loading state correctly', () => {
    (usePerformanceData as jest.Mock).mockReturnValue({
      ...mockPerformanceData,
      isLoading: true,
      equityCurveData: [],
      performanceMetrics: null
    });
    
    render(<PerformanceAnalyticsDashboard {...defaultProps} />);
    
    // Loading indicator should be visible
    expect(screen.getByText('Loading equity data...')).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    (usePerformanceData as jest.Mock).mockReturnValue({
      ...mockPerformanceData,
      isLoading: false,
      equityCurveData: [],
      performanceMetrics: null
    });
    
    render(<PerformanceAnalyticsDashboard {...defaultProps} />);
    
    // Empty state indicator should be visible
    expect(screen.getByText('No equity data available')).toBeInTheDocument();
  });

  it('formats numbers correctly', () => {
    render(<PerformanceAnalyticsDashboard {...defaultProps} />);
    
    // Check if numbers are formatted as expected
    expect(screen.getByText('12.50%')).toBeInTheDocument(); // Total Return
    expect(screen.getByText('1.80')).toBeInTheDocument(); // Sharpe Ratio
    expect(screen.getByText('125')).toBeInTheDocument(); // Total Trades
    expect(screen.getByText('2.10')).toBeInTheDocument(); // Profit Factor
  });
});
