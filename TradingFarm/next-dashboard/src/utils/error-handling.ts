/**
 * Trading Farm Dashboard Error Handling Utilities
 * 
 * Provides standardized error handling for API and database operations
 */

import { PostgrestError } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';

// Error types
export enum ErrorSource {
  Database = 'database',
  API = 'api',
  Authentication = 'auth',
  Network = 'network',
  Validation = 'validation',
  Unknown = 'unknown'
}

// Error categories
export enum ErrorCategory {
  Connection = 'connection',
  Permission = 'permission',
  NotFound = 'not_found',
  Validation = 'validation',
  Timeout = 'timeout',
  Server = 'server',
  Client = 'client',
  Authentication = 'authentication',
  Unknown = 'unknown'
}

export interface AppError {
  message: string;
  source: ErrorSource;
  category: ErrorCategory;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: Date;
  handled: boolean;
}

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  throwError?: boolean;
  contextData?: Record<string, any>;
}

const defaultOptions: ErrorHandlingOptions = {
  showToast: true,
  logToConsole: true,
  throwError: false,
  contextData: {},
};

/**
 * Process a Supabase error
 */
export function handleSupabaseError(
  error: PostgrestError | Error | null | unknown,
  userMessage: string = 'An error occurred while accessing the database',
  options: ErrorHandlingOptions = defaultOptions
): AppError {
  const opts = { ...defaultOptions, ...options };
  let appError: AppError;

  if (!error) {
    appError = {
      message: userMessage,
      source: ErrorSource.Unknown,
      category: ErrorCategory.Unknown,
      originalError: null,
      context: opts.contextData,
      timestamp: new Date(),
      handled: false,
    };
  } else if (isPostgrestError(error)) {
    // Handle Supabase specific error
    appError = {
      message: getUserFriendlyDbMessage(error, userMessage),
      source: ErrorSource.Database,
      category: categorizeDatabaseError(error),
      originalError: error,
      context: opts.contextData,
      timestamp: new Date(),
      handled: false,
    };
  } else {
    // Handle generic error
    const genericError = error as Error;
    appError = {
      message: userMessage,
      source: ErrorSource.Unknown,
      category: ErrorCategory.Unknown,
      originalError: genericError,
      context: opts.contextData,
      timestamp: new Date(),
      handled: false,
    };
  }

  // Handle the error according to options
  if (opts.logToConsole) {
    console.error(`[${appError.source.toUpperCase()}] ${appError.message}`, {
      error: appError.originalError,
      context: appError.context,
    });
  }

  if (opts.showToast) {
    toast({
      title: getErrorTitle(appError),
      description: appError.message,
      variant: "destructive",
    });
  }

  appError.handled = true;

  if (opts.throwError) {
    throw appError;
  }

  return appError;
}

/**
 * Handle API errors (fetch, axios, etc.)
 */
export function handleApiError(
  error: Error | Response | unknown,
  userMessage: string = 'An error occurred while connecting to the service',
  options: ErrorHandlingOptions = defaultOptions
): AppError {
  const opts = { ...defaultOptions, ...options };
  let appError: AppError;

  if (error instanceof Response) {
    // Handle fetch API Response object
    appError = {
      message: getUserFriendlyApiMessage(error, userMessage),
      source: ErrorSource.API,
      category: categorizeApiError(error),
      originalError: error,
      context: { 
        status: error.status,
        statusText: error.statusText,
        ...opts.contextData 
      },
      timestamp: new Date(),
      handled: false,
    };
  } else if (error instanceof Error) {
    // Handle standard Error object
    appError = {
      message: userMessage,
      source: ErrorSource.API,
      category: ErrorCategory.Unknown,
      originalError: error,
      context: opts.contextData,
      timestamp: new Date(),
      handled: false,
    };
  } else {
    // Handle unknown error
    appError = {
      message: userMessage,
      source: ErrorSource.Unknown,
      category: ErrorCategory.Unknown,
      originalError: error,
      context: opts.contextData,
      timestamp: new Date(),
      handled: false,
    };
  }

  // Handle the error according to options
  if (opts.logToConsole) {
    console.error(`[${appError.source.toUpperCase()}] ${appError.message}`, {
      error: appError.originalError,
      context: appError.context,
    });
  }

  if (opts.showToast) {
    toast({
      title: getErrorTitle(appError),
      description: appError.message,
      variant: "destructive",
    });
  }

  appError.handled = true;

  if (opts.throwError) {
    throw appError;
  }

  return appError;
}

