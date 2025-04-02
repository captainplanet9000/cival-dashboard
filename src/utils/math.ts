import Decimal from 'decimal.js';
import logger from './logger';

// Set precision globally (can be adjusted based on requirements)
Decimal.set({ precision: 20 });

/**
 * Create a new Decimal instance from a value
 * @param value Value to convert to Decimal
 * @returns Decimal instance
 */
export function createDecimal(value: Decimal.Value): Decimal {
  try {
    return new Decimal(value);
  } catch (error: any) {
    logger.error('Error creating Decimal:', { value, error: error.message });
    throw new Error(`Invalid value for Decimal: ${value}`);
  }
}

/**
 * Add two values with precision
 * @param a First value
 * @param b Second value
 * @returns Result as number
 */
export function add(a: Decimal.Value, b: Decimal.Value): number {
  return new Decimal(a).plus(b).toNumber();
}

/**
 * Subtract b from a with precision
 * @param a First value
 * @param b Second value
 * @returns Result as number
 */
export function subtract(a: Decimal.Value, b: Decimal.Value): number {
  return new Decimal(a).minus(b).toNumber();
}

/**
 * Multiply two values with precision
 * @param a First value
 * @param b Second value
 * @returns Result as number
 */
export function multiply(a: Decimal.Value, b: Decimal.Value): number {
  return new Decimal(a).times(b).toNumber();
}

/**
 * Divide a by b with precision
 * @param a First value
 * @param b Second value
 * @returns Result as number
 */
export function divide(a: Decimal.Value, b: Decimal.Value): number {
  if (new Decimal(b).isZero()) {
    throw new Error('Division by zero');
  }
  return new Decimal(a).div(b).toNumber();
}

/**
 * Round a value to specified decimal places
 * @param value Value to round
 * @param decimalPlaces Number of decimal places
 * @returns Rounded value as number
 */
export function round(value: Decimal.Value, decimalPlaces: number = 2): number {
  return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
}

/**
 * Calculate percentage of a value
 * @param value Base value
 * @param percent Percentage to calculate
 * @returns Percentage result as number
 */
export function percentage(value: Decimal.Value, percent: Decimal.Value): number {
  return new Decimal(value).times(new Decimal(percent).div(100)).toNumber();
}

/**
 * Calculate percentage change between two values
 * @param oldValue Original value
 * @param newValue New value
 * @returns Percentage change as number
 */
export function percentageChange(oldValue: Decimal.Value, newValue: Decimal.Value): number {
  if (new Decimal(oldValue).isZero()) {
    return 0; // Avoid division by zero
  }
  return new Decimal(newValue).minus(oldValue).div(oldValue).times(100).toNumber();
}

/**
 * Calculate the weighted average of values and weights
 * @param values Array of values
 * @param weights Array of weights
 * @returns Weighted average as number
 */
export function weightedAverage(values: Decimal.Value[], weights: Decimal.Value[]): number {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length');
  }
  
  if (values.length === 0) {
    return 0;
  }
  
  let sumOfWeightedValues = new Decimal(0);
  let sumOfWeights = new Decimal(0);
  
  for (let i = 0; i < values.length; i++) {
    const value = new Decimal(values[i]);
    const weight = new Decimal(weights[i]);
    
    sumOfWeightedValues = sumOfWeightedValues.plus(value.times(weight));
    sumOfWeights = sumOfWeights.plus(weight);
  }
  
  if (sumOfWeights.isZero()) {
    return 0; // Avoid division by zero
  }
  
  return sumOfWeightedValues.div(sumOfWeights).toNumber();
}

/**
 * Format a number as a currency string
 * @param value Value to format
 * @param currency Currency code (default: USD)
 * @param locale Locale for formatting (default: en-US)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: Decimal.Value, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(new Decimal(value).toNumber());
}

/**
 * Format a number to a specified number of decimal places
 * @param value Value to format
 * @param decimalPlaces Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value: Decimal.Value, decimalPlaces: number = 2): string {
  return new Decimal(value).toFixed(decimalPlaces);
}

/**
 * Calculate the compounded return over a period
 * @param rate Rate of return per period (as decimal, e.g., 0.05 for 5%)
 * @param periods Number of periods
 * @returns Compounded return as number
 */
export function compoundReturn(rate: Decimal.Value, periods: number): number {
  return new Decimal(1).plus(rate).pow(periods).minus(1).toNumber();
}

/**
 * Calculate the future value of an investment
 * @param principal Initial investment amount
 * @param rate Rate of return per period (as decimal)
 * @param periods Number of periods
 * @returns Future value as number
 */
export function futureValue(
  principal: Decimal.Value, 
  rate: Decimal.Value, 
  periods: number
): number {
  return new Decimal(principal).times(new Decimal(1).plus(rate).pow(periods)).toNumber();
}

// Export Decimal directly for advanced usage
export { Decimal }; 