/**
 * Exchange Credentials Service
 * 
 * This is a gateway file that re-exports the client-side implementation
 * to avoid Next.js errors with server components in the Pages Router.
 * 
 * Client components should import from this file, and it will provide
 * the appropriate implementation based on the execution context.
 */

// Re-export everything from the client version
import * as clientImplementation from './exchange-credentials-client';

// Export all the functions from the client implementation
export const {
  storeExchangeCredentials,
  getExchangeCredentials,
  getAllExchangeCredentials,
  updateExchangeCredentials,
  deleteExchangeCredentials,
  doesCredentialUseVault,
  migrateCredentialToVault
} = clientImplementation;

// Default export for backwards compatibility
export default clientImplementation;
