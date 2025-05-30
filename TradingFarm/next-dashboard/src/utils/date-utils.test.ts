import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  formatDate, 
  formatRelativeDate, 
  formatForInput, 
  formatDateRange, 
  getTimeDescription, 
  getDaysBetween, 
  isAfterToday, 
  isBeforeToday,
  getMonthStart,
  getMonthEnd,
  getStandardDateRanges,
  formatDeadline,
  DATE_FORMATS
} from './date-utils';
import * as dateFns from 'date-fns';

// Mock all date-fns functions
// Create a more robust mock that handles our test cases
vi.mock('date-fns', async () => {
  return {
    format: vi.fn().mockImplementation((date, format) => '2025-04-10'),
    formatDistanceToNow: vi.fn().mockImplementation(() => '5 days ago'),
    formatDistance: vi.fn().mockImplementation(() => '5 days'),
    parseISO: vi.fn().mockImplementation((dateString) => new Date('2025-04-10')),
    isAfter: vi.fn().mockImplementation(() => false),
    isBefore: vi.fn().mockImplementation(() => true),
    differenceInCalendarDays: vi.fn().mockImplementation(() => 5),
    startOfDay: vi.fn().mockImplementation(() => new Date('2025-04-10')),
    endOfDay: vi.fn().mockImplementation(() => new Date('2025-04-10T23:59:59')),
    startOfMonth: vi.fn().mockImplementation(() => new Date('2025-04-01')),
    endOfMonth: vi.fn().mockImplementation(() => new Date('2025-04-30')),
    subDays: vi.fn().mockImplementation(() => new Date('2025-04-05')),
    addDays: vi.fn().mockImplementation(() => new Date('2025-04-15')),
  };
});

