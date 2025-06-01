/**
 * Progressive Web App (PWA) Utilities
 * 
 * Provides functions for working with PWA features and capabilities,
 * including installation, updates, and manifest generation.
 */

import { MonitoringService } from '../services/monitoring-service';
import { serviceWorker } from '../services/sw/service-worker-registration';

/**
 * PWA installation options
 */
export interface PWAInstallOptions {
  // Whether to prompt user automatically when eligible (default: false)
  promptAutomatically?: boolean;
  
  // Callback when installation is successful
  onInstalled?: () => void;
  
  // Callback when installation is declined
  onDeclined?: () => void;
  
  // Callback when installation prompt is deferred
  onDeferred?: () => void;
  
  // Callback when error occurs during installation
  onError?: (error: Error) => void;
}

/**
 * PWA manifest configuration
 */
export interface PWAManifest {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'natural' | 'portrait' | 'landscape';
  startUrl: string;
  iconSizes: number[];
  iconPath: string;
  splashScreens?: Array<{
    width: number;
    height: number;
    path: string;
  }>;
  // Additional properties can be added as needed
  [key: string]: any;
}

/**
 * Stored installation event for deferred prompting
 */
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

/**
 * PWA status information
 */
export interface PWAStatus {
  // Whether the app is running in standalone mode (installed)
  isStandalone: boolean;
  
  // Whether the app is installable
  isInstallable: boolean;
  
  // Whether there's a deferred install prompt available
  hasInstallPrompt: boolean;
  
  // Whether the app is running on iOS
  isIOS: boolean;
  
  // Whether the app has a service worker
  hasServiceWorker: boolean;
}

/**
 * Check if the app is running in standalone mode (installed)
 */
export function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if the current device is iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Initialize PWA features and listeners
 * 
 * @param options Installation options
 */
export function initPWA(options: PWAInstallOptions = {}): void {
  // Skip if not in browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the default prompt
    event.preventDefault();
    
    // Store the event for later use
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'PWA installation prompt available',
      data: { timestamp: Date.now() }
    });
    
    // Prompt automatically if configured
    if (options.promptAutomatically) {
      promptInstall(options);
    }
  });
  
  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    // Clear the deferred prompt
    deferredInstallPrompt = null;
    
    MonitoringService.logEvent({
      type: 'info',
      message: 'PWA installed successfully',
      data: { timestamp: Date.now() }
    });
    
    // Call the onInstalled callback if provided
    if (options.onInstalled) {
      options.onInstalled();
    }
  });
  
  // Register service worker if not already registered
  if (serviceWorker.getStatus() === 'UNREGISTERED' && serviceWorker.isSupported()) {
    serviceWorker.register().catch((error) => {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Failed to register service worker for PWA',
        data: { error }
      });
    });
  }
}

/**
 * Prompt the user to install the PWA
 * 
 * @param options Installation options
 * @returns Promise resolving to whether installation was successful
 */
export async function promptInstall(
  options: PWAInstallOptions = {}
): Promise<boolean> {
  // Ensure we have a deferred prompt
  if (!deferredInstallPrompt) {
    if (options.onError) {
      options.onError(new Error('No installation prompt available'));
    }
    return false;
  }
  
  try {
    // Show the installation prompt
    deferredInstallPrompt.prompt();
    
    // Wait for the user's choice
    const choiceResult = await deferredInstallPrompt.userChoice;
    
    // Handle the user's choice
    if (choiceResult.outcome === 'accepted') {
      MonitoringService.logEvent({
        type: 'info',
        message: 'User accepted PWA installation',
        data: { timestamp: Date.now() }
      });
      
      // Call the onInstalled callback if provided
      if (options.onInstalled) {
        options.onInstalled();
      }
      
      // Reset the deferred prompt
      deferredInstallPrompt = null;
      
      return true;
    } else {
      MonitoringService.logEvent({
        type: 'info',
        message: 'User declined PWA installation',
        data: { timestamp: Date.now() }
      });
      
      // Call the onDeclined callback if provided
      if (options.onDeclined) {
        options.onDeclined();
      }
      
      return false;
    }
  } catch (error) {
    MonitoringService.logEvent({
      type: 'error',
      message: 'Error prompting for PWA installation',
      data: { error }
    });
    
    // Call the onError callback if provided
    if (options.onError && error instanceof Error) {
      options.onError(error);
    }
    
    return false;
  }
}

/**
 * Defer the installation prompt for later
 * 
 * @returns Whether the prompt was successfully deferred
 */
export function deferInstallPrompt(): boolean {
  if (deferredInstallPrompt) {
    MonitoringService.logEvent({
      type: 'info',
      message: 'PWA installation prompt deferred',
      data: { timestamp: Date.now() }
    });
    
    return true;
  }
  
  return false;
}

/**
 * Get the current PWA status
 * 
 * @returns PWA status information
 */
export function getPWAStatus(): PWAStatus {
  return {
    isStandalone: isRunningStandalone(),
    isInstallable: !!deferredInstallPrompt,
    hasInstallPrompt: !!deferredInstallPrompt,
    isIOS: isIOS(),
    hasServiceWorker: serviceWorker.isSupported() && serviceWorker.getStatus() !== 'UNREGISTERED'
  };
}

/**
 * Generate a Web App Manifest from configuration
 * 
 * @param config PWA manifest configuration
 * @returns Web App Manifest as JSON string
 */
export function generateManifest(config: PWAManifest): string {
  // Generate icons configuration
  const icons = config.iconSizes.map(size => ({
    src: `${config.iconPath.replace('{size}', size.toString())}`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any maskable'
  }));
  
  // Build the manifest
  const manifest = {
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    start_url: config.startUrl,
    display: config.display,
    orientation: config.orientation,
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    icons,
    // Add other custom properties
    ...Object.fromEntries(
      Object.entries(config).filter(([key]) => 
        !['name', 'shortName', 'description', 'startUrl', 'display', 
          'orientation', 'backgroundColor', 'themeColor', 'iconSizes', 
          'iconPath', 'splashScreens'].includes(key)
      )
    )
  };
  
  return JSON.stringify(manifest, null, 2);
}

/**
 * Generate HTML for iOS splash screens
 * 
 * @param config PWA manifest configuration
 * @returns HTML string with link tags for splash screens
 */
export function generateIOSSplashScreenTags(config: PWAManifest): string {
  if (!config.splashScreens || config.splashScreens.length === 0) {
    return '';
  }
  
  return config.splashScreens
    .map(screen => 
      `<link rel="apple-touch-startup-image" media="(device-width: ${screen.width}px) and (device-height: ${screen.height}px)" href="${screen.path}">`
    )
    .join('\n');
}

/**
 * Get the iOS installation instructions HTML
 * 
 * @returns HTML string with iOS installation instructions
 */
export function getIOSInstallInstructions(): string {
  return `
    <div class="ios-install-instructions">
      <p>To install this app on your iOS device:</p>
      <ol>
        <li>Tap the Share button <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M13 8V2H7v6H2l8 8 8-8h-5z"/></svg> in Safari</li>
        <li>Tap "Add to Home Screen"</li>
        <li>Tap "Add" in the top right corner</li>
      </ol>
    </div>
  `;
}

// Define the BeforeInstallPromptEvent interface, which is not in standard TypeScript definitions
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
} 