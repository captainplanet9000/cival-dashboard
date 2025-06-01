/**
 * Draggable Widget Context Provider for Trading Farm Dashboard
 * Provides shared functionality for widget editing and customization
 */
'use client';

import React, { createContext, useContext, useState } from 'react';
import { WidgetConfig } from '@/components/dashboard/draggable-dashboard';

// Context interface
interface DraggableWidgetContextType {
  isEditing: boolean;
  onRemove: (widgetId: string) => void;
  onUpdate: (widgetId: string, updates: Partial<WidgetConfig>) => void;
}

// Default context values
const DraggableWidgetContext = createContext<DraggableWidgetContextType>({
  isEditing: false,
  onRemove: () => {},
  onUpdate: () => {},
});

// Hook for consuming the context
export const useDraggableWidget = () => useContext(DraggableWidgetContext);

interface DraggableWidgetProviderProps {
  children: React.ReactNode;
  isEditing: boolean;
  onRemove: (widgetId: string) => void;
  onUpdate: (widgetId: string, updates: Partial<WidgetConfig>) => void;
}

/**
 * Provider component for draggable widget context
 * Shares widget editing state and functions with child components
 */
export function DraggableWidgetProvider({
  children,
  isEditing,
  onRemove,
  onUpdate,
}: DraggableWidgetProviderProps) {
  return (
    <DraggableWidgetContext.Provider value={{ isEditing, onRemove, onUpdate }}>
      {children}
    </DraggableWidgetContext.Provider>
  );
}

export default DraggableWidgetProvider;
