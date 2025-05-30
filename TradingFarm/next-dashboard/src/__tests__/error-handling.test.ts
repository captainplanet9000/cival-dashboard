import {
  handleSupabaseError,
  handleApiError,
  formatErrorMessage,
  categorizeError,
  ErrorCategory,
  TradingFarmError
} from '@/utils/error-handling';
import { PostgrestError } from '@supabase/supabase-js';

describe('Error Handling Utilities', () => {
  describe('categorizeError', () => {
    test('categorizes authentication errors correctly', () => {
      const authError = new Error('Invalid JWT token');
      const result = categorizeError(authError, 'Authentication failed');
      
      expect(result.category).toBe(ErrorCategory.AUTH);
      expect(result.message).toContain('Authentication failed');
    });
    
    test('categorizes database errors correctly', () => {
      const dbError = new Error('relation "farms" does not exist');
      const result = categorizeError(dbError, 'Database operation failed');
      
      expect(result.category).toBe(ErrorCategory.DATABASE);
      expect(result.message).toContain('Database operation failed');
    });
    
    test('categorizes network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const result = categorizeError(networkError, 'Network request failed');
      
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.message).toContain('Network request failed');
    });
    
    test('categorizes validation errors correctly', () => {
      const validationError = new Error('Invalid input');
      validationError.name = 'ValidationError';
      const result = categorizeError(validationError, 'Validation failed');
      
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.message).toContain('Validation failed');
    });
    
    test('defaults to UNKNOWN category for unrecognized errors', () => {
      const unknownError = new Error('Something unexpected happened');
      const result = categorizeError(unknownError, 'Unknown error');
      
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.message).toContain('Unknown error');
    });
  });
  
  describe('formatErrorMessage', () => {
    test('formats error with user-friendly message', () => {
      const error = new Error('PGERROR: relation "farms" does not exist');
      const message = formatErrorMessage(error, 'Failed to fetch farm data');
      
      expect(message).toContain('Failed to fetch farm data');
      expect(message).toContain('Database error');
    });
    
    test('includes error code when available', () => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      const message = formatErrorMessage(error, 'Could not find resource');
      
      expect(message).toContain('Could not find resource');
      expect(message).toContain('404');
    });
    
    test('handles null or undefined errors', () => {
      const message1 = formatErrorMessage(null, 'Default message');
      const message2 = formatErrorMessage(undefined, 'Default message');
      
      expect(message1).toBe('Default message');
      expect(message2).toBe('Default message');
    });
  });
  
  describe('handleSupabaseError', () => {
    test('handles PostgrestError correctly', () => {
      const postgrestError: PostgrestError = {
        message: 'JWT expired',
        details: 'Token has expired',
        hint: 'Refresh your token',
        code: 'PGRST301'
      };
      
      const message = handleSupabaseError(postgrestError, 'Failed to fetch data');
      
      expect(message).toContain('Failed to fetch data');
      expect(message).toContain('Authentication error');
    });
    
    test('handles generic Error objects', () => {
      const error = new Error('Network connection failed');
      const message = handleSupabaseError(error, 'Could not connect to database');
      
      expect(message).toContain('Could not connect to database');
    });
    
    test('returns default message for null/undefined errors', () => {
      const message = handleSupabaseError(null, 'Unknown database error');
      expect(message).toBe('Unknown database error');
    });
  });
  
  describe('handleApiError', () => {
    test('handles Response objects with status codes', () => {
      const response = {
        status: 403,
        statusText: 'Forbidden',
        json: jest.fn().mockResolvedValue({ message: 'Access denied' })
      } as unknown as Response;
      
      const message = handleApiError(response, 'API request failed');
      expect(message).toContain('API request failed');
      expect(message).toContain('403');
    });
    
    test('handles Error objects', () => {
      const error = new Error('Network connection failed');
      const message = handleApiError(error, 'API connection failed');
      
      expect(message).toContain('API connection failed');
    });
    
    test('returns default message for null/undefined errors', () => {
      const message = handleApiError(null, 'Unknown API error');
      expect(message).toBe('Unknown API error');
    });
  });
  
  describe('TradingFarmError', () => {
    test('constructs with all properties', () => {
      const error = new TradingFarmError(
        'Something went wrong',
        ErrorCategory.API,
        'API_ERROR_001',
        { userId: '123' }
      );
      
      expect(error.message).toBe('Something went wrong');
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.code).toBe('API_ERROR_001');
      expect(error.context).toEqual({ userId: '123' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });
    
    test('has a working toString method', () => {
      const error = new TradingFarmError(
        'Data fetch failed',
        ErrorCategory.DATABASE
      );
      
      const errorString = error.toString();
      expect(errorString).toContain('Data fetch failed');
      expect(errorString).toContain('DATABASE');
    });
  });
});
