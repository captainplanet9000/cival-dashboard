// Common types for store states and actions

/**
 * Common store state properties
 */
export interface BaseState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Common store actions
 */
export interface BaseActions {
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * UI theme settings
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Dashboard sidebar state
 */
export interface SidebarState {
  isOpen: boolean;
  isCompact: boolean;
  activeItem: string | null;
}

/**
 * Filter option type
 */
export interface FilterOption {
  id: string;
  label: string;
  value: any;
}

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';
