/**
 * Utility functions for currency formatting and calculations
 */

/**
 * Format a number as currency with proper symbol and decimal places
 * @param amount Number to format as currency
 * @param currency Currency code (default: 'USD')
 * @param locale Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (amount === null || amount === undefined) return '-';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount}`;
  }
}

/**
 * Format a number as a percentage
 * @param value Number to format as percentage
 * @param decimalPlaces Number of decimal places (default: 2)
 * @param locale Locale for formatting (default: 'en-US')
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number | null | undefined,
  decimalPlaces: number = 2,
  locale: string = 'en-US'
): string {
  if (value === null || value === undefined) return '-';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value / 100);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return `${value}%`;
  }
}

/**
 * Calculate percentage change between two values
 * @param currentValue Current value
 * @param previousValue Previous value
 * @returns Percentage change as a number
 */
export function calculatePercentageChange(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue === 0) return 0;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

/**
 * Format a large number with K/M/B suffixes
 * @param value Number to format
 * @param decimalPlaces Number of decimal places (default: 1)
 * @returns Formatted string with appropriate suffix
 */
export function formatLargeNumber(
  value: number | null | undefined,
  decimalPlaces: number = 1
): string {
  if (value === null || value === undefined) return '-';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimalPlaces)}B`;
  }
  
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimalPlaces)}M`;
  }
  
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(decimalPlaces)}K`;
  }
  
  return value.toFixed(decimalPlaces);
}
