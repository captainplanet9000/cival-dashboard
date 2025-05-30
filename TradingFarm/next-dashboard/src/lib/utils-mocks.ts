/**
 * Mock implementations for utility functions
 * These are used during build to prevent errors when the actual implementations
 * are not available or have dependencies that fail during the build process.
 */

/**
 * Format a percent value (e.g. 0.05 => "5.00%")
 */
export function formatPercent(value: number, options?: { 
  precision?: number; 
  includeSymbol?: boolean;
  colorCode?: boolean;
}) {
  const precision = options?.precision ?? 2;
  const includeSymbol = options?.includeSymbol ?? true;
  
  const formatted = (value * 100).toFixed(precision);
  return includeSymbol ? `${formatted}%` : formatted;
}

/**
 * Format a date to a relative time string (e.g. "5 minutes ago")
 */
export function formatRelativeTime(date: Date | string | number) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

/**
 * Format a date to a standard string format
 */
export function formatDate(date: Date | string | number, options?: {
  format?: 'short' | 'medium' | 'long' | 'full';
  includeTime?: boolean;
}) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const format = options?.format ?? 'medium';
  const includeTime = options?.includeTime ?? true;
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? '2-digit' : 'short',
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    second: format === 'full' && includeTime ? '2-digit' : undefined,
  };
  
  return new Intl.DateTimeFormat('en-US', dateOptions).format(dateObj);
}
