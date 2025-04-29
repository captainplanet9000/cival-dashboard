import { vaultBankingService } from '@/services/vault-banking-service';
import { enhancedVaultService } from '@/services/enhanced-vault-service';

// Mock the enhanced vault service
jest.mock('@/services/enhanced-vault-service', () => ({
  enhancedVaultService: {
    getVaultMasters: jest.fn(),
    getVaultMasterById: jest.fn(),
    getVaultAccounts: jest.fn(),
    getVaultAccountById: jest.fn(),
    getVaultTransactions: jest.fn(),
    createVaultTransaction: jest.fn(),
  }
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('VaultBankingService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Mock implementation for fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isVaultIntegrationEnabled', () => {
    it('should return false when NEXT_PUBLIC_ENABLE_VAULT_BANKING is not true', () => {
      const originalEnv = process.env.NEXT_PUBLIC_ENABLE_VAULT_BANKING;
      process.env.NEXT_PUBLIC_ENABLE_VAULT_BANKING = 'false';
      
      expect(vaultBankingService.isVaultIntegrationEnabled()).toBe(false);
      
      process.env.NEXT_PUBLIC_ENABLE_VAULT_BANKING = originalEnv;
    });

    it('should return true when NEXT_PUBLIC_ENABLE_VAULT_BANKING is true', () => {
      const originalEnv = process.env.NEXT_PUBLIC_ENABLE_VAULT_BANKING;
      process.env.NEXT_PUBLIC_ENABLE_VAULT_BANKING = 'true';
      
      expect(vaultBankingService.isVaultIntegrationEnabled()).toBe(true);
      
      process.env.NEXT_PUBLIC_ENABLE_VAULT_BANKING = originalEnv;
    });
  });

  describe('getVaultMasters', () => {
    it('should call enhancedVaultService when vault integration is disabled', async () => {
      // Mock vault integration as disabled
      jest.spyOn(vaultBankingService, 'isVaultIntegrationEnabled').mockReturnValue(false);
      
      // Mock enhancedVaultService response
      const mockResponse = { data: [{ id: 1, name: 'Test Vault' }] };
      (enhancedVaultService.getVaultMasters as jest.Mock).mockResolvedValue(mockResponse);
      
      // Call the method
      const result = await vaultBankingService.getVaultMasters();
      
      // Check if enhancedVaultService was called
      expect(enhancedVaultService.getVaultMasters).toHaveBeenCalled();
      // Check if fetch was not called
      expect(global.fetch).not.toHaveBeenCalled();
      // Check the result
      expect(result).toEqual(mockResponse);
    });

    it('should call API when vault integration is enabled', async () => {
      // Mock vault integration as enabled
      jest.spyOn(vaultBankingService, 'isVaultIntegrationEnabled').mockReturnValue(true);
      
      // Mock fetch response
      const mockApiResponse = { data: [{ id: 2, name: 'API Vault' }] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });
      
      // Call the method
      const result = await vaultBankingService.getVaultMasters();
      
      // Check if fetch was called with the correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/vault-banking/masters'),
        expect.objectContaining({ 
          method: 'GET',
          headers: expect.any(Object)
        })
      );
      
      // Check if enhancedVaultService was not called
      expect(enhancedVaultService.getVaultMasters).not.toHaveBeenCalled();
      
      // Check the result
      expect(result).toEqual(mockApiResponse);
    });

    it('should handle API errors properly', async () => {
      // Mock vault integration as enabled
      jest.spyOn(vaultBankingService, 'isVaultIntegrationEnabled').mockReturnValue(true);
      
      // Mock fetch to return an error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
      });
      
      // Call the method
      const result = await vaultBankingService.getVaultMasters();
      
      // Check if the result contains an error
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe('synchronizeWithVaultSystem', () => {
    it('should call the API with correct parameters', async () => {
      // Mock vault integration as enabled
      jest.spyOn(vaultBankingService, 'isVaultIntegrationEnabled').mockReturnValue(true);
      
      // Mock fetch response
      const mockResponse = { data: { syncedCount: 5 } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });
      
      // Call the method
      const result = await vaultBankingService.synchronizeWithVaultSystem();
      
      // Check if fetch was called with the correct URL and method
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/vault-banking/sync'),
        expect.objectContaining({ 
          method: 'POST',
          headers: expect.any(Object)
        })
      );
      
      // Check the result
      expect(result).toEqual(mockResponse);
    });

    it('should return error response when synchronization fails', async () => {
      // Mock vault integration as enabled
      jest.spyOn(vaultBankingService, 'isVaultIntegrationEnabled').mockReturnValue(true);
      
      // Mock fetch to return an error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ error: 'Synchronization failed' }),
      });
      
      // Call the method
      const result = await vaultBankingService.synchronizeWithVaultSystem();
      
      // Check if the result contains an error
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Synchronization failed');
      expect(result.data).toBeUndefined();
    });
  });

  // Add more test cases for other methods as needed
});
