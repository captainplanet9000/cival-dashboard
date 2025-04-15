'use client';

import React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchEntityData, prefetchListData, prefetchDashboardData } from '@/utils/react-query/prefetching';
import { cn } from '@/lib/utils';

interface PrefetchingNavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  isActive?: boolean;
  prefetchType?: 'entity' | 'list' | 'dashboard';
  entityType?: 'strategy' | 'position' | 'agent' | 'farm';
  entityId?: string;
  listType?: 'strategies' | 'positions' | 'agents' | 'farms' | 'orders';
  filters?: any;
  prefetchOnHover?: boolean;
  prefetchOnFocus?: boolean;
  prefetchOnVisible?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function PrefetchingNavLink({
  href,
  children,
  className,
  activeClassName,
  isActive,
  prefetchType,
  entityType,
  entityId,
  listType,
  filters,
  prefetchOnHover = true,
  prefetchOnFocus = true,
  prefetchOnVisible = false,
  onClick,
  ...props
}: PrefetchingNavLinkProps) {
  const queryClient = useQueryClient();
  const linkRef = React.useRef<HTMLAnchorElement>(null);
  
  // Handle prefetching
  const handlePrefetch = React.useCallback(() => {
    if (!prefetchType) return;
    
    try {
      switch (prefetchType) {
        case 'entity':
          if (entityType && entityId) {
            prefetchEntityData(queryClient, entityType, entityId);
          }
          break;
          
        case 'list':
          if (listType) {
            prefetchListData(queryClient, listType, filters);
          }
          break;
          
        case 'dashboard':
          if (entityId) {
            prefetchDashboardData(queryClient, entityId);
          }
          break;
      }
    } catch (error) {
      console.error('Error prefetching data:', error);
    }
  }, [prefetchType, entityType, entityId, listType, filters, queryClient]);
  
  // Set up Intersection Observer for visibility-based prefetching
  React.useEffect(() => {
    if (!prefetchOnVisible || !linkRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            handlePrefetch();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    
    observer.observe(linkRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [handlePrefetch, prefetchOnVisible]);
  
  // Event handlers
  const onMouseEnter = React.useCallback(() => {
    if (prefetchOnHover) {
      handlePrefetch();
    }
  }, [prefetchOnHover, handlePrefetch]);
  
  const onFocus = React.useCallback(() => {
    if (prefetchOnFocus) {
      handlePrefetch();
    }
  }, [prefetchOnFocus, handlePrefetch]);
  
  return (
    <Link
      href={href}
      ref={linkRef}
      className={cn(
        className,
        isActive && activeClassName
      )}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}
