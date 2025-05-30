/**
 * Utility functions for formatting data in the Trading Farm dashboard
 */

/**
 * Format a number to a currency string with appropriate symbol
 */
export const formatCurrency = (
  value: number,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {}
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
};

/**
 * Format a number with commas for thousands
 */
export const formatNumber = (
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

/**
 * Format a percentage value
 */
export const formatPercent = (
  value: number,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value / 100);
};

/**
 * Format a date string or Date object to localized date string
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date string or Date object to localized date and time string
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a date string or Date object to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds === 1 ? '' : 's'} ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
};

/**
 * Format a number to compact notation (e.g., 1.2K, 1.2M)
 */
export const formatCompact = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

/**
 * Format a decimal number with specified precision
 */
export const formatDecimal = (
  value: number,
  precision = 2
): string => {
  return value.toFixed(precision);
};

/**
 * Format trading pair symbols for display
 */
export const formatTradingPair = (symbol: string): string => {
  // Handle common formats like "BTC/USDT", "BTCUSDT", "BTC-USDT"
  if (symbol.includes('/')) {
    return symbol; // Already formatted with /
  }
  
  if (symbol.includes('-')) {
    return symbol.replace('-', '/'); // Convert - to /
  }
  
  // Try to identify the base and quote currencies
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
  const fiatCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
  
  // Check for stablecoins and fiat at the end
  for (const currency of [...stablecoins, ...fiatCurrencies]) {
    if (symbol.endsWith(currency)) {
      return `${symbol.slice(0, -currency.length)}/${currency}`;
    }
  }
  
  // Default fallback for 3-letter currency codes
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  
  return symbol; // Return original if no patterns match
};

export default {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatCompact,
  formatDecimal,
  formatTradingPair,
};
