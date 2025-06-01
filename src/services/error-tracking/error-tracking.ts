/**
 * Error Tracking Service
 * 
 * A service for tracking errors and exceptions in the application.
 * Provides integration with error tracking services like Sentry,
 * with fallbacks for development environments.
 */

import { MonitoringService } from '../monitoring-service';

interface ErrorTrackingOptions {
  // Whether to enable error tracking
  enabled?: boolean;
  
  // DSN for external error tracking service (e.g., Sentry)
  dsn?: string;
  
  // Environment name (e.g., 'production', 'development')
  environment?: string;
  
  // Release version for tracking
  release?: string;
  
  // Maximum number of breadcrumbs to store
  maxBreadcrumbs?: number;
  
  // Whether to automatically track unhandled errors
  captureUnhandledErrors?: boolean;
  
  // Whether to automatically track unhandled promise rejections
  captureUnhandledRejections?: boolean;
  
  // URL to sample trace
  sampleRate?: number;
  
  // Callback before sending error to determine if it should be sent
  beforeSend?: (error: Error, hint?: any) => Error | null;
}

interface UserInfo {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

interface BreadcrumbData {
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
  timestamp: number;
}

/**
 * Error tracking service for monitoring application errors
 */
export class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private initialized = false;
  private options: ErrorTrackingOptions = {
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV,
    captureUnhandledErrors: true,
    captureUnhandledRejections: true,
    maxBreadcrumbs: 100,
    sampleRate: 1.0
  };
  private breadcrumbs: BreadcrumbData[] = [];
  private externalService: any = null;
  private user: UserInfo | null = null;
  private tags: Record<string, string> = {};
  private globalContext: Record<string, any> = {};
  
  // Error tracking tools types
  private errorTrackingType: 'sentry' | 'custom' | 'none' = 'none';

  private constructor() {
    // Private constructor to enforce singleton
  }

