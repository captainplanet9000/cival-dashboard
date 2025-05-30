/**
 * Error monitoring utilities
 * Integration with Sentry for production error tracking
 */

// Mock Sentry implementation (replace with actual Sentry in production)
const Sentry = {
  init: (options: any) => {
    console.log('Sentry initialized with options:', options);
  },
  captureException: (error: Error, context?: any) => {
    console.error('Error captured for Sentry:', error, context);
  },
  captureMessage: (message: string, level?: string) => {
    console.log(`Message captured for Sentry (${level}):`, message);
  },
  setUser: (user: any) => {
    console.log('Sentry user set:', user);
  },
  setTag: (key: string, value: string) => {
    console.log(`Sentry tag set: ${key}=${value}`);
  }
};

// Initialize error monitoring
export const initErrorMonitoring = (): void => {
  if (typeof window === 'undefined') return;
  
  // Only initialize in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Error monitoring disabled in development');
    return;
  }
  
  try {
    // Initialize Sentry (in production, import the actual Sentry package)
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      tracesSampleRate: 0.5, // Adjust based on your traffic
    });
    
    // Set up global error handler
    setupGlobalErrorHandler();
    
    console.log('Error monitoring initialized');
  } catch (error) {
    console.error('Failed to initialize error monitoring:', error);
  }
};

// Set up global error handler
const setupGlobalErrorHandler = (): void => {
  if (typeof window === 'undefined') return;
  
  // Save original error handler
  const originalOnError = window.onerror;
  
  // Override global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    // Capture in Sentry
    if (error) {
      Sentry.captureException(error, {
        extra: { message, source, lineno, colno }
      });
    } else {
      Sentry.captureMessage(message?.toString() || 'Unknown error', 'error');
    }
    
    // Call original handler if exists
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    
    // Return false to allow default browser error handling
    return false;
  };
  
  // Set up unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason || new Error('Unhandled Promise rejection'));
  });
};

// Track errors manually
export const trackError = (
  error: Error, 
  context: Record<string, any> = {}
): void => {
  console.error('Error:', error, context);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  }
};

// Set user information for error context
export const setErrorUser = (
  walletAddress: string,
  userId?: string
): void => {
  if (process.env.NODE_ENV !== 'production') return;
  
  // Set user context in Sentry
  Sentry.setUser({
    id: userId || walletAddress,
    wallet: walletAddress,
  });
  
  // Add wallet as a tag for easier filtering
  Sentry.setTag('wallet', walletAddress);
};

// Clear user information
export const clearErrorUser = (): void => {
  if (process.env.NODE_ENV !== 'production') return;
  
  Sentry.setUser(null);
}; 