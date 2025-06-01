'use client';

import React from 'react';

/**
 * DialogWrapper Component
 * 
 * This is a direct re-export of the actual Dialog implementation from @radix-ui/react-dialog.
 * We're creating this wrapper to standardize modal usage across our application while
 * avoiding TypeScript issues with props. This is part of our modal standardization effort.
 */
export function DialogWrapper({ children, ...props }: { 
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void; 
}) {
  // We're dynamically importing the Dialog to avoid TypeScript errors
  // This is a workaround for type issues with the shadcn/ui Dialog component
  const Dialog = require('@radix-ui/react-dialog').Root;
  
  return (
    <Dialog {...props}>
      {children}
    </Dialog>
  );
}
