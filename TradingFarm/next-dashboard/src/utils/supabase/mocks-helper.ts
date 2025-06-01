/**
 * Mock Data Helper Utilities
 *
 * This file provides utilities for working with mock data, including:
 * - Random data generation
 * - ID generation
 * - Date manipulation
 * - Data transformation and filtering
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a random ID
 * @returns A new UUID v4 ID string
 */
export const generateId = (): string => {
  return uuidv4();
};

/**
 * Generate a random date within the specified range
 * @param startDate The earliest possible date
 * @param endDate The latest possible date (defaults to now)
 * @returns A random date string in ISO format
 */
export const randomDate = (
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
  endDate: Date = new Date()
): string => {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const date = new Date(start + Math.random() * (end - start));
  return date.toISOString();
};

/**
 * Generate a random number within the specified range
 * @param min The minimum value (inclusive)
 * @param max The maximum value (exclusive)
 * @returns A random number
 */
export const randomNumber = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

/**
 * Generate a random integer within the specified range
 * @param min The minimum value (inclusive)
 * @param max The maximum value (inclusive)
 * @returns A random integer
 */
export const randomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a random boolean with the specified probability of being true
 * @param probability The probability of the result being true (0-1)
 * @returns A random boolean
 */
export const randomBoolean = (probability: number = 0.5): boolean => {
  return Math.random() < probability;
};

/**
 * Select a random item from an array
 * @param array The array to select from
 * @returns A random item from the array
 */
export const randomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Select multiple random items from an array
 * @param array The array to select from
 * @param count The number of items to select
 * @returns An array of random items
 */
export const randomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Generate a random hex color
 * @returns A random hex color string
 */
export const randomColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

/**
 * Filter an array by a property value
 * @param array The array to filter
 * @param property The property name to filter by
 * @param value The value to match
 * @returns A filtered array
 */
export const filterByProperty = <T>(
  array: T[],
  property: keyof T,
  value: any
): T[] => {
  return array.filter(item => item[property] === value);
};

/**
 * Find an item in an array by its ID
 * @param array The array to search
 * @param id The ID to find
 * @returns The found item or undefined
 */
export const findById = <T extends { id: string }>(
  array: T[],
  id: string
): T | undefined => {
  return array.find(item => item.id === id);
};

/**
 * Simulate a database query with filters
 * @param array The array to query
 * @param filters An object with properties and values to match
 * @returns A filtered array
 */
export const queryWithFilters = <T>(
  array: T[],
  filters: Partial<T>
): T[] => {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      return item[key as keyof T] === value;
    });
  });
};

/**
 * Add a new item to an array and return the updated array
 * @param array The array to add to
 * @param item The item to add
 * @returns The updated array
 */
export const addItem = <T>(array: T[], item: T): T[] => {
  return [...array, item];
};

/**
 * Update an item in an array by ID and return the updated array
 * @param array The array to update
 * @param id The ID of the item to update
 * @param updates The updates to apply
 * @returns The updated array
 */
export const updateItemById = <T extends { id: string }>(
  array: T[],
  id: string,
  updates: Partial<T>
): T[] => {
  return array.map(item => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    return item;
  });
};

/**
 * Remove an item from an array by ID and return the updated array
 * @param array The array to remove from
 * @param id The ID of the item to remove
 * @returns The updated array
 */
export const removeItemById = <T extends { id: string }>(
  array: T[],
  id: string
): T[] => {
  return array.filter(item => item.id !== id);
};

/**
 * Convert bytes to a human-readable string
 * @param bytes The number of bytes
 * @param decimals The number of decimal places to show
 * @returns A formatted string like "1.5 GB"
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Calculate a health percentage based on used and total capacity
 * @param used The amount used
 * @param total The total capacity
 * @returns A health percentage (0-100)
 */
export const calculateHealthPercentage = (
  used: number,
  total: number
): number => {
  const percentage = 100 - (used / total) * 100;
  return Math.max(0, Math.min(100, percentage));
};

/**
 * Determine a health status based on a percentage
 * @param percentage The health percentage (0-100)
 * @returns A status string (critical, warning, healthy)
 */
export const determineHealthStatus = (percentage: number): string => {
  if (percentage < 20) return 'critical';
  if (percentage < 50) return 'warning';
  return 'healthy';
};

/**
 * Generate a timestamp in the past or future
 * @param daysOffset The number of days to offset (negative for past, positive for future)
 * @returns An ISO date string
 */
export const generateTimestamp = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

/**
 * Get the current timestamp
 * @returns The current ISO date string
 */
export const currentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Sort an array by a specified property
 * @param array The array to sort
 * @param property The property to sort by
 * @param ascending Whether to sort in ascending order
 * @returns The sorted array
 */
export const sortByProperty = <T>(
  array: T[],
  property: keyof T,
  ascending: boolean = true
): T[] => {
  return [...array].sort((a, b) => {
    if (a[property] < b[property]) return ascending ? -1 : 1;
    if (a[property] > b[property]) return ascending ? 1 : -1;
    return 0;
  });
};

/**
 * Paginate an array
 * @param array The array to paginate
 * @param page The page number (starting from 1)
 * @param pageSize The number of items per page
 * @returns A paginated array
 */
export const paginateArray = <T>(
  array: T[],
  page: number = 1,
  pageSize: number = 10
): T[] => {
  const startIndex = (page - 1) * pageSize;
  return array.slice(startIndex, startIndex + pageSize);
};

/**
 * Generate mock pagination metadata
 * @param array The full array
 * @param page The current page
 * @param pageSize The page size
 * @returns Pagination metadata
 */
export const generatePaginationMetadata = <T>(
  array: T[],
  page: number = 1,
  pageSize: number = 10
) => {
  const totalItems = array.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasMore: page < totalPages
  };
};
