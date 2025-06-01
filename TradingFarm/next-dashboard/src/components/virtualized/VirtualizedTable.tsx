/**
 * VirtualizedTable Component
 * 
 * A high-performance table component that uses virtualization to efficiently render
 * large datasets without performance degradation. Optimized for the Trading Farm dashboard.
 */

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface VirtualizedTableProps<T> {
  data: T[];
  columns: {
    id: string;
    header: React.ReactNode;
    cell: (item: T) => React.ReactNode;
    className?: string;
  }[];
  rowHeight?: number;
  maxHeight?: number;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  getRowClassName?: (item: T) => string | undefined;
  keyExtractor: (item: T) => string | number;
}

export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 40,
  maxHeight = 500,
  className,
  emptyMessage = "No data found.",
  onRowClick,
  isLoading = false,
  getRowClassName,
  keyExtractor,
}: VirtualizedTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  // Calculate overscan to prevent flickering during rapid scrolling
  const overscan = Math.ceil(maxHeight / rowHeight) * 2;
  
  const virtualizer = useVirtualizer({
    count: data.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });
  
  // Memoize items for better performance
  const items = React.useMemo(() => virtualizer.getVirtualItems(), [virtualizer]);
  
  // Show loading state or empty message when no data
  if (isLoading) {
    return (
      <div className={cn("w-full space-y-4", className)}>
        <div ref={parentRef} className="overflow-auto" style={{ maxHeight }}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="animate-pulse">
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className={cn("w-full space-y-4", className)}>
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  // Calculate the total height of the virtualized content
  const totalHeight = data.length * rowHeight;

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Rendering only the virtualized items for performance */}
            <div
              style={{
                height: `${totalHeight}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {items.map((virtualItem) => {
                const item = data[virtualItem.index];
                return (
                  <TableRow
                    key={keyExtractor(item)}
                    data-index={virtualItem.index}
                    className={cn(
                      getRowClassName?.(item),
                      onRowClick && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${rowHeight}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </div>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
