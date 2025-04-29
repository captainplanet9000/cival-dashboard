import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatting Utilities

export const formatAddress = (addr: string | null): string => {
  if (!addr) return '';
  // Basic check for ETH-like address format
  if (addr.length !== 42 || !addr.startsWith('0x')) {
    return 'Invalid Address';
  }
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

export const formatBalance = (value: string | null, decimals = 4): string => {
  if (value === null || value === undefined) return '0.00';
  const numericValue = Number(value);
  if (isNaN(numericValue)) {
    return '0.00'; // Handle cases where value might be non-numeric string
  }
  return numericValue.toFixed(decimals);
};

export const formatCurrency = (value: number | null | undefined, currency = 'USD', options: Intl.NumberFormatOptions = {}): string => {
  if (value === null || value === undefined) return '$0.00';
  
  // Default options
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  };

  // For very large numbers, reduce decimal precision
  if (value >= 1000000) {
    defaultOptions.maximumFractionDigits = 0;
  } else if (value >= 10000) {
    defaultOptions.maximumFractionDigits = 1;
  }
  
  // Format the value using Intl.NumberFormat
  return new Intl.NumberFormat('en-US', defaultOptions).format(value);
};

export const formatDate = (date: Date): string => {
  if (!date) return 'N/A';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatPercentage = (value: number | null | undefined, decimals = 2): string => {
  if (value === null || value === undefined) return '0.00%';
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100); // Divide by 100 as our values are stored as 0-100 not 0-1
};
