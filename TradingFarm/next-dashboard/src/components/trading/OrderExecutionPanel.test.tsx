import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderExecutionPanel } from './OrderExecutionPanel';
import { useMarketData } from '@/hooks/use-market-data';
import { useOrderManagement } from '@/hooks/use-order-management';
import { useRiskProfiles } from '@/hooks/use-risk-profiles';

// Mock the hooks
jest.mock('@/hooks/use-market-data', () => ({
  useMarketData: jest.fn()
}));

jest.mock('@/hooks/use-order-management', () => ({
  useOrderManagement: jest.fn()
}));

jest.mock('@/hooks/use-risk-profiles', () => ({
  useRiskProfiles: jest.fn()
}));

// Mock the toast component
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('OrderExecutionPanel', () => {
  // Default props
  const defaultProps = {
    symbol: 'BTC/USD',
    exchange: 'binance',
    exchangeCredentialId: 123
  };

  // Common mock setup
  beforeEach(() => {
    // Mock market data
    (useMarketData as jest.Mock).mockReturnValue({
      ticker: { lastPrice: 50000 },
      orderBook: {
        bids: [[49900, 2], [49800, 3]],
        asks: [[50100, 1], [50200, 2]]
      }
    });

    // Mock order management
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder: jest.fn().mockResolvedValue({ id: 'order123' }),
      validateOrder: jest.fn().mockReturnValue({
        isValid: true,
        errors: []
      }),
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });

    // Mock risk profiles
    (useRiskProfiles as jest.Mock).mockReturnValue({
      activeRiskProfile: {
        maxPositionSize: 10000,
        maxDrawdown: 5,
        dailyLossLimit: 500,
        maxLeverage: 3
      }
    });
  });

  it('renders correctly with default props', () => {
    render(<OrderExecutionPanel {...defaultProps} />);
    
    // Check if essential elements are rendered
    expect(screen.getByText(/Buy BTC/i)).toBeInTheDocument();
    expect(screen.getByText(/Sell BTC/i)).toBeInTheDocument();
    expect(screen.getByText(/Amount/i)).toBeInTheDocument();
    expect(screen.getByText(/Price/i)).toBeInTheDocument();
  });

  it('updates price from ticker data', () => {
    render(<OrderExecutionPanel {...defaultProps} />);
    
    // Price input should be populated with the ticker price
    const priceInput = screen.getByLabelText(/Price/i) as HTMLInputElement;
    expect(priceInput.value).toBe('50000');
  });

  it('handles order type change', () => {
    render(<OrderExecutionPanel {...defaultProps} />);
    
    // Click on Market order tab
    fireEvent.click(screen.getByRole('tab', { name: /Market/i }));
    
    // Price input should not be required for market orders
    expect(screen.queryByLabelText(/Price/i)).not.toBeInTheDocument();
    
    // Click on Stop Limit order tab
    fireEvent.click(screen.getByRole('tab', { name: /Stop Limit/i }));
    
    // Should show trigger price input for stop orders
    expect(screen.getByLabelText(/Trigger Price/i)).toBeInTheDocument();
  });

  it('validates order before submission', async () => {
    const validateOrder = jest.fn().mockReturnValue({
      isValid: false,
      errors: ['Quantity must be greater than 0']
    });
    
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder: jest.fn(),
      validateOrder,
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });
    
    render(<OrderExecutionPanel {...defaultProps} />);
    
    // Try to submit with empty quantity
    fireEvent.click(screen.getByRole('button', { name: /Buy BTC$/i }));
    
    // Validate should have been called
    expect(validateOrder).toHaveBeenCalled();
  });

  it('submits order with correct parameters', async () => {
    const createOrder = jest.fn().mockResolvedValue({ id: 'order123' });
    
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder,
      validateOrder: jest.fn().mockReturnValue({
        isValid: true,
        errors: []
      }),
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });
    
    render(<OrderExecutionPanel {...defaultProps} />);
    
    // Fill out order form
    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Buy BTC$/i }));
    
    // Verify order parameters
    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 1,
        price: 50000,
        exchangeCredentialId: 123
      }));
    });
  });

  it('handles advanced order types', async () => {
    const createOrder = jest.fn().mockResolvedValue({ id: 'order123' });
    
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder,
      validateOrder: jest.fn().mockReturnValue({
        isValid: true,
        errors: []
      }),
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });
    
    render(<OrderExecutionPanel {...defaultProps} />);
    
    // Enable advanced order
    fireEvent.click(screen.getByRole('switch', { name: /Advanced Order/i }));
    
    // Select TWAP order type
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /TWAP/i }));
    
    // Fill out order form
    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Number of Slices/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Interval/i), { target: { value: '15' } });
    
    // Submit order
    fireEvent.click(screen.getByRole('button', { name: /Buy BTC$/i }));
    
    // Verify advanced order parameters
    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({
          advancedParams: expect.objectContaining({
            type: 'twap',
            sliceCount: 4,
            intervalMs: 900000
          })
        })
      }));
    });
  });

  it('applies risk management controls', () => {
    const validateOrder = jest.fn().mockReturnValue({
      isValid: true,
      errors: []
    });
    
    (useOrderManagement as jest.Mock).mockReturnValue({
      createOrder: jest.fn(),
      validateOrder,
      isCreatingOrder: false,
      orderErrors: [],
      clearOrderErrors: jest.fn()
    });
    
    render(<OrderExecutionPanel {...defaultProps} />);
    
    // Set quantity to a large amount that would exceed risk limits
    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '10' } });
    
    // Set max loss to a low value
    const maxLossSlider = screen.getByRole('slider', { name: /Max Loss/i });
    fireEvent.change(maxLossSlider, { target: { value: '0.1' } });
    
    // Try to submit order
    fireEvent.click(screen.getByRole('button', { name: /Buy BTC$/i }));
    
    // Order should not be submitted due to risk limits
    expect(validateOrder).not.toHaveBeenCalled();
  });
});
