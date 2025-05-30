/**
 * Browser Mock Service Worker Setup
 * Configures MSW for use in the browser environment
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup MSW browser worker
export const worker = setupWorker(...handlers);

// Start the worker
if (process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
  }).catch(console.error);
  
  console.log('%c[MSW] Mock API server started', 'color: #00b300; font-weight: bold;');
} 