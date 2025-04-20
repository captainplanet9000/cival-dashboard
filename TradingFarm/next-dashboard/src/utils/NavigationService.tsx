'use client';

import { NAVIGATION, NAVIGATION_SECONDARY, NavigationItem } from '@/config/navigation';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type UserRole = 'user' | 'admin';

/**
 * Navigation service for Trading Farm Dashboard
 * Provides filtered navigation items based on user role and handles
 * active state detection
 */
export function useNavigation(userRole: UserRole) {
  const pathname = usePathname();

  // Memoize filtered groups and items for performance
  const filteredGroupsAndItems = useMemo(() => {
    const filteredGroups = NAVIGATION.filter(group => group.roles.includes(userRole))
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.roles.includes(userRole))
      }))
      .filter(group => group.items.length > 0);
    
    const allItems = filteredGroups.flatMap(g => g.items);
    const secondary = NAVIGATION_SECONDARY.filter(item => item.roles.includes(userRole));
    
    return { filteredGroups, allItems, secondary };
  }, [userRole]);

  // Active state logic: highlight parent if pathname matches or is child
  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return {
    groups: filteredGroupsAndItems.filteredGroups,
    allItems: filteredGroupsAndItems.allItems,
    isActive,
    pathname,
    secondary: filteredGroupsAndItems.secondary,
  };
}
