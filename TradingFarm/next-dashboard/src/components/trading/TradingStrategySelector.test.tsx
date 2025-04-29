import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/utils/test/test-utils';
import { TradingStrategySelector } from './TradingStrategySelector';
import { useStrategyManagement } from '@/hooks/use-strategy-management';

// Mock the strategy management hook
jest.mock('@/hooks/use-strategy-management', () => ({
  useStrategyManagement: jest.fn()
}));

describe('TradingStrategySelector', () => {
  // Sample strategies for testing
  const mockStrategies = [
    { id: 'strategy1', name: 'Momentum Strategy', description: 'A momentum-based trading strategy', isActive: true },
    { id: 'strategy2', name: 'Mean Reversion', description: 'A mean reversion trading strategy', isActive: false },
    { id: 'strategy3', name: 'Breakout Strategy', description: 'A breakout trading strategy', isActive: false }
  ];

  const mockActivateStrategy = jest.fn();
  const mockDeactivateStrategy = jest.fn();
  const mockUpdateStrategy = jest.fn();
  const mockCreateStrategy = jest.fn();
  const mockDeleteStrategy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup the mock implementation
    (useStrategyManagement as jest.Mock).mockReturnValue({
      strategies: mockStrategies,
      isLoading: false,
      error: null,
      activateStrategy: mockActivateStrategy,
      deactivateStrategy: mockDeactivateStrategy,
      updateStrategy: mockUpdateStrategy,
      createStrategy: mockCreateStrategy,
      deleteStrategy: mockDeleteStrategy
    });
  });

  test('renders strategy list correctly', () => {
    render(<TradingStrategySelector />);
    
    // Check that component title is rendered
    expect(screen.getByText('Trading Strategies')).toBeInTheDocument();
    
    // Check that all strategies are rendered
    expect(screen.getByText('Momentum Strategy')).toBeInTheDocument();
    expect(screen.getByText('Mean Reversion')).toBeInTheDocument();
    expect(screen.getByText('Breakout Strategy')).toBeInTheDocument();
    
    // Check that the active strategy is highlighted
    const activeStrategy = screen.getByText('Momentum Strategy').closest('[data-testid="strategy-item"]');
    expect(activeStrategy).toHaveClass('bg-primary/10');
  });

  test('displays loading state', () => {
    (useStrategyManagement as jest.Mock).mockReturnValue({
      strategies: [],
      isLoading: true,
      error: null
    });
    
    render(<TradingStrategySelector />);
    
    // Check for loading indicator
    expect(screen.getByTestId('strategy-loading')).toBeInTheDocument();
  });

  test('displays error state', () => {
    (useStrategyManagement as jest.Mock).mockReturnValue({
      strategies: [],
      isLoading: false,
      error: 'Failed to load strategies'
    });
    
    render(<TradingStrategySelector />);
    
    // Check for error message
    expect(screen.getByText('Failed to load strategies')).toBeInTheDocument();
  });

  test('activates a strategy when clicked', async () => {
    render(<TradingStrategySelector />);
    
    // Click on an inactive strategy
    fireEvent.click(screen.getByText('Mean Reversion'));
    
    // Check that activate function was called with correct ID
    expect(mockActivateStrategy).toHaveBeenCalledWith('strategy2');
  });

  test('deactivates active strategy when clicked', async () => {
    render(<TradingStrategySelector />);
    
    // Click on the active strategy
    fireEvent.click(screen.getByText('Momentum Strategy'));
    
    // Check that deactivate function was called with correct ID
    expect(mockDeactivateStrategy).toHaveBeenCalledWith('strategy1');
  });

  test('opens create strategy dialog when add button is clicked', async () => {
    render(<TradingStrategySelector />);
    
    // Click the add strategy button
    fireEvent.click(screen.getByTestId('add-strategy-button'));
    
    // Check that create strategy dialog appears
    await waitFor(() => {
      expect(screen.getByTestId('create-strategy-dialog')).toBeInTheDocument();
    });
  });

  test('creates a new strategy', async () => {
    render(<TradingStrategySelector />);
    
    // Click the add strategy button
    fireEvent.click(screen.getByTestId('add-strategy-button'));
    
    // Fill out the form
    fireEvent.change(screen.getByTestId('strategy-name-input'), { 
      target: { value: 'New Test Strategy' } 
    });
    
    fireEvent.change(screen.getByTestId('strategy-description-input'), { 
      target: { value: 'A strategy created in tests' } 
    });
    
    // Select strategy type
    fireEvent.change(screen.getByTestId('strategy-type-select'), {
      target: { value: 'momentum' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByTestId('create-strategy-submit'));
    
    // Check that create function was called with correct data
    await waitFor(() => {
      expect(mockCreateStrategy).toHaveBeenCalledWith({
        name: 'New Test Strategy',
        description: 'A strategy created in tests',
        type: 'momentum',
        parameters: expect.any(Object)
      });
    });
  });

  test('opens edit strategy dialog when edit button is clicked', async () => {
    render(<TradingStrategySelector />);
    
    // Click the edit button on the first strategy
    fireEvent.click(screen.getAllByTestId('edit-strategy-button')[0]);
    
    // Check that edit strategy dialog appears
    await waitFor(() => {
      expect(screen.getByTestId('edit-strategy-dialog')).toBeInTheDocument();
    });
    
    // Check that the form is prefilled with strategy data
    expect(screen.getByTestId('strategy-name-input')).toHaveValue('Momentum Strategy');
    expect(screen.getByTestId('strategy-description-input')).toHaveValue('A momentum-based trading strategy');
  });

  test('updates an existing strategy', async () => {
    render(<TradingStrategySelector />);
    
    // Click the edit button on the first strategy
    fireEvent.click(screen.getAllByTestId('edit-strategy-button')[0]);
    
    // Update the form
    fireEvent.change(screen.getByTestId('strategy-name-input'), { 
      target: { value: 'Updated Strategy Name' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByTestId('update-strategy-submit'));
    
    // Check that update function was called with correct data
    await waitFor(() => {
      expect(mockUpdateStrategy).toHaveBeenCalledWith('strategy1', {
        name: 'Updated Strategy Name',
        description: 'A momentum-based trading strategy'
      });
    });
  });

  test('confirms before deleting a strategy', async () => {
    render(<TradingStrategySelector />);
    
    // Click the delete button on the first strategy
    fireEvent.click(screen.getAllByTestId('delete-strategy-button')[0]);
    
    // Check that confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument();
    });
    
    // Confirm deletion
    fireEvent.click(screen.getByTestId('confirm-delete-button'));
    
    // Check that delete function was called with correct ID
    await waitFor(() => {
      expect(mockDeleteStrategy).toHaveBeenCalledWith('strategy1');
    });
  });

  test('cancels strategy deletion', async () => {
    render(<TradingStrategySelector />);
    
    // Click the delete button on the first strategy
    fireEvent.click(screen.getAllByTestId('delete-strategy-button')[0]);
    
    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument();
    });
    
    // Cancel deletion
    fireEvent.click(screen.getByTestId('cancel-delete-button'));
    
    // Check that delete function was not called
    expect(mockDeleteStrategy).not.toHaveBeenCalled();
    
    // Check that dialog is closed
    await waitFor(() => {
      expect(screen.queryByTestId('delete-confirmation-dialog')).not.toBeInTheDocument();
    });
  });
});