/**
 * Handle authentication errors
 */
export function handleAuthError(
  error: Error | unknown,
  userMessage: string = 'Authentication error occurred',
  options: ErrorHandlingOptions = defaultOptions
): AppError {
  const opts = { ...defaultOptions, ...options };
  const appError: AppError = {
    message: userMessage,
    source: ErrorSource.Authentication,
    category: ErrorCategory.Authentication,
    originalError: error,
    context: opts.contextData,
    timestamp: new Date(),
    handled: false,
  };

  // Handle the error according to options
  if (opts.logToConsole) {
    console.error(`[${appError.source.toUpperCase()}] ${appError.message}`, {
      error: appError.originalError,
      context: appError.context,
    });
  }

  if (opts.showToast) {
    toast({
      title: 'Authentication Error',
      description: appError.message,
      variant: "destructive",
    });
  }

  appError.handled = true;

  if (opts.throwError) {
    throw appError;
  }

  return appError;
}

// Helper functions

/**
 * Type guard for PostgrestError
 */
function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}

/**
 * Get user-friendly error message for database errors
 */
function getUserFriendlyDbMessage(error: PostgrestError, fallback: string): string {
  if (error.code === '23505') {
    return 'This record already exists. Please try a different entry.';
  }
  
  if (error.code === '23503') {
    return 'Cannot complete this operation because it references data that doesn\'t exist.';
  }
  
  if (error.code === '42P01') {
    return 'The requested data could not be accessed. Please contact support.';
  }
  
  if (error.code === '42501') {
    return 'You don\'t have permission to perform this action.';
  }
  
  if (error.code === '28000') {
    return 'Your session has expired. Please log in again.';
  }
  
  // If we don't have a specific message, use the general message or fallback
  return error.message || fallback;
}

/**
 * Get user-friendly error message for API errors
 */
function getUserFriendlyApiMessage(response: Response, fallback: string): string {
  if (response.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (response.status === 403) {
    return 'You don\'t have permission to access this resource.';
  }
  
  if (response.status === 404) {
    return 'The requested resource was not found.';
  }
  
  if (response.status === 429) {
    return 'Too many requests. Please try again later.';
  }
  
  if (response.status >= 500) {
    return 'The server encountered an error. Please try again later.';
  }
  
  return fallback;
}

/**
 * Categorize database error
 */
function categorizeDatabaseError(error: PostgrestError): ErrorCategory {
  // Permission errors
  if (error.code === '42501' || error.code === '28000') {
    return ErrorCategory.Permission;
  }
  
  // Validation errors
  if (error.code?.startsWith('23')) {
    return ErrorCategory.Validation;
  }
  
  // Table or relation not found
  if (error.code === '42P01') {
    return ErrorCategory.NotFound;
  }
  
  // Authentication errors
  if (error.code === 'JWTInvalidSignature' || error.code === 'JWTTokenExpired') {
    return ErrorCategory.Authentication;
  }
  
  // Default to server error
  return ErrorCategory.Server;
}

/**
 * Categorize API error
 */
function categorizeApiError(response: Response): ErrorCategory {
  if (response.status === 401 || response.status === 403) {
    return ErrorCategory.Authentication;
  }
  
  if (response.status === 404) {
    return ErrorCategory.NotFound;
  }
  
  if (response.status === 408 || response.status === 504) {
    return ErrorCategory.Timeout;
  }
  
  if (response.status === 422) {
    return ErrorCategory.Validation;
  }
  
  if (response.status >= 500) {
    return ErrorCategory.Server;
  }
  
  return ErrorCategory.Client;
}

/**
 * Get error title based on category
 */
function getErrorTitle(error: AppError): string {
  switch (error.category) {
    case ErrorCategory.Authentication:
      return 'Authentication Error';
    case ErrorCategory.Connection:
      return 'Connection Error';
    case ErrorCategory.NotFound:
      return 'Not Found';
    case ErrorCategory.Permission:
      return 'Permission Denied';
    case ErrorCategory.Server:
      return 'Server Error';
    case ErrorCategory.Timeout:
      return 'Request Timeout';
    case ErrorCategory.Validation:
      return 'Validation Error';
    default:
      return 'Error';
  }
}
