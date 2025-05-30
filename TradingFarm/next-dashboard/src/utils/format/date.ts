/**
 * Date formatting utilities using date-fns
 * 
 * This utility file centralizes all date formatting functions to ensure
 * consistent date display across the Trading Farm dashboard.
 */

import {
  format,
  formatDistance,
  formatRelative,
  isValid,
  parseISO,
  isDate,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";

/**
 * Converts a date string to a Date object safely
 * @param dateString ISO date string or Date object
 * @returns Date object or null if invalid
 */
export const toDate = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;
  
  if (isDate(dateString)) return dateString as Date;
  
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
    return isValid(date) ? date : null;
  } catch (e) {
    console.error("Invalid date format:", dateString);
    return null;
  }
};

/**
 * Format date to standard date format (e.g., Apr 12, 2025)
 */
export const formatDate = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  return date ? format(date, "MMM d, yyyy") : "Invalid date";
};

/**
 * Format date to standard date-time format (e.g., Apr 12, 2025, 2:30 PM)
 */
export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  return date ? format(date, "MMM d, yyyy, h:mm a") : "Invalid date";
};

/**
 * Format date to ISO date format (e.g., 2025-04-12)
 */
export const formatISODate = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  return date ? format(date, "yyyy-MM-dd") : "Invalid date";
};

/**
 * Format date to relative time (e.g., 2 hours ago, 3 days ago)
 */
export const formatRelativeTime = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  if (!date) return "Invalid date";
  
  const now = new Date();
  
  // Format differently based on how far in the past the date is
  const minutesDiff = differenceInMinutes(now, date);
  const hoursDiff = differenceInHours(now, date);
  const daysDiff = differenceInDays(now, date);
  
  if (minutesDiff < 1) {
    return "Just now";
  } else if (minutesDiff < 60) {
    return `${minutesDiff} ${minutesDiff === 1 ? "minute" : "minutes"} ago`;
  } else if (hoursDiff < 24) {
    return `${hoursDiff} ${hoursDiff === 1 ? "hour" : "hours"} ago`;
  } else if (daysDiff < 7) {
    return `${daysDiff} ${daysDiff === 1 ? "day" : "days"} ago`;
  } else {
    return formatDate(date);
  }
};

/**
 * Format date to short time format (e.g., 2:30 PM)
 */
export const formatTime = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  return date ? format(date, "h:mm a") : "Invalid time";
};

/**
 * Format date for data tables (compact format)
 */
export const formatTableDate = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  return date ? format(date, "MM/dd/yyyy") : "Invalid date";
};

/**
 * Format date range (e.g., Apr 12 - Apr 15, 2025)
 */
export const formatDateRange = (
  startDateString: string | Date | null | undefined,
  endDateString: string | Date | null | undefined
): string => {
  const startDate = toDate(startDateString);
  const endDate = toDate(endDateString);
  
  if (!startDate || !endDate) return "Invalid date range";
  
  // If same year, only show year once
  if (format(startDate, "yyyy") === format(endDate, "yyyy")) {
    return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Format date for form inputs (YYYY-MM-DD)
 */
export const formatForInput = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  return date ? format(date, "yyyy-MM-dd") : "";
};

/**
 * Get relative format with context (e.g., yesterday at 2:30 PM, last Monday at 3:45 PM)
 */
export const formatContextual = (dateString: string | Date | null | undefined): string => {
  const date = toDate(dateString);
  if (!date) return "Invalid date";
  
  return formatRelative(date, new Date());
};

/**
 * Get human-readable duration (e.g., 2 days, 5 hours, 30 minutes)
 */
export const formatDuration = (
  startDateString: string | Date | null | undefined,
  endDateString: string | Date | null | undefined = new Date()
): string => {
  const startDate = toDate(startDateString);
  const endDate = toDate(endDateString);
  
  if (!startDate || !endDate) return "Invalid duration";
  
  return formatDistance(startDate, endDate, { addSuffix: false });
};
