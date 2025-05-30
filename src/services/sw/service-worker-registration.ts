/**
 * Service Worker Registration
 * 
 * Provides utilities for registering, updating, and managing service workers
 */

import { MonitoringService } from '../monitoring-service';

/**
 * Service worker registration options
 */
interface ServiceWorkerRegistrationOptions {
  // Path to service worker script
  swPath?: string;
  
  // Scope for the service worker
  scope?: string;
  
  // Whether to enable debug logging
  debug?: boolean;
  
  // Whether to register immediately
  autoRegister?: boolean;
  
  // Callback when service worker is installed
  onInstalled?: (registration: ServiceWorkerRegistration) => void;
  
  // Callback when service worker is updated
  onUpdated?: (registration: ServiceWorkerRegistration) => void;
  
  // Callback when there is a service worker error
  onError?: (error: Error) => void;
  
  // Callback when service worker is controlling the page
  onControlling?: (registration: ServiceWorkerRegistration) => void;
}

/**
 * Service worker registration status
 */
export enum ServiceWorkerStatus {
  UNREGISTERED = 'UNREGISTERED',
  REGISTERED = 'REGISTERED',
  UPDATED = 'UPDATED',
  REDUNDANT = 'REDUNDANT',
  ERROR = 'ERROR'
}

/**
 * Service worker registration manager
 */
export class ServiceWorkerRegistration {
  private static instance: ServiceWorkerRegistration;
  private registration: ServiceWorkerRegistration | null = null;
  private status: ServiceWorkerStatus = ServiceWorkerStatus.UNREGISTERED;
  private options: ServiceWorkerRegistrationOptions;
  
  private constructor(options: ServiceWorkerRegistrationOptions = {}) {
    this.options = {
      swPath: '/service-worker.js',
      scope: '/',
      debug: process.env.NODE_ENV === 'development',
      autoRegister: process.env.NODE_ENV === 'production',
      ...options
    };
    
    if (this.options.autoRegister) {
      this.register();
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(options?: ServiceWorkerRegistrationOptions): ServiceWorkerRegistration {
    if (!ServiceWorkerRegistration.instance) {
      ServiceWorkerRegistration.instance = new ServiceWorkerRegistration(options);
    } else if (options) {
      // Update options
      ServiceWorkerRegistration.instance.options = {
        ...ServiceWorkerRegistration.instance.options,
        ...options
      };
    }
    
    return ServiceWorkerRegistration.instance;
  }
  
  /**
   * Check if service workers are supported
   */
  public isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }
  
  /**
   * Register the service worker
   */
  public async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      this.logMessage('Service workers are not supported in this browser', 'warning');
      return null;
    }
    
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register(
        this.options.swPath!,
        { scope: this.options.scope }
      );
      
      this.registration = registration;
      this.status = ServiceWorkerStatus.REGISTERED;
      
      this.logMessage('Service worker registered', 'info', {
        scope: registration.scope,
        state: registration.active?.state
      });
      
      // Set up event listeners
      this.addEventListeners(registration);
      
