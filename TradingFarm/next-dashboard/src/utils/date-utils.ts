import {
  format,
  formatDistanceToNow,
  formatRelative,
  formatDistance,
  isAfter,
  isBefore,
  isEqual,
  isFuture,
  isPast,
  parseISO,
  differenceInDays,
  differenceInMonths,
  differenceInCalendarDays,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

/**
 * Standard date formats used throughout the application
 */
export const DATE_FORMATS = {
  // For display
  SHORT: 'MM/dd/yyyy',
  MEDIUM: 'MMM d, yyyy',
  FULL: 'MMMM d, yyyy',
  WITH_DAY: 'EEE, MMMM d, yyyy',
  WITH_TIME: 'MMM d, yyyy h:mm a',
  WITH_TIME_SECONDS: 'MMM d, yyyy h:mm:ss a',
  TIME_ONLY: 'h:mm a',
  TIME_WITH_SECONDS: 'h:mm:ss a',
  YEAR_MONTH: 'MMMM yyyy',
  
  // ISO formats
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATE_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  
  // For forms and inputs
  INPUT_DATE: 'yyyy-MM-dd',
  INPUT_DATE_TIME: "yyyy-MM-dd'T'HH:mm",
};

/**
 * Format a date using a standard format
 * @param dateInput Date object or ISO string
 * @param formatStr Format to use from DATE_FORMATS or custom format
 * @returns Formatted date string
 */
export function formatDate(
  dateInput: Date | string | null | undefined,
  formatStr: string = DATE_FORMATS.MEDIUM
): string {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  
  try {
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a date relative to now (e.g., "2 days ago")
 * @param dateInput Date object or ISO string
 * @param addSuffix Whether to add a suffix (default: true)
 * @returns Relative date string
 */
export function formatRelativeDate(
  dateInput: Date | string | null | undefined,
  addSuffix = true
): string {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  
  try {
    return formatDistanceToNow(date, { addSuffix });
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '';
  }
}

/**
 * Format date for inputs (ISO format for HTML input elements)
 * @param dateInput Date object or ISO string
 * @param includeTime Whether to include time (default: false)
 * @returns ISO formatted date string
 */
export function formatForInput(
  dateInput: Date | string | null | undefined,
  includeTime = false
): string {
  if (!dateInput) return '';
  
  const format = includeTime ? DATE_FORMATS.INPUT_DATE_TIME : DATE_FORMATS.INPUT_DATE;
  return formatDate(dateInput, format);
}

/**
 * Format date range as a string
 * @param startDate Start date
 * @param endDate End date
 * @param format Format to use
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  format: string = DATE_FORMATS.MEDIUM
): string {
  if (!startDate || !endDate) {
    return formatDate(startDate || endDate, format);
  }
  
  return `${formatDate(startDate, format)} - ${formatDate(endDate, format)}`;
}

/**
 * Get a user-friendly description of time until or since a date
 * @param dateInput Date to calculate time until/since
 * @param futureSuffix Text to use for future dates (default: 'remaining')
 * @param pastSuffix Text to use for past dates (default: 'ago')
 * @returns Formatted time description
 */
export function getTimeDescription(
  dateInput: Date | string | null | undefined,
  futureSuffix = 'remaining',
  pastSuffix = 'ago'
): string {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  const now = new Date();
  
  try {
    const isFutureDate = isAfter(date, now);
    const distance = formatDistance(date, now);
    
    return isFutureDate ? `${distance} ${futureSuffix}` : `${distance} ${pastSuffix}`;
  } catch (error) {
    console.error('Error getting time description:', error);
    return '';
  }
}

/**
 * Calculate the number of days between two dates
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of days
 */
export function getDaysBetween(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  return differenceInCalendarDays(end, start);
}

/**
 * Check if a date is after today
 * @param dateInput Date to check
 * @returns Boolean indicating if date is after today
 */
export function isAfterToday(dateInput: Date | string | null | undefined): boolean {
  if (!dateInput) return false;
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  const today = startOfDay(new Date());
  
  return isAfter(date, today);
}

/**
 * Check if a date is before today
 * @param dateInput Date to check
 * @returns Boolean indicating if date is before today
 */
export function isBeforeToday(dateInput: Date | string | null | undefined): boolean {
  if (!dateInput) return false;
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  const today = startOfDay(new Date());
  
  return isBefore(date, today);
}

/**
 * Get date object for the beginning of a month
 * @param dateInput Date within the month
 * @returns Date object for start of month
 */
export function getMonthStart(dateInput: Date | string | null | undefined): Date {
  if (!dateInput) return startOfMonth(new Date());
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return startOfMonth(date);
}

/**
 * Get date object for the end of a month
 * @param dateInput Date within the month
 * @returns Date object for end of month
 */
export function getMonthEnd(dateInput: Date | string | null | undefined): Date {
  if (!dateInput) return endOfMonth(new Date());
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return endOfMonth(date);
}

/**
 * Get an array of standard date ranges for filtering
 * @returns Array of date range objects with label and dates
 */
export function getStandardDateRanges() {
  const today = new Date();
  
  return [
    {
      label: 'Today',
      startDate: startOfDay(today),
      endDate: endOfDay(today),
    },
    {
      label: 'Yesterday',
      startDate: startOfDay(subDays(today, 1)),
      endDate: endOfDay(subDays(today, 1)),
    },
    {
      label: 'Last 7 Days',
      startDate: startOfDay(subDays(today, 6)),
      endDate: endOfDay(today),
    },
    {
      label: 'Last 30 Days',
      startDate: startOfDay(subDays(today, 29)),
      endDate: endOfDay(today),
    },
    {
      label: 'This Month',
      startDate: startOfMonth(today),
      endDate: endOfMonth(today),
    },
    {
      label: 'Last Month',
      startDate: startOfMonth(subDays(startOfMonth(today), 1)),
      endDate: endOfMonth(subDays(startOfMonth(today), 1)),
    },
  ];
}

/**
 * Format a deadline with appropriate styling information
 * @param dateInput Deadline date
 * @returns Object with formatted date and status information
 */
export function formatDeadline(dateInput: Date | string | null | undefined) {
  if (!dateInput) return { formattedDate: 'No deadline', status: 'none' };
  
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  const now = new Date();
  const daysRemaining = differenceInCalendarDays(date, now);
  
  let status = 'normal';
  let description = '';
  
  if (daysRemaining < 0) {
    status = 'overdue';
    description = `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
  } else if (daysRemaining === 0) {
    status = 'due-today';
    description = 'Due today';
  } else if (daysRemaining <= 3) {
    status = 'approaching';
    description = `Due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
  } else {
    description = formatRelativeDate(date);
  }
  
  return {
    formattedDate: formatDate(date),
    status,
    description,
    daysRemaining,
  };
}
