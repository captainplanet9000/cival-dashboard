/**
 * Input validation utilities for protecting against injection attacks and ensuring data integrity
 * These utilities help prevent XSS, SQL injection, and other common web vulnerabilities
 */

// Regex patterns for common input validations
const PATTERNS = {
  // Basic email validation pattern
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Password requirements: minimum 8 chars, at least one uppercase, one lowercase, one number
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\S]{8,}$/,
  
  // Username: alphanumeric, underscore, hyphen, 3-20 chars
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  
  // Cryptocurrency address validation (general format, not currency-specific)
  CRYPTO_ADDRESS: /^[a-zA-Z0-9]{26,42}$/,
  
  // Trading pair symbol (e.g., BTC/USDT, ETH-USD)
  TRADING_PAIR: /^[A-Z0-9]{1,10}[/\\-][A-Z0-9]{1,10}$/,
  
  // API key format (typical for trading exchanges)
  API_KEY: /^[a-zA-Z0-9]{16,64}$/,
  
  // Number with optional decimal places
  DECIMAL_NUMBER: /^-?\d+(\.\d+)?$/,
  
  // Date in ISO format (YYYY-MM-DD)
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,
};

/**
 * Validate an email address
 * @param email Email to validate
 * @returns Whether the email is valid
 */
export function isValidEmail(email: string): boolean {
  return PATTERNS.EMAIL.test(email);
}

/**
 * Validate a password meets security requirements
 * @param password Password to validate
 * @returns Whether the password meets requirements
 */
export function isStrongPassword(password: string): boolean {
  return PATTERNS.STRONG_PASSWORD.test(password);
}

/**
 * Validate a username
 * @param username Username to validate
 * @returns Whether the username is valid
 */
export function isValidUsername(username: string): boolean {
  return PATTERNS.USERNAME.test(username);
}

/**
 * Validate a cryptocurrency pair symbol
 * @param symbol Trading pair to validate (e.g., BTC/USDT)
 * @returns Whether the symbol is valid
 */
export function isValidTradingPair(symbol: string): boolean {
  return PATTERNS.TRADING_PAIR.test(symbol);
}

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param html HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Replace potentially dangerous HTML characters
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize SQL input to prevent SQL injection
 * Note: This is a basic sanitization, database parameterization is preferred
 * @param input SQL input to sanitize
 * @returns Sanitized input
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';
  
  // Remove SQL comment sequences and common SQL injection patterns
  return input
    .replace(/--/g, '')
    .replace(/;/g, '')
    .replace(/'/g, "''")
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, 'invalid')
    .replace(/exec\s+/gi, 'invalid')
    .replace(/UNION\s+SELECT/gi, 'invalid');
}

/**
 * Validate numerical input
 * @param value Value to check
 * @param options Validation options
 * @returns Whether the value is valid
 */
export function validateNumber(
  value: number | string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    allowNegative?: boolean;
  } = {}
): boolean {
  const { min, max, integer = false, allowNegative = false } = options;
  
  // Convert to number if string
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check if it's a valid number
  if (isNaN(num)) return false;
  
  // Check if it's an integer when required
  if (integer && !Number.isInteger(num)) return false;
  
  // Check if it's non-negative when required
  if (!allowNegative && num < 0) return false;
  
  // Check min/max bounds
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  
  return true;
}

/**
 * Validate date input
 * @param dateStr Date string in ISO format (YYYY-MM-DD)
 * @param options Validation options
 * @returns Whether the date is valid
 */
export function validateDate(
  dateStr: string,
  options: {
    minDate?: Date;
    maxDate?: Date;
    allowFutureDates?: boolean;
  } = {}
): boolean {
  const { minDate, maxDate, allowFutureDates = true } = options;
  
  // Check format
  if (!PATTERNS.ISO_DATE.test(dateStr)) return false;
  
  // Parse date
  const date = new Date(dateStr);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return false;
  
  // Check if future dates are allowed
  if (!allowFutureDates && date > new Date()) return false;
  
  // Check min/max bounds
  if (minDate && date < minDate) return false;
  if (maxDate && date > maxDate) return false;
  
  return true;
}

/**
 * Validate API key format (used for exchange API keys)
 * @param apiKey API key to validate
 * @returns Whether the API key format is valid
 */
export function isValidApiKey(apiKey: string): boolean {
  return PATTERNS.API_KEY.test(apiKey);
}

/**
 * Validate an order object to ensure it has all required fields and valid values
 * @param order Order object to validate
 * @returns Validation result with errors if any
 */
export function validateOrder(order: any): { 
  valid: boolean; 
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  
  // Check required fields
  if (!order.symbol) {
    errors.symbol = 'Trading symbol is required';
  } else if (!isValidTradingPair(order.symbol)) {
    errors.symbol = 'Invalid trading pair format';
  }
  
  if (!order.side) {
    errors.side = 'Order side is required';
  } else if (!['buy', 'sell'].includes(order.side.toLowerCase())) {
    errors.side = 'Order side must be "buy" or "sell"';
  }
  
  if (!order.type) {
    errors.type = 'Order type is required';
  } else if (!['market', 'limit', 'stop', 'stop_limit'].includes(order.type.toLowerCase())) {
    errors.type = 'Invalid order type';
  }
  
  if (!order.amount) {
    errors.amount = 'Order amount is required';
  } else if (!validateNumber(order.amount, { min: 0 })) {
    errors.amount = 'Order amount must be a positive number';
  }
  
  // Price is required for limit orders
  if (order.type === 'limit' || order.type === 'stop_limit') {
    if (!order.price) {
      errors.price = 'Price is required for limit orders';
    } else if (!validateNumber(order.price, { min: 0 })) {
      errors.price = 'Price must be a positive number';
    }
  }
  
  // Stop price is required for stop orders
  if (order.type === 'stop' || order.type === 'stop_limit') {
    if (!order.stopPrice) {
      errors.stopPrice = 'Stop price is required for stop orders';
    } else if (!validateNumber(order.stopPrice, { min: 0 })) {
      errors.stopPrice = 'Stop price must be a positive number';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Create safe and sanitized JSON string
 * @param data Data to convert to JSON
 * @returns Sanitized JSON string
 */
export function safeJsonStringify(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    // Sanitize the JSON string to prevent XSS in case it's embedded in HTML
    return jsonString.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  } catch (e) {
    console.error('Error stringifying data:', e);
    return '{}';
  }
}

/**
 * Safe JSON parsing with type validation
 * @param jsonString JSON string to parse
 * @param validator Optional validation function for the parsed data
 * @returns Parsed data or null if invalid
 */
export function safeJsonParse<T>(
  jsonString: string,
  validator?: (data: any) => boolean
): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (validator && !validator(parsed)) {
      console.warn('JSON validation failed');
      return null;
    }
    
    return parsed as T;
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return null;
  }
}
