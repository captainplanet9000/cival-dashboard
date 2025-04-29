/**
 * Type Utilities
 * Contains helper functions and type definitions to improve type safety across the application
 */

/**
 * A generic function to assert that a value is not null or undefined
 * @param value - The value to check
 * @param message - Optional error message
 * @returns The value if it's not null or undefined
 * @throws Error if the value is null or undefined
 */
export function assertNonNullable<T>(
  value: T,
  message: string = 'Value is null or undefined'
): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value as NonNullable<T>;
}

/**
 * A type guard to check if a value is not null or undefined
 * @param value - The value to check
 * @returns true if the value is not null or undefined
 */
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * A utility type that makes all properties of an object optional and possibly null/undefined
 */
export type Partial<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};

/**
 * A utility type that makes specific properties of an object required
 */
export type RequiredProps<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

/**
 * A utility type that picks specific properties from an object and makes them required
 */
export type PickRequired<T, K extends keyof T> = Pick<T, K> & {
  [P in K]-?: T[P];
};

/**
 * A utility type that removes specific properties from an object
 */
export type OmitProps<T, K extends keyof T> = Omit<T, K>;

/**
 * A utility type for response data
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  total?: number;
}

/**
 * A utility function to create a type-safe API response
 * @param data - The data to include in the response
 * @param error - Optional error message
 * @param message - Optional success message
 * @param count - Optional count for pagination
 * @param total - Optional total for pagination
 * @returns A type-safe API response object
 */
export function createApiResponse<T>({
  data,
  error,
  message,
  count,
  total,
}: Partial<ApiResponse<T>>): ApiResponse<T> {
  return {
    data,
    error,
    message,
    count,
    total,
  };
}

/**
 * A utility function to create a success API response
 * @param data - The data to include in the response
 * @param message - Optional success message
 * @param count - Optional count for pagination
 * @param total - Optional total for pagination
 * @returns A type-safe API response object
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Success',
  count?: number,
  total?: number
): ApiResponse<T> {
  return {
    data,
    message,
    count,
    total,
  };
}

/**
 * A utility function to create an error API response
 * @param error - The error message
 * @returns A type-safe API response object
 */
export function createErrorResponse<T>(error: string): ApiResponse<T> {
  return {
    error,
  };
}

/**
 * A utility type for paginated API parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  perPage?: number;
}

/**
 * A utility function to convert page-based pagination to offset-based pagination
 * @param page - The page number (1-indexed)
 * @param perPage - The number of items per page
 * @returns Offset and limit values
 */
export function pageToOffset(page: number = 1, perPage: number = 10): { offset: number; limit: number } {
  const sanitizedPage = Math.max(1, page);
  const sanitizedPerPage = Math.max(1, perPage);
  return {
    offset: (sanitizedPage - 1) * sanitizedPerPage,
    limit: sanitizedPerPage,
  };
}

/**
 * A utility function to convert offset-based pagination to page-based pagination
 * @param offset - The offset
 * @param limit - The limit
 * @returns Page and perPage values
 */
export function offsetToPage(offset: number = 0, limit: number = 10): { page: number; perPage: number } {
  const sanitizedOffset = Math.max(0, offset);
  const sanitizedLimit = Math.max(1, limit);
  return {
    page: Math.floor(sanitizedOffset / sanitizedLimit) + 1,
    perPage: sanitizedLimit,
  };
}

/**
 * A utility function to handle API errors in a consistent way
 * @param error - The error object
 * @returns A normalized error message
 */
export function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * A utility type for handlers that may return a Promise
 */
export type AsyncHandler<T, R> = (arg: T) => Promise<R> | R;

/**
 * A utility function to safely execute a function and handle errors
 * @param fn - The function to execute
 * @param fallback - The fallback value to return if an error occurs
 * @param errorHandler - Optional custom error handler
 * @returns The result of the function or the fallback value
 */
export async function safeFetch<T, R>(
  fn: AsyncHandler<T, R>,
  arg: T,
  fallback: R,
  errorHandler?: (error: unknown) => void
): Promise<R> {
  try {
    return await fn(arg);
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Error executing function:', error);
    }
    return fallback;
  }
}

/**
 * A utility function to debounce a function
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * A utility function to throttle a function
 * @param fn - The function to throttle
 * @param limit - The limit in milliseconds
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall >= limit) {
      lastCallTime = now;
      fn.apply(this, args);
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        fn.apply(this, args);
        timeoutId = null;
      }, limit - timeSinceLastCall);
    }
  };
}
