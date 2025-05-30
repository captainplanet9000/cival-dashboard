/**
 * Direct router utility to handle navigation without relying on Next.js client-side routing
 * This ensures reliable navigation between dashboard sections
 */

// Cache the current path to avoid unnecessary reloads
let currentPath = '';

// Initialize on load
if (typeof window !== 'undefined') {
  currentPath = window.location.pathname;
}

/**
 * Navigate to a new path using direct browser navigation
 * This bypasses the Next.js router completely to ensure reliable navigation
 */
export const navigateTo = (path: string): void => {
  // Only navigate if the path is different
  if (path !== currentPath) {
    // Record the new path
    currentPath = path;
    
    // Force a full page navigation
    window.location.href = path;
  }
};

/**
 * Check if a path is active (exact match or starts with the path)
 */
export const isPathActive = (path: string, exactMatch = false): boolean => {
  if (typeof window === 'undefined') return false;
  
  const currentBrowserPath = window.location.pathname;
  
  if (exactMatch) {
    return currentBrowserPath === path;
  }
  
  return currentBrowserPath === path || currentBrowserPath.startsWith(`${path}/`);
};
