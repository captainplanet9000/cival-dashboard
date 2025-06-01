import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FarmPerformanceChart } from './farm-performance-chart';

// Mock recharts components
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    AreaChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="area-chart">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    RadialBarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="radial-chart">{children}</div>
    ),
    Line: vi.fn().mockImplementation(props => <div data-testid="line" data-props={JSON.stringify(props)} />),
    Area: vi.fn().mockImplementation(props => <div data-testid="area" data-props={JSON.stringify(props)} />),
    Bar: vi.fn().mockImplementation(props => <div data-testid="bar" data-props={JSON.stringify(props)} />),
    Pie: vi.fn().mockImplementation(props => <div data-testid="pie" data-props={JSON.stringify(props)} />),
    RadialBar: vi.fn().mockImplementation(props => <div data-testid="radial-bar" data-props={JSON.stringify(props)} />),
    XAxis: vi.fn().mockImplementation(props => <div data-testid="x-axis" data-props={JSON.stringify(props)} />),
    YAxis: vi.fn().mockImplementation(props => <div data-testid="y-axis" data-props={JSON.stringify(props)} />),
    CartesianGrid: vi.fn().mockImplementation(props => (
      <div data-testid="cartesian-grid" data-props={JSON.stringify(props)} />
    )),
    Tooltip: vi.fn().mockImplementation(props => <div data-testid="tooltip" data-props={JSON.stringify(props)} />),
    Legend: vi.fn().mockImplementation(props => <div data-testid="legend" data-props={JSON.stringify(props)} />),
    Cell: vi.fn().mockImplementation(props => <div data-testid="cell" data-props={JSON.stringify(props)} />),
    ReferenceLine: vi.fn().mockImplementation(props => <div data-testid="reference-line" data-props={JSON.stringify(props)} />)
  };
});

// Sample data for testing
const samplePerformanceData = [
  { date: '2025-04-01', profit: 200, balance: 10000, transactions: 5, roi: 2.5 },
  { date: '2025-04-02', profit: 250, balance: 10250, transactions: 3, roi: 3.0 },
  { date: '2025-04-03', profit: -100, balance: 10150, transactions: 4, roi: 2.8 },
  { date: '2025-04-04', profit: 250, balance: 10400, transactions: 2, roi: 4.0 },
  { date: '2025-04-05', profit: 200, balance: 10600, transactions: 6, roi: 6.0 }
];

const samplePieData = [
  { name: 'BTC', value: 5000, color: '#F7931A' },
  { name: 'ETH', value: 3000, color: '#627EEA' },
  { name: 'USDT', value: 2600, color: '#26A17B' }
];

describe('FarmPerformanceChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the chart with data', () => {
    render(
      <FarmPerformanceChart 
        farmId={1}
        performanceData={samplePerformanceData}
      />
    );

    // Chart containers should be rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Chart components should be rendered
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('renders empty state when no data is provided', () => {
    render(
      <FarmPerformanceChart 
        farmId={1}
        performanceData={[]}
      />
    );

    // The component should use sample data when no data is provided
    expect(screen.getByText(/Performance Chart/i)).toBeInTheDocument();
  });

  it('renders with custom className when provided', () => {
    const { container } = render(
      <FarmPerformanceChart 
        farmId={1}
        performanceData={samplePerformanceData}
        className="custom-height"
      />
    );

    // Check that the className is applied
    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveClass('custom-height');
  });

  it('renders with pie data when provided', () => {
    render(
      <FarmPerformanceChart 
        farmId={1}
        performanceData={samplePerformanceData}
        pieData={samplePieData}
      />
    );

    // With pieData present, we should have a pie tab option
    expect(screen.getByText('Line')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
  });

  it('renders with time range controls when enabled', () => {
    const { container } = render(
      <FarmPerformanceChart 
        farmId={1}
        performanceData={samplePerformanceData}
        showControls={true}
      />
    );

    // Check that control elements exist
    expect(container.querySelector('button')).not.toBeNull();
    expect(container.textContent).toMatch(/Days/i);
  });

  it('shows performance metrics', () => {
    render(
      <FarmPerformanceChart 
        farmId={1}
        performanceData={samplePerformanceData}
      />
    );

    expect(screen.getByText(/Performance Chart/i)).toBeInTheDocument();
    expect(screen.getByText(/Visual representation of farm performance metrics/i)).toBeInTheDocument();
  });

  it('renders with chart type tabs', () => {
    const { container } = render(
      <FarmPerformanceChart 
        farmId={1}
        performanceData={samplePerformanceData}
      />
    );

    // By default, line chart should be shown
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Check that tab elements exist
    expect(container.textContent).toMatch(/Line/i);
    expect(container.textContent).toMatch(/Area/i);
    expect(container.textContent).toMatch(/Bar/i);
  });
});
