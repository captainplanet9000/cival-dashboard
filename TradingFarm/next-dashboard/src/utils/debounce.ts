/**
 * Performance utilities for Trading Farm Dashboard
 * Includes debounce, throttle, and memoization helpers
 */

/**
 * Debounces a function call, delaying execution until after a specified wait time
 * Useful for search inputs, resize handlers, and other high-frequency events
 * 
 * @param func The function to debounce
 * @param wait Wait time in milliseconds before calling the function
 * @param immediate Optionally execute the function on the leading edge instead of trailing
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func.apply(context, args);
    }
  };
}

/**
 * Throttles a function call, limiting execution to once per specified period
 * Ideal for scroll handlers, animations, and other continuous events
 * 
 * @param func The function to throttle
 * @param limit Time limit in milliseconds between function calls
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastFunc: NodeJS.Timeout | null = null;
  let lastRan: number = 0;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    } else {
      if (lastFunc) {
        clearTimeout(lastFunc);
      }
      
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * Simple memoization function for expensive calculations
 * Caches results based on serialized arguments
 * 
 * @param func The function to memoize
 * @returns Memoized function with cached results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    
    const result = func.apply(this, args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Function to batch multiple DOM updates to reduce layout thrashing
 * Uses requestAnimationFrame for optimal timing
 * 
 * @param callback Function to execute during animation frame
 * @returns Function to queue a batch operation
 */
export function createBatcher(callback: () => void): () => void {
  let queued = false;
  
  return function() {
    if (!queued) {
      queued = true;
      
      requestAnimationFrame(() => {
        callback();
        queued = false;
      });
    }
  };
}

/**
 * Creates a RequestIdleCallback polyfill
 * Falls back to setTimeout for browsers without support
 * 
 * @param callback Function to execute during idle time
 * @param options Optional configuration
 */
export function requestIdleCallbackPolyfill(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  return setTimeout(() => {
    const start = Date.now();
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    });
  }, options?.timeout || 1);
}

export function cancelIdleCallbackPolyfill(id: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
    return;
  }
  
  clearTimeout(id);
}
