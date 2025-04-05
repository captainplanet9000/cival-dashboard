import { CONFIG } from '@/config/mockConfig';
import { StorageService } from './storageService';
import { VaultService } from './vaultService';
import { IntegrationService } from './integrationService';
import { MockStorageService } from '../__mocks__/services/mockStorageService';
// Import mock vault service
import { MockVaultService } from '../__mocks__/services/mockVaultService';

/**
 * Service Factory
 * 
 * Provides conditional loading of real or mock service implementations based on configuration.
 * This enables seamless switching between development with mock data and production with real services.
 */

/**
 * Get the appropriate storage service based on configuration
 * @param isServerSide Whether this service is being used on the server side
 * @returns StorageService instance (real or mocked)
 */
export const getStorageService = (isServerSide = false) => {
  if (CONFIG.storage.useMock) {
    console.log('[ServiceFactory] Using Mock Storage Service');
    return new MockStorageService(isServerSide);
  }
  console.log('[ServiceFactory] Using Real Storage Service');
  return new StorageService(isServerSide);
};

/**
 * Get the appropriate vault service based on configuration
 * @param isServerSide Whether this service is being used on the server side
 * @returns VaultService instance (real or mocked)
 */
export const getVaultService = (isServerSide = false) => {
  if (CONFIG.vault.useMock) {
    console.log('[ServiceFactory] Using Mock Vault Service');
    return new MockVaultService(isServerSide);
  }
  console.log('[ServiceFactory] Using Real Vault Service');
  return new VaultService(isServerSide);
};

/**
 * Get the appropriate integration service based on configuration
 * @param isServerSide Whether this service is being used on the server side
 * @returns IntegrationService instance
 */
export const getIntegrationService = (isServerSide = false) => {
  // The integration service uses storage and vault services internally
  // We don't need to create a separate mock for it, as it will use the mocked dependencies
  return new IntegrationService(isServerSide);
};

/**
 * Reset all mock data - useful for testing or when starting fresh
 * @returns True if reset was performed, false if mocks are not in use
 */
export const resetAllMockData = (): boolean => {
  if (CONFIG.storage.useMock || CONFIG.vault.useMock || CONFIG.blockchain.useMock || CONFIG.exchange.useMock) {
    try {
      // Dynamically import the resetAllMockData function from mock repository
      import('../__mocks__/supabase/mockSupabaseClient').then(module => {
        module.resetAllMockData();
        console.log('[ServiceFactory] All mock data has been reset');
      });
      return true;
    } catch (error) {
      console.error('[ServiceFactory] Failed to reset mock data:', error);
      return false;
    }
  }
  console.log('[ServiceFactory] Mock services are not in use, nothing to reset');
  return false;
};

// Export specific instances for singleton access patterns
export const storageService = getStorageService(typeof window === 'undefined');
export const vaultService = getVaultService(typeof window === 'undefined');
export const integrationService = getIntegrationService(typeof window === 'undefined'); 