describe('Date Utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('formatDate', () => {
    it('should format a date object with the default format', () => {
      const date = new Date('2025-04-10');
      formatDate(date);
      expect(dateFns.format).toHaveBeenCalledWith(date, DATE_FORMATS.MEDIUM);
    });

    it('should format a date string by parsing it first', () => {
      const dateString = '2025-04-10';
      formatDate(dateString);
      expect(dateFns.parseISO).toHaveBeenCalledWith(dateString);
      expect(dateFns.format).toHaveBeenCalled();
    });

    it('should return an empty string for null or undefined dates', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should use a custom format when provided', () => {
      const date = new Date('2025-04-10');
      formatDate(date, DATE_FORMATS.SHORT);
      expect(dateFns.format).toHaveBeenCalledWith(date, DATE_FORMATS.SHORT);
    });
  });

  describe('formatRelativeDate', () => {
    it('should format a date relative to now', () => {
      const date = new Date('2025-04-10');
      formatRelativeDate(date);
      expect(dateFns.formatDistanceToNow).toHaveBeenCalledWith(date, { addSuffix: true });
    });

    it('should format without suffix when addSuffix is false', () => {
      const date = new Date('2025-04-10');
      formatRelativeDate(date, false);
      expect(dateFns.formatDistanceToNow).toHaveBeenCalledWith(date, { addSuffix: false });
    });

    it('should return empty string for null or undefined dates', () => {
      expect(formatRelativeDate(null)).toBe('');
      expect(formatRelativeDate(undefined)).toBe('');
    });
  });

  describe('formatForInput', () => {
    it('should format a date for input fields without time', () => {
      const date = new Date('2025-04-10');
      formatForInput(date);
      expect(dateFns.format).toHaveBeenCalledWith(date, DATE_FORMATS.INPUT_DATE);
    });

    it('should format a date for input fields with time when includeTime is true', () => {
      const date = new Date('2025-04-10');
      formatForInput(date, true);
      expect(dateFns.format).toHaveBeenCalledWith(date, DATE_FORMATS.INPUT_DATE_TIME);
    });
  });

  describe('formatDateRange', () => {
    it('should format a date range with the default format', () => {
      const startDate = new Date('2025-04-01');
      const endDate = new Date('2025-04-30');
      
      // Mock implementation for this specific test
      vi.mocked(dateFns.format).mockReturnValueOnce('2025-04-10').mockReturnValueOnce('2025-04-10');
      
      const result = formatDateRange(startDate, endDate);
      
      expect(dateFns.format).toHaveBeenCalledTimes(2);
      expect(result).toBe('2025-04-10 - 2025-04-10');
    });

    it('should handle missing dates correctly', () => {
      const startDate = new Date('2025-04-01');
      
      formatDateRange(startDate, null);
      expect(dateFns.format).toHaveBeenCalledTimes(1);
      
      formatDateRange(null, startDate);
      expect(dateFns.format).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTimeDescription', () => {
    it('should describe time until or since a date', () => {
      const date = new Date('2025-04-15');
      getTimeDescription(date);
      
      expect(dateFns.formatDistance).toHaveBeenCalled();
      expect(dateFns.isAfter).toHaveBeenCalled();
    });

    it('should use custom suffixes when provided', () => {
      const date = new Date('2025-04-15');
      
      // Mock implementation to return the expected value
      vi.mocked(dateFns.formatDistance).mockReturnValueOnce('5 days');
      vi.mocked(dateFns.isAfter).mockReturnValueOnce(false);
      
      const result = getTimeDescription(date, 'left', 'passed');
      
      // Since we mocked isAfter to return false, it should use the 'passed' suffix
      expect(result).toBe('5 days passed');
    });
  });

  describe('getDaysBetween', () => {
    it('should calculate days between two dates', () => {
      const startDate = new Date('2025-04-01');
      const endDate = new Date('2025-04-10');
      
      getDaysBetween(startDate, endDate);
      
      expect(dateFns.differenceInCalendarDays).toHaveBeenCalledWith(endDate, startDate);
    });
  });

  describe('date comparison functions', () => {
    it('should check if a date is after today', () => {
      const date = new Date('2025-04-15');
      isAfterToday(date);
      
      expect(dateFns.startOfDay).toHaveBeenCalled();
      expect(dateFns.isAfter).toHaveBeenCalled();
    });

    it('should check if a date is before today', () => {
      const date = new Date('2025-04-05');
      isBeforeToday(date);
      
      expect(dateFns.startOfDay).toHaveBeenCalled();
      expect(dateFns.isBefore).toHaveBeenCalled();
    });
  });

  describe('month functions', () => {
    it('should get the start of a month', () => {
      const date = new Date('2025-04-15');
      getMonthStart(date);
      
      expect(dateFns.startOfMonth).toHaveBeenCalledWith(date);
    });

    it('should get the end of a month', () => {
      const date = new Date('2025-04-15');
      getMonthEnd(date);
      
      expect(dateFns.endOfMonth).toHaveBeenCalledWith(date);
    });
  });

  describe('getStandardDateRanges', () => {
    it('should return an array of standard date ranges', () => {
      const ranges = getStandardDateRanges();
      
      expect(Array.isArray(ranges)).toBe(true);
      expect(ranges.length).toBeGreaterThan(0);
      expect(ranges[0]).toHaveProperty('label');
      expect(ranges[0]).toHaveProperty('startDate');
      expect(ranges[0]).toHaveProperty('endDate');
    });
  });

  describe('formatDeadline', () => {
    it('should format a deadline with status information', () => {
      const date = new Date('2025-04-15');
      
      // Test different scenarios by mocking different day differences
      vi.mocked(dateFns.differenceInCalendarDays).mockReturnValueOnce(-5); // Overdue
      let result = formatDeadline(date);
      expect(result.status).toBe('overdue');
      
      vi.mocked(dateFns.differenceInCalendarDays).mockReturnValueOnce(0); // Due today
      result = formatDeadline(date);
      expect(result.status).toBe('due-today');
      
      vi.mocked(dateFns.differenceInCalendarDays).mockReturnValueOnce(2); // Approaching
      result = formatDeadline(date);
      expect(result.status).toBe('approaching');
      
      vi.mocked(dateFns.differenceInCalendarDays).mockReturnValueOnce(10); // Normal
      result = formatDeadline(date);
      expect(result.status).toBe('normal');
    });

    it('should handle null or undefined dates', () => {
      const result = formatDeadline(null);
      
      expect(result.formattedDate).toBe('No deadline');
      expect(result.status).toBe('none');
    });
  });
});
