import React, { useEffect, useState } from 'react';
import { serviceWorker, ServiceWorkerStatus, ServiceWorkerRegistration as SWRegistration } from '../services/sw/service-worker-registration';

interface ServiceWorkerUpdateProps {
  // Custom notification message
  message?: string;
  
  // Custom update button text
  updateButtonText?: string;
  
  // Custom dismiss button text
  dismissButtonText?: string;
  
  // Automatically reload after showing notification for X milliseconds (0 to disable)
  autoReloadAfter?: number;
  
  // Show notification for dismissible updates
  showDismissible?: boolean;
  
  // Apply custom classes to the notification container
  className?: string;
  
  // Callback when update is available
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  
  // Callback when update is activated
  onUpdateActivated?: () => void;
}

/**
 * Service Worker Update Notification
 * 
 * Displays a notification when a new version of the application is available
 * and allows the user to refresh to apply the update.
 */
export const ServiceWorkerUpdate: React.FC<ServiceWorkerUpdateProps> = ({
  message = 'A new version is available!',
  updateButtonText = 'Update now',
  dismissButtonText = 'Later',
  autoReloadAfter = 0,
  showDismissible = true,
  className = '',
  onUpdateAvailable,
  onUpdateActivated
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [autoUpdateTimer, setAutoUpdateTimer] = useState<number | null>(null);
  const [autoUpdateCountdown, setAutoUpdateCountdown] = useState(0);
  
  useEffect(() => {
    // Skip if service workers are not supported
    if (!serviceWorker.isSupported()) {
      return;
    }
    
    // Check if there's already a waiting service worker
    const checkForWaiting = async () => {
      if (serviceWorker.hasWaiting()) {
        setUpdateAvailable(true);
        
        // Notify that update is available
        const registration = serviceWorker.getRegistration();
        if (registration && onUpdateAvailable) {
          // Use type assertion to address type mismatch
          onUpdateAvailable(registration as unknown as ServiceWorkerRegistration);
        }
        
        // Start auto-update timer if configured
        startAutoUpdateTimer();
      }
    };
    
    // Initialize service worker if needed
    if (serviceWorker.getStatus() === ServiceWorkerStatus.UNREGISTERED) {
      serviceWorker.register().then(() => {
        checkForWaiting();
      });
    } else {
      checkForWaiting();
    }
    
    // Set up listener for service worker updates
    const handleServiceWorkerUpdate = (registration: any) => {
      setUpdateAvailable(true);
      
      // Notify that update is available
      if (onUpdateAvailable) {
        // Use type assertion to address type mismatch
        onUpdateAvailable(registration as unknown as ServiceWorkerRegistration);
      }
      
      // Start auto-update timer if configured
      startAutoUpdateTimer();
    };
    
    // Configure service worker with our callback
    // Using the static method directly
    SWRegistration.getInstance({
      onUpdated: handleServiceWorkerUpdate
    });
    
    // Start auto-update timer if configured and update is available
    if (updateAvailable && autoReloadAfter > 0) {
      startAutoUpdateTimer();
    }
    
    // Cleanup
    return () => {
      if (autoUpdateTimer !== null) {
        clearInterval(autoUpdateTimer);
      }
    };
  }, [onUpdateAvailable, autoReloadAfter, updateAvailable, autoUpdateTimer]);
  
  // Start auto-update timer
  const startAutoUpdateTimer = () => {
    if (autoReloadAfter <= 0 || autoUpdateTimer !== null) {
      return;
    }
    
    setAutoUpdateCountdown(Math.ceil(autoReloadAfter / 1000));
    
    const timer = window.setInterval(() => {
      setAutoUpdateCountdown(prev => {
        const newValue = prev - 1;
        
        if (newValue <= 0) {
          // Time's up, activate the update
          clearInterval(timer);
          handleUpdate();
          return 0;
        }
        
        return newValue;
      });
    }, 1000);
    
    setAutoUpdateTimer(timer);
  };
  
  // Handle update activation
  const handleUpdate = () => {
    // Clear auto-update timer if running
    if (autoUpdateTimer !== null) {
      clearInterval(autoUpdateTimer);
      setAutoUpdateTimer(null);
    }
    
    // Activate waiting service worker
    serviceWorker.activateWaiting()
      .then(success => {
        if (success && onUpdateActivated) {
          onUpdateActivated();
        }
      });
  };
  
  // Handle dismissal of the notification
  const handleDismiss = () => {
    // Clear auto-update timer if running
    if (autoUpdateTimer !== null) {
      clearInterval(autoUpdateTimer);
      setAutoUpdateTimer(null);
    }
    
    // Hide notification
    setUpdateAvailable(false);
  };
  
  // Don't render anything if no update is available
  if (!updateAvailable) {
    return null;
  }
  
  // Base classes for the notification
  const baseClass = 'fixed bottom-0 left-0 right-0 z-50 p-4 bg-blue-600 text-white shadow-lg transform transition-transform duration-300';
  
  return (
    <div className={`${baseClass} ${className}`}>
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span>{message}</span>
          
          {autoUpdateCountdown > 0 && (
            <span className="ml-2 text-sm bg-blue-700 px-2 py-1 rounded-full">
              Auto-updating in {autoUpdateCountdown}s
            </span>
          )}
        </div>
        
        <div className="flex mt-2 sm:mt-0">
          {showDismissible && (
            <button
              onClick={handleDismiss}
              className="px-4 py-2 mr-2 text-blue-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {dismissButtonText}
            </button>
          )}
          
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white"
          >
            {updateButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Service Worker Update Provider
 * 
 * A component that can be placed at the root of the application to
 * automatically handle service worker updates.
 */
export const ServiceWorkerProvider: React.FC<{
  children: React.ReactNode;
  updateProps?: ServiceWorkerUpdateProps;
}> = ({
  children,
  updateProps = {}
}) => {
  return (
    <>
      {children}
      <ServiceWorkerUpdate {...updateProps} />
    </>
  );
}; 