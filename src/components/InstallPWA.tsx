import React, { useEffect, useState } from 'react';
import { 
  initPWA, 
  promptInstall, 
  isIOS, 
  isRunningStandalone, 
  getPWAStatus, 
  getIOSInstallInstructions,
  PWAInstallOptions
} from '../lib/pwa';

interface InstallPWAProps {
  // Title for the installation prompt
  title?: string;
  
  // Description for the installation prompt
  description?: string;
  
  // Install button text
  installButtonText?: string;
  
  // Cancel button text
  cancelButtonText?: string;
  
  // Whether to show iOS installation instructions
  showIOSInstructions?: boolean;
  
  // Whether to auto-hide after installation
  autoHide?: boolean;
  
  // Whether to initialize automatically
  autoInit?: boolean;
  
  // Custom PWA installation options
  installOptions?: Omit<PWAInstallOptions, 'onInstalled' | 'onDeclined' | 'onError'>;
  
  // Callback when installation is successful
  onInstalled?: () => void;
  
  // Callback when installation is declined
  onDeclined?: () => void;
  
  // Callback when installation has an error
  onError?: (error: Error) => void;
  
  // Custom class for the component
  className?: string;
  
  // Custom class for the banner
  bannerClassName?: string;
  
  // Custom class for the modal
  modalClassName?: string;
  
  // Display mode: 'banner', 'modal', or 'auto' (default)
  displayMode?: 'banner' | 'modal' | 'auto';
}

/**
 * PWA Installation Component
 * 
 * Provides a UI for users to install the web app as a PWA,
 * with different display options and platform-specific instructions.
 */
export const InstallPWA: React.FC<InstallPWAProps> = ({
  title = 'Install App',
  description = 'Install this app on your device for quick and easy access.',
  installButtonText = 'Install',
  cancelButtonText = 'Not Now',
  showIOSInstructions = true,
  autoHide = true,
  autoInit = true,
  installOptions = {},
  onInstalled,
  onDeclined,
  onError,
  className = '',
  bannerClassName = '',
  modalClassName = '',
  displayMode = 'auto'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  
  useEffect(() => {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return;
    }
    
    // Check platform and installation status
    const checkStatus = () => {
      const status = getPWAStatus();
      setIsIOSDevice(status.isIOS);
      setIsStandalone(status.isStandalone);
      setIsInstallable(status.isInstallable);
      
      // Show component if installable and not already installed
      setIsVisible(
        !status.isStandalone && 
        (status.isInstallable || (status.isIOS && showIOSInstructions))
      );
    };
    
    // Auto-initialize if configured
    if (autoInit) {
      initPWA({
        ...installOptions,
        onInstalled: () => {
          setIsInstallable(false);
          setIsStandalone(true);
          
          if (autoHide) {
            setIsVisible(false);
          }
          
          if (onInstalled) {
            onInstalled();
          }
        }
      });
    }
    
    // Initial check
    checkStatus();
    
    // Listen for changes that might affect installability
    window.addEventListener('beforeinstallprompt', checkStatus);
    window.addEventListener('appinstalled', checkStatus);
    
    // Check when becoming visible in case PWA status changed while hidden
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', checkStatus);
      window.removeEventListener('appinstalled', checkStatus);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [autoInit, installOptions, autoHide, onInstalled, showIOSInstructions]);
  
  // Don't render if not visible
  if (!isVisible) {
    return null;
  }
  
  // Handle installation
  const handleInstall = async () => {
    try {
      // iOS needs special instructions
      if (isIOSDevice) {
        // For iOS, we just keep showing the instructions
        return;
      }
      
      // Try to install
      const success = await promptInstall({
        onInstalled: () => {
          setIsVisible(autoHide ? false : true);
          
          if (onInstalled) {
            onInstalled();
          }
        },
        onDeclined: () => {
          if (onDeclined) {
            onDeclined();
          }
        },
        onError: (error) => {
          if (onError) {
            onError(error);
          }
        }
      });
      
      if (!success) {
        if (onDeclined) {
          onDeclined();
        }
      }
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };
  
  // Handle dismissal
  const handleDismiss = () => {
    setIsVisible(false);
    
    if (onDeclined) {
      onDeclined();
    }
  };
  
  // Determine which display mode to use
  const effectiveDisplayMode = displayMode === 'auto'
    ? (isIOSDevice ? 'modal' : 'banner')
    : displayMode;
  
  // Render as banner
  if (effectiveDisplayMode === 'banner') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-50 ${bannerClassName} ${className}`}>
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center mb-2 sm:mb-0">
            <svg
              className="w-6 h-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span>{description}</span>
          </div>
          
          <div className="flex">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 mr-2 text-blue-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {cancelButtonText}
            </button>
            
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {installButtonText}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render as modal
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${modalClassName} ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              {title}
            </h3>
            
            <button 
              onClick={handleDismiss}
              className="text-white hover:text-blue-100 focus:outline-none"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <p className="mb-4">{description}</p>
          
          {isIOSDevice && showIOSInstructions && (
            <div 
              className="bg-blue-50 p-4 rounded-lg mb-4"
              dangerouslySetInnerHTML={{ __html: getIOSInstallInstructions() }}
            />
          )}
          
          <div className="flex justify-end">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
            >
              {cancelButtonText}
            </button>
            
            {!isIOSDevice && (
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {installButtonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for checking if the app can be installed as a PWA
 * 
 * @returns Object with PWA installation status and functions
 */
export function usePWAInstall() {
  const [pwaStatus, setPwaStatus] = useState(
    typeof window !== 'undefined' ? getPWAStatus() : {
      isStandalone: false,
      isInstallable: false,
      hasInstallPrompt: false,
      isIOS: false,
      hasServiceWorker: false
    }
  );
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Initialize PWA
    initPWA();
    
    // Update status when it might change
    const updateStatus = () => setPwaStatus(getPWAStatus());
    
    // Set up event listeners
    window.addEventListener('beforeinstallprompt', updateStatus);
    window.addEventListener('appinstalled', updateStatus);
    
    // Check again when resuming
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateStatus();
      }
    });
    
    // Initial check
    updateStatus();
    
    return () => {
      window.removeEventListener('beforeinstallprompt', updateStatus);
      window.removeEventListener('appinstalled', updateStatus);
    };
  }, []);
  
  return {
    ...pwaStatus,
    installApp: promptInstall,
    isAppInstalled: pwaStatus.isStandalone
  };
} 