/**
 * Error tracking configuration using Sentry
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize error tracking
 * This should be called in production environments to track errors
 */
export function initializeErrorTracking() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const ENVIRONMENT = process.env.NODE_ENV || 'development';
  
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not provided. Error tracking will be disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      // Only enable in production to avoid noise during development
      enabled: ENVIRONMENT === 'production',
      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
      tracesSampleRate: 1.0,
      // Set sampling rate to reduce data volume in high-traffic applications (adjust as needed)
      // In production you might want to lower this value, e.g., 0.2 (20%)
      replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
      // Capture errors on all user interactions
      replaysOnErrorSampleRate: 1.0,
      // Capture console.error, console.warn, and unhandled rejections
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          // Additional Replay options
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
    
    console.log('Sentry error tracking initialized');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an exception and send it to Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
  console.error(error);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: context ? { additional: context } : undefined,
    });
  }
}

/**
 * Set user information for error tracking
 * This helps associate errors with specific users
 */
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user information when logging out
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Set additional context that might be helpful for debugging
 */
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

export default {
  initializeErrorTracking,
  captureException,
  setUserContext,
  clearUserContext,
  setContext,
};
