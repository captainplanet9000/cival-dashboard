/**
 * API utility functions for the Trading Farm dashboard
 */

/**
 * Format API error message for consistent display
 */
export const formatApiError = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'Unknown error occurred';
};

/**
 * Handles API response and returns formatted data or throws error
 */
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(formatApiError(errorData) || `Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
};

/**
 * Formats a timestamp for display
 */
export const formatTimestamp = (timestamp: string | number | Date): string => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Formats a currency amount with appropriate symbol
 */
export const formatCurrency = (amount: number, currency = 'USD', locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
};

/**
 * Formats a percentage value
 */
export const formatPercentage = (value: number, minimumFractionDigits = 2): string => {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits: 2,
  })}%`;
};

/**
 * Throttle a function call
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  return function(this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Parse URL parameters
 */
export const parseParams = (urlParams: URLSearchParams): Record<string, string> => {
  const params: Record<string, string> = {};
  urlParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

/**
 * Test connectivity to the Trading Farm API
 * Mock implementation to fix build errors
 */
export const testConnectivity = async (endpoint?: string): Promise<{success: boolean; latency: number; message: string}> => {
  // Mock implementation that always returns success
  return {
    success: true,
    latency: 42, // Mock latency in ms
    message: 'Connection successful (mock)'
  };
};

export default {
  formatApiError,
  handleApiResponse,
  formatTimestamp,
  formatCurrency,
  formatPercentage,
  throttle,
  parseParams,
  testConnectivity
};
