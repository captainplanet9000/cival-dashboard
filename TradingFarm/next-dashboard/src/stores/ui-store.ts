import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BaseState, BaseActions, ThemeMode, SidebarState } from './types';

/**
 * UI store state interface
 */
interface UIState extends BaseState {
  theme: ThemeMode;
  sidebar: SidebarState;
  notifications: {
    unread: number;
  };
}

/**
 * UI store actions interface
 */
interface UIActions extends BaseActions {
  // Theme actions
  setTheme: (theme: ThemeMode) => void;
  
  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebarCompact: () => void;
  setSidebarCompact: (isCompact: boolean) => void;
  setSidebarActiveItem: (itemId: string | null) => void;
  
  // Notification actions
  setUnreadNotifications: (count: number) => void;
  incrementUnreadNotifications: () => void;
  clearUnreadNotifications: () => void;
}

/**
 * Combined UI store type
 */
type UIStore = UIState & UIActions;

/**
 * Initial UI state
 */
const initialState: UIState = {
  isInitialized: false,
  isLoading: false,
  error: null,
  theme: 'system',
  sidebar: {
    isOpen: true,
    isCompact: false,
    activeItem: null,
  },
  notifications: {
    unread: 0,
  },
};

/**
 * Create UI store with persistence
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      // Base actions
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      
      // Sidebar actions
      toggleSidebar: () => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isOpen: !state.sidebar.isOpen,
        },
      })),
      setSidebarOpen: (isOpen) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isOpen,
        },
      })),
      toggleSidebarCompact: () => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isCompact: !state.sidebar.isCompact,
        },
      })),
      setSidebarCompact: (isCompact) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          isCompact,
        },
      })),
      setSidebarActiveItem: (activeItem) => set((state) => ({
        sidebar: {
          ...state.sidebar,
          activeItem,
        },
      })),
      
      // Notification actions
      setUnreadNotifications: (unread) => set((state) => ({
        notifications: {
          ...state.notifications,
          unread,
        },
      })),
      incrementUnreadNotifications: () => set((state) => ({
        notifications: {
          ...state.notifications,
          unread: state.notifications.unread + 1,
        },
      })),
      clearUnreadNotifications: () => set((state) => ({
        notifications: {
          ...state.notifications,
          unread: 0,
        },
      })),
    }),
    {
      name: 'trading-farm-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebar: {
          isCompact: state.sidebar.isCompact,
        },
      }),
    }
  )
);
