import { NAVIGATION, NAVIGATION_SECONDARY, NavigationGroup, NavigationItem } from '@/config/navigation';
import { useState, useCallback, useEffect } from 'react';

// Simple event emitter for navigation events
const listeners: Record<string, ((payload: any) => void)[]> = {};
function emit(event: string, payload?: any) {
  (listeners[event] || []).forEach(fn => fn(payload));
}
function on(event: string, fn: (payload: any) => void) {
  listeners[event] = listeners[event] || [];
  listeners[event].push(fn);
  return () => {
    listeners[event] = listeners[event].filter(f => f !== fn);
  };
}

// Hook/SDK for ElizaOS/agent navigation
export function useElizaNavigation(userRole: string = 'user') {
  // State for favorites, recents, etc. (reuse logic from MobileNavigation if needed)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const val = window.localStorage.getItem('tf_nav_favorites');
      if (val) return JSON.parse(val);
    } catch {}
    return [];
  });

  // Expose navigation groups/items with elizaMeta
  const groups: NavigationGroup[] = NAVIGATION.filter(g => g.roles.includes(userRole));
  const allItems: NavigationItem[] = groups.flatMap(g => g.items);

  // Mutators
  const addFavorite = useCallback((href: string) => {
    setFavorites(favs => {
      if (favs.includes(href)) return favs;
      const updated = [href, ...favs];
      if (typeof window !== 'undefined') window.localStorage.setItem('tf_nav_favorites', JSON.stringify(updated));
      emit('favorite:add', href);
      return updated;
    });
  }, []);
  const removeFavorite = useCallback((href: string) => {
    setFavorites(favs => {
      const updated = favs.filter(f => f !== href);
      if (typeof window !== 'undefined') window.localStorage.setItem('tf_nav_favorites', JSON.stringify(updated));
      emit('favorite:remove', href);
      return updated;
    });
  }, []);

  // Listen for navigation changes (for agent/console integration)
  function onNavigationChange(fn: (href: string) => void) {
    return on('navigation:change', fn);
  }
  function navigateTo(href: string) {
    emit('navigation:change', href);
    if (typeof window !== 'undefined') window.location.href = href;
  }

  // Expose API
  return {
    groups,
    allItems,
    favorites,
    addFavorite,
    removeFavorite,
    onNavigationChange,
    navigateTo,
    emit,
    on,
  };
}

// Documentation:
/**
 * useElizaNavigation hook/SDK
 * - Provides navigation structure, metadata, and mutators for ElizaOS agents and Command Console.
 * - Exposes favorites, navigation events, and navigation actions.
 * - Use emit/on to listen to or trigger navigation events (e.g., 'navigation:change', 'favorite:add').
 * - Use navigateTo(href) to programmatically navigate from agent/console.
 * - All navigation items/groups include elizaMeta for AI context.
 */
