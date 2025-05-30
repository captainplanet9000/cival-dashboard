/**
 * Environment utility functions for Trading Farm Dashboard
 * 
 * These utilities help with environment detection and configuration
 * across different deployment environments.
 */

/**
 * Determines if the application is running in a production environment
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Determines if the application is running in a development environment
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Determines if the application is running in a testing environment
 */
export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

/**
 * Get the base URL for the current environment
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // For server-side rendering
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

/**
 * Determines if a specific feature flag is enabled
 * @param flag The feature flag name to check
 * @param defaultValue The default value to return if the flag is not configured
 */
export const isFeatureEnabled = (flag: string, defaultValue = false): boolean => {
  const envVar = `NEXT_PUBLIC_ENABLE_${flag.toUpperCase()}`;
  const envValue = process.env[envVar];
  
  if (envValue === undefined) {
    return defaultValue;
  }
  
  return envValue === 'true' || envValue === '1';
};

/**
 * Feature flag constants for easier reference
 */
export const FEATURES = {
  LIVE_TRADING: 'LIVE_TRADING',
  AGENT_SYSTEM: 'AGENT_SYSTEM', 
  RISK_MANAGEMENT: 'RISK_MANAGEMENT',
  VAULT_BANKING: 'VAULT_BANKING',
  ADVANCED_ANALYTICS: 'ADVANCED_ANALYTICS',
  PERFORMANCE_MONITORING: 'PERFORMANCE_MONITORING',
  ANALYTICS: 'ANALYTICS',
} as const;

/**
 * Get the application version
 */
export const getAppVersion = (): string => {
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
};

/**
 * Get the appropriate API URL for the current environment
 */
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_BASE_URL || `${getBaseUrl()}/api`;
};

/**
 * Get the vault API URL
 */
export const getVaultApiUrl = (): string => {
  return process.env.VAULT_API_URL || 'https://vault.tradingfarm.com/api';
};

/**
 * Determine if we're running on the server or client
 */
export const isServer = (): boolean => {
  return typeof window === 'undefined';
};

/**
 * Determine if we're running on the client
 */
export const isClient = (): boolean => {
  return !isServer();
};
