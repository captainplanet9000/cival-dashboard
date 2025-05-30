import {
  format,
  formatDistance,
  formatRelative,
  addDays,
  addMonths,
  addHours,
  addMinutes,
  subDays,
  subMonths,
  subHours,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isSameDay,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  isValid,
  getUnixTime,
  fromUnixTime
} from 'date-fns';
import logger from './logger';

/**
 * Format a date using the specified format string
 * @param date Date to format
 * @param formatStr Format string (default: yyyy-MM-dd HH:mm:ss)
 * @returns Formatted date string
 */
export function formatDate(date: Date | number, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
  try {
    return format(date, formatStr);
  } catch (error: any) {
    logger.error('Error formatting date:', { date, format: formatStr, error: error.message });
    return 'Invalid date';
  }
}

/**
 * Parse an ISO date string to a Date object
 * @param dateStr ISO date string
 * @returns Date object or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      return null;
    }
    return date;
  } catch (error: any) {
    logger.error('Error parsing date:', { dateStr, error: error.message });
    return null;
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date Date to format
 * @param baseDate Base date to compare with (default: now)
 * @returns Formatted relative time
 */
export function formatRelativeTime(date: Date | number, baseDate: Date = new Date()): string {
  try {
    return formatDistance(date, baseDate, { addSuffix: true });
  } catch (error: any) {
    logger.error('Error formatting relative time:', { date, baseDate, error: error.message });
    return 'Invalid date';
  }
}

/**
 * Get date ranges for common time periods
 * @param period Time period (day, week, month, year)
 * @param baseDate Base date (default: now)
 * @returns Object with start and end dates
 */
export function getDateRange(
  period: 'day' | 'week' | 'month' | 'year', 
  baseDate: Date = new Date()
): { start: Date; end: Date } {
  try {
    switch (period) {
      case 'day':
        return {
          start: startOfDay(baseDate),
          end: endOfDay(baseDate),
        };
      case 'week':
        return {
          start: startOfWeek(baseDate),
          end: endOfWeek(baseDate),
        };
      case 'month':
        return {
          start: startOfMonth(baseDate),
          end: endOfMonth(baseDate),
        };
      case 'year':
        return {
          start: new Date(baseDate.getFullYear(), 0, 1),
          end: new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
      default:
        throw new Error(`Invalid period: ${period}`);
    }
  } catch (error: any) {
    logger.error('Error getting date range:', { period, baseDate, error: error.message });
    // Return today as fallback
    return {
      start: startOfDay(baseDate),
      end: endOfDay(baseDate),
    };
  }
}

/**
 * Get date ranges for the last N periods
 * @param period Time period (day, week, month)
 * @param count Number of periods
 * @param baseDate Base date (default: now)
 * @returns Array of objects with start and end dates
 */
export function getLastNPeriods(
  period: 'day' | 'week' | 'month',
  count: number,
  baseDate: Date = new Date()
): Array<{ start: Date; end: Date; label: string }> {
  const result = [];
  let currentDate = baseDate;
  
  for (let i = 0; i < count; i++) {
    const range = getDateRange(period, currentDate);
    let label = '';
    
    switch (period) {
      case 'day':
        label = format(currentDate, 'MMM dd');
        currentDate = subDays(currentDate, 1);
        break;
      case 'week':
        label = `Week of ${format(range.start, 'MMM dd')}`;
        currentDate = subDays(currentDate, 7);
        break;
      case 'month':
        label = format(currentDate, 'MMMM yyyy');
        currentDate = subMonths(currentDate, 1);
        break;
    }
    
    result.push({
      start: range.start,
      end: range.end,
      label,
    });
  }
  
  return result;
}

/**
 * Convert a Date object to Unix timestamp (seconds)
 * @param date Date to convert
 * @returns Unix timestamp in seconds
 */
export function toUnixTimestamp(date: Date = new Date()): number {
  return getUnixTime(date);
}

/**
 * Convert a Unix timestamp to a Date object
 * @param timestamp Unix timestamp in seconds
 * @returns Date object
 */
export function fromUnixTimestamp(timestamp: number): Date {
  try {
    return fromUnixTime(timestamp);
  } catch (error: any) {
    logger.error('Error converting Unix timestamp to Date:', { timestamp, error: error.message });
    return new Date(); // Return current date as fallback
  }
}

/**
 * Check if a date is within a range
 * @param date Date to check
 * @param start Start of range
 * @param end End of range
 * @returns True if the date is within the range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return isWithinInterval(date, { start, end });
}

/**
 * Calculate the difference between two dates in the specified unit
 * @param dateLeft Later date
 * @param dateRight Earlier date
 * @param unit Unit of time (days, hours, minutes, seconds)
 * @returns Difference in the specified unit
 */
export function getDateDiff(
  dateLeft: Date, 
  dateRight: Date, 
  unit: 'days' | 'hours' | 'minutes' | 'seconds'
): number {
  try {
    switch (unit) {
      case 'days':
        return differenceInDays(dateLeft, dateRight);
      case 'hours':
        return differenceInHours(dateLeft, dateRight);
      case 'minutes':
        return differenceInMinutes(dateLeft, dateRight);
      case 'seconds':
        return differenceInSeconds(dateLeft, dateRight);
      default:
        throw new Error(`Invalid unit: ${unit}`);
    }
  } catch (error: any) {
    logger.error('Error calculating date difference:', {
      dateLeft,
      dateRight,
      unit,
      error: error.message,
    });
    return 0;
  }
}

// Export date-fns functions for direct use
export {
  addDays,
  addMonths,
  addHours,
  addMinutes,
  subDays,
  subMonths,
  subHours,
  isSameDay,
  isAfter,
  isBefore,
  isValid,
}; 