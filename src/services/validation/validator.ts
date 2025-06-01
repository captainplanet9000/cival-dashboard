import { ZodError, ZodSchema, z } from 'zod';
import { MonitoringService } from '../monitoring-service';

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
}

/**
 * Validation service for API responses and data
 */
export class ValidationService {
  /**
   * Validate data against a schema
   * 
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns Validation result with parsed data or errors
   */
  public static validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const validData = schema.parse(data);
      return {
        success: true,
        data: validData
      };
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err: z.ZodIssue) => {
          const path = err.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path].push(err.message);
        });
        
        // Log validation errors
        MonitoringService.logEvent({
          type: 'warning',
          message: 'API response validation failed',
          data: { errors: formattedErrors }
        });
        
        return {
          success: false,
          errors: formattedErrors,
          message: 'Validation failed'
        };
      }
      
      // Handle unknown errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      
      MonitoringService.logEvent({
        type: 'error',
        message: 'Unexpected validation error',
        data: { error: errorMessage }
      });
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }
  
  /**
   * Assert that data conforms to a schema, throws on validation failure
   * 
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @param errorMessage - Custom error message on failure
   * @returns Parsed data that matches the schema
   * @throws Error if validation fails
   */
  public static assert<T>(
    schema: ZodSchema<T>, 
    data: unknown, 
    errorMessage = 'Data validation failed'
  ): T {
    try {
      return schema.parse(data);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`${errorMessage}: ${details}`);
      }
      throw error;
    }
  }
  
  /**
   * Safe parse without throwing, returns null on validation failure
   * 
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns Parsed data or null if validation fails
   */
  public static safeParse<T>(schema: ZodSchema<T>, data: unknown): T | null {
    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    
    // Log validation errors
    MonitoringService.logEvent({
      type: 'warning',
      message: 'API response validation failed',
      data: { errors: result.error.format() }
    });
    
    return null;
  }
} 