  /**
   * Get the singleton instance of the error tracking service
   */
  public static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  /**
   * Initialize the error tracking service
   * 
   * @param options Configuration options
   */
  public async init(options: ErrorTrackingOptions = {}): Promise<void> {
    if (this.initialized) {
      console.warn('ErrorTrackingService already initialized');
      return;
    }
    
    // Merge options
    this.options = { ...this.options, ...options };
    
    // Skip if disabled
    if (!this.options.enabled) {
      this.errorTrackingType = 'none';
      this.initialized = true;
      return;
    }
    
    // Detect and initialize external service
    if (this.options.dsn && this.options.dsn.includes('sentry.io')) {
      await this.initSentry();
    } else {
      // Use custom/local error tracking
      this.errorTrackingType = 'custom';
      this.setupUnhandledErrorListeners();
    }
    
    this.initialized = true;
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'Error tracking service initialized',
      data: { type: this.errorTrackingType }
    });
  }
  
  /**
   * Initialize Sentry as the error tracking provider
   */
  private async initSentry(): Promise<void> {
    try {
      // Dynamically import Sentry to avoid bundling it unless needed
      const Sentry = await import('@sentry/browser');
      
      Sentry.init({
        dsn: this.options.dsn,
        environment: this.options.environment,
        release: this.options.release,
        maxBreadcrumbs: this.options.maxBreadcrumbs,
        beforeSend: this.options.beforeSend,
        sampleRate: this.options.sampleRate
      });
      
      this.externalService = Sentry;
      this.errorTrackingType = 'sentry';
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      // Fall back to custom error tracking
      this.errorTrackingType = 'custom';
      this.setupUnhandledErrorListeners();
    }
  }
  
  /**
   * Set up listeners for unhandled errors and rejections
   */
  private setupUnhandledErrorListeners(): void {
    if (!this.options.captureUnhandledErrors && !this.options.captureUnhandledRejections) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      // Handle unhandled errors
      if (this.options.captureUnhandledErrors) {
        window.addEventListener('error', (event) => {
          this.captureException(event.error || new Error(event.message));
        });
      }
      
      // Handle unhandled promise rejections
      if (this.options.captureUnhandledRejections) {
        window.addEventListener('unhandledrejection', (event) => {
          let error = event.reason;
          
          // Convert non-error rejection reasons to errors
          if (!(error instanceof Error)) {
            error = new Error(`Unhandled promise rejection: ${String(error)}`);
          }
          
          this.captureException(error);
        });
      }
    }
  }
  
  /**
   * Capture and report an exception
   * 
   * @param error The error to capture
   * @param context Additional context for the error
   * @returns Error ID if available
   */
  public captureException(error: unknown, context: Record<string, any> = {}): string | null {
    // Ensure we have an actual Error object
    if (!(error instanceof Error)) {
      if (typeof error === 'string') {
        error = new Error(error);
      } else {
        error = new Error(`Non-error exception captured: ${JSON.stringify(error)}`);
      }
    }
    
    // Don't track errors if service is disabled
    if (!this.options.enabled || !this.initialized) {
      return null;
    }
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error captured:', error, context);
    }
    
    // Apply beforeSend hook if configured
    if (this.options.beforeSend) {
      const processedError = this.options.beforeSend(error as Error, context);
      if (!processedError) {
        return null; // Error was filtered out by beforeSend
      }
      error = processedError;
    }
    
    // Track with external service if available
    if (this.errorTrackingType === 'sentry' && this.externalService) {
      // Add context data
      const contextData = {
        ...this.globalContext,
        ...context
      };
      
      return this.externalService.captureException(error, {
        contexts: contextData,
        tags: this.tags
      });
    } else {
      // Track with monitoring service as fallback
      MonitoringService.logEvent({
        type: 'error',
        message: (error as Error).message,
        data: {
          error: {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
          },
          context: {
            ...this.globalContext,
            ...context
          },
          tags: this.tags,
          user: this.user
        }
      });
    }
    
    return null;
  }
  
  /**
   * Capture a message for tracking
   * 
   * @param message Message to track
   * @param level Message level (info, warning, error)
   * @param context Additional context
   * @returns Message ID if available
   */
  public captureMessage(
    message: string, 
    level: 'info' | 'warning' | 'error' = 'info',
    context: Record<string, any> = {}
  ): string | null {
    if (!this.options.enabled || !this.initialized) {
      return null;
    }
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console[level](`[${level}] ${message}`, context);
    }
    
    // Track with external service if available
    if (this.errorTrackingType === 'sentry' && this.externalService) {
      return this.externalService.captureMessage(message, {
        level,
        contexts: {
          ...this.globalContext,
          ...context
        },
        tags: this.tags
      });
    } else {
      // Track with monitoring service as fallback
      MonitoringService.logEvent({
        type: level,
        message,
        data: {
          context: {
            ...this.globalContext,
            ...context
          },
          tags: this.tags,
          user: this.user
        }
      });
    }
    
    return null;
  }

  /**
   * Add a breadcrumb to track user actions leading up to an error
   * 
   * @param breadcrumb Breadcrumb data
   */
  public addBreadcrumb(breadcrumb: Omit<BreadcrumbData, 'timestamp'>): void {
    if (!this.options.enabled || !this.initialized) {
      return;
    }
    
    const fullBreadcrumb: BreadcrumbData = {
      ...breadcrumb,
      timestamp: Date.now()
    };
    
    // Add to internal breadcrumb trail
    this.breadcrumbs.push(fullBreadcrumb);
    
    // Limit breadcrumb trail size
    if (this.breadcrumbs.length > (this.options.maxBreadcrumbs || 100)) {
      this.breadcrumbs.shift();
    }
    
    // Record in external service if available
    if (this.errorTrackingType === 'sentry' && this.externalService) {
      this.externalService.addBreadcrumb({
        category: fullBreadcrumb.category,
        message: fullBreadcrumb.message,
        level: fullBreadcrumb.level,
        data: fullBreadcrumb.data,
        timestamp: fullBreadcrumb.timestamp / 1000 // Sentry uses seconds
      });
    }
  }

  /**
   * Set user information for error tracking
   * 
   * @param user User information
   */
  public setUser(user: UserInfo | null): void {
    this.user = user;
    
    // Update in external service if available
    if (this.errorTrackingType === 'sentry' && this.externalService) {
      this.externalService.setUser(user);
    }
  }

  /**
   * Set global tags for error tracking
   * 
   * @param tags Key-value tags
   */
  public setTags(tags: Record<string, string>): void {
    this.tags = { ...this.tags, ...tags };
    
    // Update in external service if available
    if (this.errorTrackingType === 'sentry' && this.externalService) {
      Object.entries(tags).forEach(([key, value]) => {
        this.externalService.setTag(key, value);
      });
    }
  }

  /**
   * Set global context for error tracking
   * 
   * @param name Context name
   * @param context Context data
   */
  public setContext(name: string, context: Record<string, any>): void {
    this.globalContext[name] = context;
    
    // Update in external service if available
    if (this.errorTrackingType === 'sentry' && this.externalService) {
      this.externalService.setContext(name, context);
    }
  }
  
  /**
   * Get the current breadcrumb trail
   */
  public getBreadcrumbs(): BreadcrumbData[] {
    return [...this.breadcrumbs];
  }
  
  /**
   * Get the current error tracking type
   */
  public getErrorTrackingType(): 'sentry' | 'custom' | 'none' {
    return this.errorTrackingType;
  }
  
  /**
   * Check if the error tracking service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const errorTracking = ErrorTrackingService.getInstance(); 