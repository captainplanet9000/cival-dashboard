import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalProvider, useModal } from '@/components/ui/modal-controller';

// Mock the hooks and components
jest.mock('@/hooks/usePositionData', () => ({
  usePositionData: () => ({
    positions: [
      {
        id: '1',
        symbol: 'BTC/USDT',
        side: 'long',
        size: 0.1,
        leverage: 10,
        entry_price: 50000,
        current_price: 55000,
        pnl: 500,
        pnl_percentage: 10,
        stop_loss: 45000,
        take_profit: 60000,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    loading: false,
    error: null,
    isConnected: true,
    updateStopLoss: jest.fn().mockResolvedValue(true),
    updateTakeProfit: jest.fn().mockResolvedValue(true),
    closePosition: jest.fn().mockResolvedValue(true),
  })
}));

jest.mock('@/hooks/useNotificationsData', () => ({
  useNotificationsData: () => ({
    notifications: [
      {
        id: '1',
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        is_read: false,
        is_important: true,
        created_at: new Date().toISOString(),
      }
    ],
    loading: false,
    error: null,
    isConnected: true,
    markAsRead: jest.fn().mockResolvedValue(true),
    deleteNotification: jest.fn().mockResolvedValue(true),
  })
}));

jest.mock('@/hooks/useAccountSettings', () => ({
  useAccountSettings: () => ({
    profile: {
      id: '1',
      user_id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      timezone: 'America/New_York',
      theme: 'dark',
      default_exchange: 'binance',
      default_leverage: 5,
      notifications_settings: {
        email: true,
        push: true,
        trading_alerts: true,
        market_updates: false,
        security_alerts: true,
        newsletter_updates: false
      },
      trading_preferences: {
        confirm_trades: true,
        show_pnl_in_header: true,
        compact_view: false
      },
      security_settings: {
        two_factor_enabled: false,
        session_timeout: 30
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    loading: false,
    saving: false,
    error: null,
    isConnected: true,
    updateProfile: jest.fn().mockResolvedValue(true),
    updatePassword: jest.fn().mockResolvedValue(true),
    enableTwoFactor: jest.fn().mockResolvedValue(true),
  }),
  UserProfile: jest.fn(),
}));

// Create a test component that uses the modal controller
const TestComponent = () => {
  const { openModal } = useModal();
  
  return (
    <div>
      <button onClick={() => openModal('position-details', { positionId: '1' })}>
        Open Position Details
      </button>
      <button onClick={() => openModal('notifications')}>
        Open Notifications
      </button>
      <button onClick={() => openModal('account-settings', { section: 'profile' })}>
        Open Account Settings
      </button>
      <button onClick={() => openModal('trading-terminal')}>
        Open Trading Terminal
      </button>
    </div>
  );
};

describe('Modal Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  test('Position Details Modal opens and displays position data', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    
    // Open the position details modal
    fireEvent.click(screen.getByText('Open Position Details'));
    
    // Verify the modal is open and displays position data
    await waitFor(() => {
      expect(screen.getByText('Position Details')).toBeInTheDocument();
      expect(screen.getByText('BTC/USDT')).toBeInTheDocument();
      expect(screen.getByText('$50,000.00')).toBeInTheDocument(); // Entry price
    });
    
    // Test stop loss update
    const stopLossInput = screen.getByPlaceholderText('Enter stop loss price');
    fireEvent.change(stopLossInput, { target: { value: '48000' } });
    
    // Find and click the update button
    const updateButton = screen.getByText('Update Stop Loss');
    fireEvent.click(updateButton);
    
    // Verify the update function was called
    await waitFor(() => {
      expect(mockUpdateStopLoss).toHaveBeenCalledWith(48000);
    });
  });

  test('Notifications Modal opens and displays notifications', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    
    // Open the notifications modal
    fireEvent.click(screen.getByText('Open Notifications'));
    
    // Verify the modal is open and displays notification data
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
      expect(screen.getByText('This is a test notification')).toBeInTheDocument();
    });
    
    // Test marking a notification as read
    const markAsReadButton = screen.getByText('Mark as Read');
    fireEvent.click(markAsReadButton);
    
    // Verify the markAsRead function was called
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith(['1']);
    });
  });

  test('Account Settings Modal opens and displays user profile', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    
    // Open the account settings modal
    fireEvent.click(screen.getByText('Open Account Settings'));
    
    // Verify the modal is open and displays user profile data
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });
    
    // Test updating a profile field
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    
    // Find and click the save button
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    // Verify the updateProfile function was called with the updated data
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
      }));
    });
  });

  test('Form validation works correctly', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    
    // Open the account settings modal
    fireEvent.click(screen.getByText('Open Account Settings'));
    
    // Test validation by entering an invalid email
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    // Find and click the save button
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      // Verify updateProfile wasn't called due to validation error
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  test('Modal closes correctly', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    
    // Open the position details modal
    fireEvent.click(screen.getByText('Open Position Details'));
    
    // Verify the modal is open
    await waitFor(() => {
      expect(screen.getByText('Position Details')).toBeInTheDocument();
    });
    
    // Find and click the close button (usually an X button)
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    // Verify the modal is closed
    await waitFor(() => {
      expect(screen.queryByText('Position Details')).not.toBeInTheDocument();
    });
  });
});
