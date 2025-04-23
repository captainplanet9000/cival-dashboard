/**
 * Utility functions for formatting values in the Trading Farm UI
 */

/**
 * Format a price value with appropriate precision based on its magnitude
 * @param price The price value to format
 * @param currency The currency symbol to use (default: $)
 * @returns Formatted price string
 */
export function formatPrice(price: number | null | undefined, currency: string = '$'): string {
  if (price === null || price === undefined) return `${currency}0.00`;
  
  // Handle different price ranges with appropriate precision
  if (price >= 1000) {
    // For larger prices, show fewer decimal places
    return `${currency}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `${currency}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  } else if (price >= 0.01) {
    return `${currency}${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  } else {
    // For very small prices (like many altcoins), show more decimal places
    return `${currency}${price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 })}`;
  }
}

/**
 * Format a percentage value
 * @param value The percentage value to format
 * @param includePlusSign Whether to include a plus sign for positive values
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | null | undefined, includePlusSign: boolean = true): string {
  if (value === null || value === undefined) return '0.00%';
  
  const sign = includePlusSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a large number value with appropriate suffix (K, M, B)
 * @param value The number to format
 * @returns Formatted number string with suffix
 */
export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  } else {
    return value.toFixed(2);
  }
}

/**
 * Format a date/timestamp for display
 * @param timestamp The timestamp to format
 * @param format The format style to use
 * @returns Formatted date/time string
 */
export function formatDate(timestamp: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (format === 'short') {
    return date.toLocaleDateString();
  } else if (format === 'long') {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } else {
    return date.toLocaleString();
  }
}
