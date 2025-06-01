'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
}

/**
 * Form error component to display validation errors
 */
export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-x-2 text-sm text-destructive mt-1">
      <AlertCircle className="h-4 w-4" />
      <p>{message}</p>
    </div>
  );
}
