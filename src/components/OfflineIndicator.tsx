import React, { useEffect, useState } from 'react';

interface OfflineIndicatorProps {
  // Custom offline message
  message?: string;
  
  // Custom online message (only shown when showOnline is true)
  onlineMessage?: string;
  
  // Whether to show a message when online (defaults to false)
  showOnline?: boolean;
  
  // Duration in ms to show the online message (0 for permanent, defaults to 3000)
  onlineMessageDuration?: number;
  
  // Apply custom classes to the notification container
  className?: string;
  
  // Custom class for offline state
  offlineClassName?: string;
  
  // Custom class for online state
  onlineClassName?: string;
  
  // Whether to position the indicator fixed at the top of the screen
  fixed?: boolean;
}

/**
 * Offline Indicator Component
 * 
 * Displays a notification when the user's internet connection is offline
 * and optionally when it comes back online.
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  message = 'You are currently offline',
  onlineMessage = 'You are back online',
  showOnline = false,
  onlineMessageDuration = 3000,
  className = '',
  offlineClassName = '',
  onlineClassName = '',
  fixed = true,
}) => {
  const [isOffline, setIsOffline] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [onlineMessageTimer, setOnlineMessageTimer] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Check initial online status
    setIsOffline(!navigator.onLine);
    
    // Handle online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      
      if (showOnline) {
        setShowOnlineMessage(true);
        
        // Clear any existing timer
        if (onlineMessageTimer) {
          clearTimeout(onlineMessageTimer);
        }
        
        // Auto-hide the online message after duration (if not permanent)
        if (onlineMessageDuration > 0) {
          const timer = setTimeout(() => {
            setShowOnlineMessage(false);
          }, onlineMessageDuration);
          
          setOnlineMessageTimer(timer);
        }
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineMessage(false);
      
      // Clear any existing timer
      if (onlineMessageTimer) {
        clearTimeout(onlineMessageTimer);
        setOnlineMessageTimer(null);
      }
    };
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (onlineMessageTimer) {
        clearTimeout(onlineMessageTimer);
      }
    };
  }, [showOnline, onlineMessageDuration, onlineMessageTimer]);
  
  // Don't render anything if online and not showing the temporary online message
  if (!isOffline && !showOnlineMessage) {
    return null;
  }
  
  // Determine which message to show
  const showMessage = isOffline ? message : onlineMessage;
  
  // Base classes
  const baseClasses = `w-full p-2 text-center ${fixed ? 'fixed top-0 left-0 right-0 z-50' : ''} ${className}`;
  
  // State-specific classes
  const stateClasses = isOffline 
    ? `bg-red-500 text-white ${offlineClassName}`
    : `bg-green-500 text-white ${onlineClassName}`;
  
  return (
    <div className={`${baseClasses} ${stateClasses}`}>
      <div className="flex items-center justify-center">
        {isOffline ? (
          <svg 
            className="w-4 h-4 mr-2"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" 
            />
          </svg>
        ) : (
          <svg 
            className="w-4 h-4 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.143 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" 
            />
          </svg>
        )}
        <span>{showMessage}</span>
      </div>
    </div>
  );
};

/**
 * Hook to detect online/offline status
 * 
 * @returns The current online status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
} 