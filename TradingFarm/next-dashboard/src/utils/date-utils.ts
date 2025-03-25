/**
 * Date and time utility functions for the Trading Farm dashboard
 */

/**
 * Format a timestamp into a readable time string
 * @param date Date object or ISO string
 * @returns Formatted time string (e.g., "14:30:45")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false
  });
}

/**
 * Format a timestamp into a readable date and time string
 * @param date Date object or ISO string
 * @returns Formatted date and time string (e.g., "Mar 21, 2025 14:30")
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format a timestamp to show how long ago it occurred
 * @param date Date object or ISO string
 * @returns Relative time string (e.g., "2 minutes ago", "just now")
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return seconds < 10 ? 'just now' : Math.floor(seconds) + ' seconds ago';
}
