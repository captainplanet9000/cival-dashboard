'use client';

import React from 'react';
import { ScrollArea } from './scroll-area';
import { Checkbox } from './checkbox';
import { Loader2 } from 'lucide-react';

interface CheckboxListProps<T> {
  items: T[];
  selectedItems: T[];
  onItemToggle: (item: T) => void;
  renderItem?: (item: T) => React.ReactNode;
  maxHeight?: string;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function CheckboxList<T extends string | number>({
  items,
  selectedItems,
  onItemToggle,
  renderItem,
  maxHeight = "200px",
  isLoading = false,
  emptyMessage = "No items available"
}: CheckboxListProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20 border rounded-md bg-muted/10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 border rounded-md bg-muted/10">
        <span className="text-sm text-muted-foreground">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <ScrollArea className={`p-2 ${maxHeight ? `max-h-[${maxHeight}]` : ''}`}>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={String(item)} className="flex items-center space-x-2 py-1 px-2 hover:bg-muted/30 rounded-sm">
              <Checkbox
                id={`item-${String(item)}`}
                checked={selectedItems.includes(item)}
                onCheckedChange={() => onItemToggle(item)}
              />
              <label
                htmlFor={`item-${String(item)}`}
                className="flex-1 text-sm cursor-pointer"
              >
                {renderItem ? renderItem(item) : String(item)}
              </label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function CheckboxItem({ id, label, checked, onChange }: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center space-x-2 py-1 px-2 hover:bg-muted/30 rounded-sm">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      />
      <label
        htmlFor={id}
        className="flex-1 text-sm cursor-pointer"
      >
        {label}
      </label>
    </div>
  );
}
