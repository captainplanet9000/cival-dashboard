/**
 * Server-side Mock Service Worker Setup
 * Configures MSW for use in Node.js environment (for tests)
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server for Node environment
export const server = setupServer(...handlers);

// Start the server for tests
if (process.env.NODE_ENV === 'test') {
  // Set up request interception
  beforeAll(() => server.listen());
  
  // Reset handlers between tests
  afterEach(() => server.resetHandlers());
  
  // Clean up after tests
  afterAll(() => server.close());
} 