      return registration;
    } catch (error) {
      this.status = ServiceWorkerStatus.ERROR;
      
      this.logMessage('Service worker registration failed', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (this.options.onError && error instanceof Error) {
        this.options.onError(error);
      }
      
      return null;
    }
  }
  
  /**
   * Update the service worker
   */
  public async update(): Promise<boolean> {
    if (!this.registration) {
      this.logMessage('No service worker registration to update', 'warning');
      return false;
    }
    
    try {
      // Update service worker
      const updated = await this.registration.update();
      
      this.logMessage('Service worker update attempted', 'info', {
        updated: !!updated,
        state: this.registration.active?.state
      });
      
      return !!updated;
    } catch (error) {
      this.logMessage('Service worker update failed', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (this.options.onError && error instanceof Error) {
        this.options.onError(error);
      }
      
      return false;
    }
  }
  
  /**
   * Unregister the service worker
   */
  public async unregister(): Promise<boolean> {
    if (!this.registration) {
      this.logMessage('No service worker registration to unregister', 'warning');
      return false;
    }
    
    try {
      // Unregister service worker
      const result = await this.registration.unregister();
      
      if (result) {
        this.status = ServiceWorkerStatus.UNREGISTERED;
        this.registration = null;
        
        this.logMessage('Service worker unregistered', 'info');
      } else {
        this.logMessage('Service worker unregister failed', 'warning');
      }
      
      return result;
    } catch (error) {
      this.logMessage('Service worker unregister failed', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (this.options.onError && error instanceof Error) {
        this.options.onError(error);
      }
      
      return false;
    }
  }
  
  /**
   * Check if there's a service worker waiting to be activated
   */
  public hasWaiting(): boolean {
    return !!(this.registration && this.registration.waiting);
  }
  
  /**
   * Get the current service worker registration status
   */
  public getStatus(): ServiceWorkerStatus {
    return this.status;
  }
  
  /**
   * Activate the waiting service worker
   */
  public async activateWaiting(): Promise<boolean> {
    if (!this.registration || !this.registration.waiting) {
      this.logMessage('No waiting service worker to activate', 'warning');
      return false;
    }
    
    try {
      // Send skip waiting message
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // If the page is controlled by a service worker, reload to apply the new one
      if (navigator.serviceWorker.controller) {
        this.logMessage('Reloading page to activate new service worker', 'info');
        window.location.reload();
      }
      
      return true;
    } catch (error) {
      this.logMessage('Failed to activate waiting service worker', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (this.options.onError && error instanceof Error) {
        this.options.onError(error);
      }
      
      return false;
    }
  }
  
  /**
   * Send a message to the service worker
   */
  public async sendMessage(message: any): Promise<boolean> {
    if (!this.registration || !navigator.serviceWorker.controller) {
      this.logMessage('No active service worker to send message to', 'warning');
      return false;
    }
    
    try {
      navigator.serviceWorker.controller.postMessage(message);
      return true;
    } catch (error) {
      this.logMessage('Failed to send message to service worker', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Listen for messages from the service worker
   */
  public addMessageListener(callback: (event: MessageEvent) => void): void {
    if (!this.isSupported()) {
      return;
    }
    
    navigator.serviceWorker.addEventListener('message', callback);
  }
  
  /**
   * Get the current service worker registration
   */
  public getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
  
  /**
   * Add event listeners to service worker registration
   */
  private addEventListeners(registration: ServiceWorkerRegistration): void {
    // Listen for updated service worker
    registration.addEventListener('updatefound', () => {
      // A new service worker is being installed
      const newWorker = registration.installing;
      
      if (!newWorker) {
        return;
      }
      
      this.logMessage('New service worker found', 'info', {
        state: newWorker.state
      });
      
      // Listen for state changes
      newWorker.addEventListener('statechange', () => {
        this.logMessage('Service worker state changed', 'info', {
          state: newWorker.state
        });
        
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // Updated service worker
            this.status = ServiceWorkerStatus.UPDATED;
            
            this.logMessage('New service worker installed and ready to activate', 'info');
            
            if (this.options.onUpdated) {
              this.options.onUpdated(registration);
            }
          } else {
            // First-time install
            this.logMessage('Service worker installed for the first time', 'info');
            
            if (this.options.onInstalled) {
              this.options.onInstalled(registration);
            }
          }
        }
        
        if (newWorker.state === 'redundant') {
          this.status = ServiceWorkerStatus.REDUNDANT;
          this.logMessage('Service worker became redundant', 'warning');
        }
      });
    });
    
    // Listen for controlling service worker changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      this.logMessage('Service worker now controlling the page', 'info');
      
      if (this.options.onControlling && this.registration) {
        this.options.onControlling(this.registration);
      }
    });
  }
  
  /**
   * Log a message
   */
  private logMessage(
    message: string,
    level: 'info' | 'warning' | 'error',
    data?: Record<string, any>
  ): void {
    // Log to console in debug mode
    if (this.options.debug) {
      switch (level) {
        case 'info':
          console.info(`[ServiceWorker] ${message}`, data);
          break;
        case 'warning':
          console.warn(`[ServiceWorker] ${message}`, data);
          break;
        case 'error':
          console.error(`[ServiceWorker] ${message}`, data);
          break;
      }
    }
    
    // Log to monitoring service
    MonitoringService.logEvent({
      type: level,
      message: `[ServiceWorker] ${message}`,
      data
    });
  }
}

// Export singleton instance
export const serviceWorker = ServiceWorkerRegistration.getInstance(); 