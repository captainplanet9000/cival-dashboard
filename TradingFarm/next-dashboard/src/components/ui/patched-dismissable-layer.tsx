"use client";

import React, { useRef, useEffect } from 'react';

// This is a simplified patched version of the dismissable layer to avoid the infinite loop
export interface DismissableLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  disableOutsidePointerEvents?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent) => void;
  onFocusOutside?: (event: FocusEvent) => void;
  onInteractOutside?: (event: PointerEvent | FocusEvent) => void;
  onDismiss?: () => void;
}

export const PatchedDismissableLayer = React.forwardRef<HTMLDivElement, DismissableLayerProps>(
  (props, forwardedRef) => {
    const {
      disableOutsidePointerEvents = false,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      onDismiss,
      ...layerProps
    } = props;
    
    const layerRef = useRef<HTMLDivElement>(null);
    const ref = useRef<HTMLDivElement>(null);
    
    // Merge refs
    React.useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement);
    
    useEffect(() => {
      const handleEscapeKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && onEscapeKeyDown) {
          onEscapeKeyDown(event);
          if (!event.defaultPrevented && onDismiss) {
            onDismiss();
          }
        }
      };
      
      document.addEventListener('keydown', handleEscapeKeyDown);
      return () => document.removeEventListener('keydown', handleEscapeKeyDown);
    }, [onEscapeKeyDown, onDismiss]);
    
    // We're deliberately not implementing the pointer outside events in this patched version
    // to prevent the infinite loop, as those are likely the source of the issue
    
    return (
      <div
        {...layerProps}
        ref={(node) => {
          layerRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
      />
    );
  }
);

PatchedDismissableLayer.displayName = 'PatchedDismissableLayer';
