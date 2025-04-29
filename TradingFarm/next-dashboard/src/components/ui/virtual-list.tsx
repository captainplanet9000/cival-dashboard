"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number | ((item: T, index: number) => number);
  className?: string;
  overscan?: number;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  isLoading?: boolean;
  keyExtractor?: (item: T, index: number) => string | number;
}

/**
 * A virtualized list component for efficiently rendering large data sets
 * Only renders items that are visible in the viewport plus a configurable overscan
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  className,
  overscan = 5,
  emptyState,
  loadingState,
  isLoading = false,
  keyExtractor = (_, index) => index,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate item positions and total height
  const itemPositions = React.useMemo(() => {
    let totalHeight = 0;
    const positions = items.map((item, index) => {
      const height = typeof itemHeight === 'function' ? itemHeight(item, index) : itemHeight;
      const position = { top: totalHeight, height };
      totalHeight += height;
      return position;
    });
    
    return { positions, totalHeight };
  }, [items, itemHeight]);

  // Track container dimensions and scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    // Initialize
    handleResize();
    handleScroll();

    // Add event listeners
    window.addEventListener('resize', handleResize);
    container.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Calculate which items should be visible
  useEffect(() => {
    if (containerHeight === 0 || itemPositions.positions.length === 0) return;

    const start = Math.max(
      0,
      itemPositions.positions.findIndex(
        pos => pos.top + pos.height > scrollTop - overscan * (typeof itemHeight === 'number' ? itemHeight : 50)
      )
    );

    const end = Math.min(
      itemPositions.positions.length - 1,
      itemPositions.positions.findIndex(
        pos => pos.top > scrollTop + containerHeight + overscan * (typeof itemHeight === 'number' ? itemHeight : 50)
      ) - 1
    );

    setVisibleRange({
      start: start === -1 ? 0 : start,
      end: end === -2 ? itemPositions.positions.length - 1 : end,
    });
  }, [scrollTop, containerHeight, itemPositions, overscan, itemHeight]);

  // Render different states
  if (isLoading && loadingState) {
    return (
      <div ref={containerRef} className={cn("virtual-list-container overflow-auto", className)}>
        {loadingState}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return (
      <div ref={containerRef} className={cn("virtual-list-container overflow-auto", className)}>
        {emptyState}
      </div>
    );
  }

  // Render virtualized list
  return (
    <div 
      ref={containerRef} 
      className={cn("virtual-list-container overflow-auto relative", className)}
      style={{ height: '100%' }}
    >
      <div style={{ height: itemPositions.totalHeight, position: 'relative' }}>
        {items
          .slice(visibleRange.start, visibleRange.end + 1)
          .map((item, relativeIndex) => {
            const index = visibleRange.start + relativeIndex;
            const { top, height } = itemPositions.positions[index];
            const key = keyExtractor(item, index);
            
            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  top,
                  height,
                  width: '100%',
                }}
              >
                {renderItem(item, index)}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// Example usage guide in JSDoc comment
/**
 * @example
 * // Basic usage
 * <VirtualList
 *   items={largeDataArray}
 *   renderItem={(item, index) => (
 *     <div className="p-2 border-b">{item.name}</div>
 *   )}
 *   itemHeight={48}
 *   className="h-[500px]"
 *   emptyState={<div className="p-4 text-center">No items found</div>}
 * />
 * 
 * // With variable heights
 * <VirtualList
 *   items={complexData}
 *   renderItem={(item) => <ComplexItem data={item} />}
 *   itemHeight={(item) => item.isExpanded ? 120 : 48}
 *   keyExtractor={(item) => item.id}
 * />
 */
