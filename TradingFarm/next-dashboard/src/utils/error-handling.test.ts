import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  handleSupabaseError, 
  handleApiError, 
  handleAuthError,
  ErrorSource,
  ErrorCategory
} from './error-handling';

// Mock the toast function
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

// Import the mocked toast
import { toast } from '@/components/ui/use-toast';

describe('Error Handling Utilities', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });
  
  describe('handleSupabaseError', () => {
    it('should handle PostgrestError correctly', () => {
      // Create a mock PostgrestError
      const mockError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: 'Key (email)=(test@example.com) already exists',
        hint: ''
      };
      
      const result = handleSupabaseError(mockError, 'Failed to create user');
      
      // Check that the error was processed correctly
      expect(result.source).toBe(ErrorSource.Database);
      expect(result.category).toBe(ErrorCategory.Validation);
      expect(result.originalError).toBe(mockError);
      expect(result.handled).toBe(true);
      
      // Verify that toast was called
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        variant: 'destructive'
      }));
      
      // Verify that console.error was called
      expect(console.error).toHaveBeenCalledTimes(1);
    });
    
    it('should use fallback message when error is null', () => {
      const userMessage = 'Error accessing database';
      const result = handleSupabaseError(null, userMessage);
      
      expect(result.message).toBe(userMessage);
      expect(result.source).toBe(ErrorSource.Unknown);
    });
    
    it('should not show toast when option is disabled', () => {
      const mockError = { code: '42501', message: 'permission denied' };
      
      handleSupabaseError(mockError, 'Access denied', { showToast: false });
      
      // Verify toast was not called
      expect(toast).not.toHaveBeenCalled();
      
      // But console.error should still be called
      expect(console.error).toHaveBeenCalledTimes(1);
    });
    
    it('should throw error when throwError is true', () => {
      const mockError = { code: '42501', message: 'permission denied' };
      
      expect(() => {
        handleSupabaseError(mockError, 'Access denied', { throwError: true });
      }).toThrow();
    });
    
    it('should include context data in the error object', () => {
      const contextData = { userId: '123', action: 'create' };
      const mockError = { code: '23503', message: 'foreign key violation' };
      
      const result = handleSupabaseError(mockError, 'Database error', { contextData });
      
      expect(result.context).toEqual(contextData);
    });
  });
  
  describe('handleApiError', () => {
    it('should handle fetch Response objects correctly', () => {
      // Create a mock Response
      const mockResponse = {
        status: 404,
        statusText: 'Not Found'
      } as Response;
      
      const result = handleApiError(mockResponse, 'Resource not found');
      
      expect(result.source).toBe(ErrorSource.API);
      expect(result.category).toBe(ErrorCategory.NotFound);
      expect(result.originalError).toBe(mockResponse);
      expect(result.context).toHaveProperty('status', 404);
      expect(result.handled).toBe(true);
      
      // Verify toast
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Not Found'
      }));
    });
    
    it('should handle standard Error objects', () => {
      const mockError = new Error('Network failure');
      
      const result = handleApiError(mockError, 'Connection problem');
      
      expect(result.source).toBe(ErrorSource.API);
      expect(result.originalError).toBe(mockError);
      expect(result.handled).toBe(true);
      
      // Verify console and toast
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledTimes(1);
    });
    
    it('should categorize API errors based on status code', () => {
      // Test various status codes
      const statusCodes = [
        { code: 401, category: ErrorCategory.Authentication },
        { code: 403, category: ErrorCategory.Authentication },
        { code: 404, category: ErrorCategory.NotFound },
        { code: 408, category: ErrorCategory.Timeout },
        { code: 422, category: ErrorCategory.Validation },
        { code: 500, category: ErrorCategory.Server }
      ];
      
      statusCodes.forEach(({ code, category }) => {
        const mockResponse = { status: code, statusText: 'Test' } as Response;
        const result = handleApiError(mockResponse, 'API error');
        
        expect(result.category).toBe(category);
      });
    });
  });
  
  describe('handleAuthError', () => {
    it('should handle authentication errors with correct source and category', () => {
      const mockError = new Error('JWT expired');
      
      const result = handleAuthError(mockError, 'Session expired');
      
      expect(result.source).toBe(ErrorSource.Authentication);
      expect(result.category).toBe(ErrorCategory.Authentication);
      expect(result.originalError).toBe(mockError);
      expect(result.handled).toBe(true);
      
      // Verify toast has appropriate title
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Authentication Error'
      }));
    });
    
    it('should not console.log when logToConsole is false', () => {
      const mockError = new Error('Auth error');
      
      handleAuthError(mockError, 'Auth failed', { logToConsole: false });
      
      // Verify console.error wasn't called
      expect(console.error).not.toHaveBeenCalled();
      
      // But toast should still be called
      expect(toast).toHaveBeenCalledTimes(1);
    });
  });
});
