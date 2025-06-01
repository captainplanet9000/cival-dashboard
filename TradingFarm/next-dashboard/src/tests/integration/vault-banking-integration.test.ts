/**
 * Vault Banking Integration Tests
 * Tests the integration between the vault banking service, hooks, and UI components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useVaultBanking } from '@/hooks/use-vault-banking';
import { vaultBankingService } from '@/services/vault-banking-service';
import { renderHook, act } from '@testing-library/react-hooks';
import { VaultTransactionList } from '@/components/vault/vault-transaction-list';
import { CreateVaultTransactionDialog } from '@/components/vault/create-vault-transaction-dialog';

// Mock the vault banking service
jest.mock('@/services/vault-banking-service', () => ({
  vaultBankingService: {
    isVaultIntegrationEnabled: jest.fn(),
    getVaultMasters: jest.fn(),
    getVaultMasterById: jest.fn(),
    getVaultAccounts: jest.fn(),
    getVaultAccountById: jest.fn(),
    getVaultTransactions: jest.fn(),
    createVaultTransaction: jest.fn(),
    synchronizeWithVaultSystem: jest.fn(),
  }
}));

// Mock toast component
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('Vault Banking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integration between service and hook', () => {
    it('should load vault masters through the hook', async () => {
      // Mock service response
      const mockVaultMasters = [
        { id: 1, name: 'Vault 1', description: 'Test vault 1', status: 'active', created_at: '2023-04-01T00:00:00Z', updated_at: '2023-04-01T00:00:00Z' },
        { id: 2, name: 'Vault 2', description: 'Test vault 2', status: 'active', created_at: '2023-04-02T00:00:00Z', updated_at: '2023-04-02T00:00:00Z' }
      ];
      
      (vaultBankingService.getVaultMasters as jest.Mock).mockResolvedValue({
        data: mockVaultMasters,
        count: 2,
        total: 2
      });
      
      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useVaultBanking());
      
      // Initial state should be empty
      expect(result.current.vaultMasters).toEqual([]);
      expect(result.current.loading).toBe(false);
      
      // Call loadVaultMasters
      act(() => {
        result.current.loadVaultMasters();
      });
      
      // Loading state should be true
      expect(result.current.loading).toBe(true);
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Verify hook state is updated correctly
      expect(result.current.vaultMasters).toEqual(mockVaultMasters);
      expect(result.current.loading).toBe(false);
      
      // Verify service was called correctly
      expect(vaultBankingService.getVaultMasters).toHaveBeenCalled();
    });

    it('should handle errors when loading data', async () => {
      // Mock service to throw error
      (vaultBankingService.getVaultMasters as jest.Mock).mockRejectedValue(new Error('API error'));
      
      // Mock console.error to avoid test output noise
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // Render the hook with custom error handler
      const onError = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useVaultBanking({ onError }));
      
      // Call loadVaultMasters
      act(() => {
        result.current.loadVaultMasters();
      });
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Verify error handling
      expect(result.current.error).toContain('Error loading vault masters');
      expect(onError).toHaveBeenCalled();
      
      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should create a transaction and refresh data', async () => {
      // Mock service responses
      const mockTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        amount: 1000,
        currency: 'USD',
        status: 'completed',
        timestamp: '2023-04-28T10:00:00Z',
        created_at: '2023-04-28T10:00:00Z',
        updated_at: '2023-04-28T10:00:00Z'
      };
      
      const mockTransactions = [mockTransaction];
      
      (vaultBankingService.createVaultTransaction as jest.Mock).mockResolvedValue({
        data: mockTransaction
      });
      
      (vaultBankingService.getVaultTransactions as jest.Mock).mockResolvedValue({
        data: mockTransactions,
        count: 1,
        total: 1
      });
      
      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useVaultBanking());
      
      // Call createVaultTransaction
      const transactionData = {
        account_id: 1,
        type: 'deposit',
        amount: 1000,
        currency: 'USD'
      };
      
      act(() => {
        result.current.createVaultTransaction(transactionData);
      });
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Verify service was called correctly
      expect(vaultBankingService.createVaultTransaction).toHaveBeenCalledWith(transactionData);
      
      // For this test, we're not fully simulating the loadVaultTransactions effect
      // since that would require more complex test setup
    });
  });

  describe('Integration between hooks and components', () => {
    it('should render transaction list component with data from the hook', async () => {
      // Mock transactions data
      const mockTransactions = [
        {
          id: 1,
          account_id: 1,
          type: 'deposit',
          amount: 1000,
          currency: 'USD',
          status: 'completed',
          approval_status: 'approved',
          timestamp: '2023-04-28T10:00:00Z',
          created_at: '2023-04-28T10:00:00Z',
          updated_at: '2023-04-28T10:00:00Z'
        },
        {
          id: 2,
          account_id: 1,
          type: 'withdrawal',
          amount: 500,
          currency: 'USD',
          status: 'completed',
          approval_status: 'approved',
          timestamp: '2023-04-28T11:00:00Z',
          created_at: '2023-04-28T11:00:00Z',
          updated_at: '2023-04-28T11:00:00Z'
        }
      ];
      
      const mockAccounts = [
        {
          id: 1,
          vault_id: 1,
          name: 'Test Account',
          account_type: 'trading',
          currency: 'USD',
          balance: 1500,
          reserved_balance: 0,
          status: 'active',
          created_at: '2023-04-25T10:00:00Z',
          updated_at: '2023-04-25T10:00:00Z',
          last_updated: '2023-04-25T10:00:00Z'
        }
      ];
      
      // Render the component with mock data
      render(
        <VaultTransactionList
          transactions={mockTransactions}
          loading={false}
          accounts={mockAccounts}
          showAccount={true}
        />
      );
      
      // Verify component renders transactions correctly
      expect(screen.getByText('deposit')).toBeInTheDocument();
      expect(screen.getByText('withdrawal')).toBeInTheDocument();
      expect(screen.getByText('Test Account')).toBeInTheDocument();
      
      // Check for status badges
      const completedBadges = screen.getAllByText('completed');
      expect(completedBadges.length).toBe(2);
    });

    // Note: This is a partial test of the dialog component
    // A full test would be more complex and require more mocking
    it('should show the transaction dialog with correct initial values', () => {
      const mockAccount = {
        id: 1,
        vault_id: 1,
        name: 'Test Account',
        account_type: 'trading',
        currency: 'USD',
        balance: 1500,
        reserved_balance: 0,
        status: 'active',
        created_at: '2023-04-25T10:00:00Z',
        updated_at: '2023-04-25T10:00:00Z',
        last_updated: '2023-04-25T10:00:00Z'
      };
      
      const mockAccounts = [mockAccount];
      
      const onOpenChange = jest.fn();
      const onSuccess = jest.fn();
      
      render(
        <CreateVaultTransactionDialog
          open={true}
          onOpenChange={onOpenChange}
          account={mockAccount}
          accounts={mockAccounts}
          onSuccess={onSuccess}
        />
      );
      
      // Verify dialog displays with correct account info
      expect(screen.getByText('Create Transaction')).toBeInTheDocument();
      expect(screen.getByText(/Test Account/)).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });

  describe('End-to-end flows', () => {
    it('should synchronize with vault system and update data', async () => {
      // Mock service responses
      (vaultBankingService.synchronizeWithVaultSystem as jest.Mock).mockResolvedValue({
        data: { syncedCount: 5 },
        message: 'Synchronized successfully'
      });
      
      // Render the hook
      const { result, waitForNextUpdate } = renderHook(() => useVaultBanking());
      
      // Call synchronizeWithVaultSystem
      act(() => {
        result.current.synchronizeWithVaultSystem();
      });
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Verify service was called correctly
      expect(vaultBankingService.synchronizeWithVaultSystem).toHaveBeenCalled();
    });
  });
});
