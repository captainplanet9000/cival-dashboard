import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalProgressChart } from './goal-progress-chart';

// Mock date-fns since we use it in the component
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '5 days remaining'),
  format: vi.fn(() => '2025-04-10'),
  parseISO: vi.fn(str => new Date(str)),
  isAfter: vi.fn(() => false),
  differenceInCalendarDays: vi.fn(() => 5)
}));

// Mock recharts components - we're just testing the outer component structure, not the charts themselves
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="pie-chart">{children}</div>,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="radial-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="bar-chart">{children}</div>,
  Pie: () => <div data-testid="pie">Pie</div>,
  RadialBar: () => <div data-testid="radial-bar">RadialBar</div>,
  Bar: () => <div data-testid="bar">Bar</div>,
  Cell: () => <div data-testid="cell">Cell</div>,
  XAxis: () => <div data-testid="x-axis">XAxis</div>,
  YAxis: () => <div data-testid="y-axis">YAxis</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid">CartesianGrid</div>,
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
  Legend: () => <div data-testid="legend">Legend</div>,
  Text: ({ children }: { children: React.ReactNode }) => <div data-testid="text">{children}</div>,
  Label: () => <div data-testid="label">Label</div>,
  ReferenceLine: () => <div data-testid="reference-line">ReferenceLine</div>
}));

// Date-fns is already mocked above

// Sample goal data for testing
const sampleGoal = {
  id: 'goal-1',
  name: 'Test Goal',
  target_amount: 10000,
  current_amount: 6000,
  status: 'ACTIVE',
  target_date: '2025-04-15',
  created_at: '2025-01-01'
};

const completedGoal = {
  ...sampleGoal,
  id: 'goal-2',
  status: 'COMPLETED',
  current_amount: 10000
};

const overdueGoal = {
  ...sampleGoal,
  id: 'goal-3',
  target_date: '2025-04-01' // Set to before current date
};

describe('GoalProgressChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the chart with goal data', () => {
    render(<GoalProgressChart goal={sampleGoal} />);

    // Card title should be the goal name
    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    
    // Status badge should be displayed
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    
    // Target amount should be formatted and displayed
    expect(screen.getByText(/Target: \$10,000/)).toBeInTheDocument();
    
    // Progress percentage should be 60%
    // For the radial chart, text should be displayed inside
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders the chart with target date if showTargetDate is true', () => {
    render(<GoalProgressChart goal={sampleGoal} showTargetDate={true} />);
    
    // Target date should be displayed
    expect(screen.getByText((content, node) => node?.textContent?.includes('Due: 5 days remaining'))).toBeInTheDocument();
  });

  it('renders overdue status for past target dates', async () => {
    // Import specific functions from date-fns to mock them individually
    const dateFns = await import('date-fns');
    
    // Reset the mocks for this specific test
    vi.mocked(dateFns.differenceInCalendarDays).mockReturnValueOnce(-5);
    vi.mocked(dateFns.formatDistanceToNow).mockReturnValueOnce('5 days ago');
    
    render(<GoalProgressChart goal={overdueGoal} showTargetDate={true} />);
    
    // Overdue text should be displayed somewhere in the component
    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it('switches between chart views using tabs', async () => {
    const user = userEvent.setup();
    render(<GoalProgressChart goal={sampleGoal} />);
    
    // Default tab should be 'radial'
    expect(screen.getByTestId('radial-chart')).toBeInTheDocument();
    
    // Click on the 'pie' tab
    await user.click(screen.getByRole('tab', { name: 'Distribution' }));
    
    // Pie chart should now be displayed
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    
    // Click on the 'bar' tab
    await user.click(screen.getByRole('tab', { name: 'Comparison' }));
    
    // Bar chart should now be displayed
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders chart elements with appropriate structure', () => {
    // Render the component
    render(<GoalProgressChart goal={sampleGoal} />);
    
    // Check that we have chart elements present
    expect(screen.getByTestId('radial-chart')).toBeInTheDocument();
    expect(screen.getByTestId('radial-bar')).toBeInTheDocument();
    
    // Verify we have at least one tab button
    const tabButtons = screen.getAllByRole('tab');
    expect(tabButtons.length).toBeGreaterThan(0);
  });

  it('displays appropriate styling for completed goals', () => {
    render(<GoalProgressChart goal={completedGoal} />);
    
    // Status badge should show completed
    const badge = screen.getByText('COMPLETED');
    expect(badge).toHaveClass('bg-green-500');
    
    // Progress should be 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles custom className props correctly', () => {
    const { container } = render(
      <GoalProgressChart goal={sampleGoal} className="custom-class" />
    );
    
    // The root element should have the custom class
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays monetary values in proper currency format', () => {
    render(<GoalProgressChart goal={sampleGoal} />);
    
    // Current and target amounts should be formatted as currency
    expect(screen.getByText(/\$6,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$10,000/)).toBeInTheDocument();
  });
});
