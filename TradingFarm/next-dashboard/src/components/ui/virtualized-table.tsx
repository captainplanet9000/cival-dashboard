/**
 * Virtualized table component for Trading Farm Dashboard
 * Efficiently renders large datasets with optimized performance
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardEmpty, DashboardError, DashboardLoading } from '@/components/ui/dashboard-states';

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string | number;
  className?: string;
  stickyHeader?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  highlightedRowIds?: (string | number)[];
}

/**
 * Performance-optimized table component with row virtualization
 * Only renders the rows that are visible in the viewport
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  maxHeight = 400,
  isLoading = false,
  isError = false,
  error = null,
  onRowClick,
  keyExtractor,
  className,
  stickyHeader = true,
  emptyMessage = 'No data available',
  errorMessage,
  onRetry,
  highlightedRowIds = [],
}: VirtualizedTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle loading and error states
  if (isLoading) {
    return <DashboardLoading />;
  }
  
  if (isError) {
    return (
      <DashboardError 
        description={errorMessage || error?.message || 'Failed to load data'} 
        onAction={onRetry}
      />
    );
  }
  
  if (!data.length) {
    return <DashboardEmpty description={emptyMessage} />;
  }
  
  // Set up virtualization
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 5, // Render extra rows above/below viewport for smoother scrolling
  });
  
  // Memoize row rendering function to avoid unnecessary recalculations
  const renderRow = useCallback((virtualRow: any) => {
    const item = data[virtualRow.index];
    const key = keyExtractor(item);
    const isHighlighted = highlightedRowIds.includes(key);
    
    return (
      <TableRow 
        key={key}
        data-index={virtualRow.index}
        ref={virtualRow.measureRef}
        style={{
          height: `${rowHeight}px`,
          transform: `translateY(${virtualRow.start}px)`,
        }}
        className={cn(
          "absolute w-full",
          isHighlighted && "bg-primary-50 dark:bg-primary-950/30",
          onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors"
        )}
        onClick={onRowClick ? () => onRowClick(item) : undefined}
      >
        {columns.map(column => (
          <TableCell 
            key={`${key}-${column.id}`}
            className={column.className}
          >
            {column.cell(item)}
          </TableCell>
        ))}
      </TableRow>
    );
  }, [data, columns, keyExtractor, onRowClick, highlightedRowIds, rowHeight]);
  
  // Performance optimization for virtual rows
  const virtualRows = rowVirtualizer.getVirtualItems();
  
  return (
    <div 
      ref={tableContainerRef}
      className={cn("overflow-auto relative", className)}
      style={{ maxHeight }}
    >
      <Table className="relative">
        {/* Sticky header */}
        <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-background")}>
          <TableRow>
            {columns.map(column => (
              <TableHead 
                key={column.id}
                className={column.className}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        
        {/* Virtualized body */}
        <TableBody 
          className="relative" 
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualRows.map(renderRow)}
        </TableBody>
      </Table>
    </div>
  );
}

export default VirtualizedTable;
