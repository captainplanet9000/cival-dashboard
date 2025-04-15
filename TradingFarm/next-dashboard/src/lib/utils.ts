import { type ClassValue, clsx } from "clsx"; import { twMerge } from "tailwind-merge"; export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// Wallet Formatting Utilities

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
