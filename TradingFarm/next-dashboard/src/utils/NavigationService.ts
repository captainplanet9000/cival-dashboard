'use client';

import { NAVIGATION, NAVIGATION_SECONDARY, NavigationItem } from '@/config/navigation';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';

export type UserRole = 'user' | 'admin';

/**
 * Navigation service for Trading Farm Dashboard
 * Provides filtered navigation items based on user role and handles
 * active state detection
 */
/**
 * Refreshes the Supabase authentication session to fix JWT token issues
 * Use this function before making authenticated API calls that might result in JWS errors
 */
export async function refreshSupabaseSession() {
  const supabase = createBrowserClient();
  
  try {
    // Force refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Failed to refresh session:", error);
      toast({
        title: "Authentication Error",
        description: "Your session has expired. Please sign in again.",
        variant: "destructive"
      });
      // Force sign out to clear invalid tokens
      await supabase.auth.signOut();
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Error refreshing session:", err);
    return false;
  }
}

/**
 * Helper function to validate authentication before making API calls
 * @returns Promise<boolean> indicating if the session is valid
 */
export async function validateSession() {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      return await refreshSupabaseSession();
    }
    
    // Session exists, check if it's about to expire (within 5 minutes)
    const expiresAt = data.session?.expires_at ? data.session.expires_at * 1000 : 0;
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    if (expiresAt - now < fiveMinutesInMs) {
      // Token is about to expire, refresh it proactively
      return await refreshSupabaseSession();
    }
    
    return true;
  } catch (err) {
    console.error("Error validating session:", err);
    return false;
  }
}

export function useNavigation(userRole: UserRole = 'user') {
  const pathname = usePathname();

  // Memoize filtered groups and items for performance
  const filteredGroupsAndItems = React.useMemo(() => {
    // Make sure NAVIGATION is defined and is an array
    const nav = Array.isArray(NAVIGATION) ? NAVIGATION : [];
    const navSecondary = Array.isArray(NAVIGATION_SECONDARY) ? NAVIGATION_SECONDARY : [];
    
    const filteredGroups = nav.filter(group => group.roles.includes(userRole))
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.roles.includes(userRole))
      }))
      .filter(group => group.items.length > 0);
    
    const allItems = filteredGroups.flatMap(g => g.items);
    const secondary = navSecondary.filter(item => item.roles.includes(userRole));
    
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
