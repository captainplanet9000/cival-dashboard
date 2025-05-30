'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface FormSuccessProps {
  message?: string;
}

/**
 * Form success component to display success messages
 */
export function FormSuccess({ message }: FormSuccessProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-x-2 text-sm text-emerald-500 mt-1">
      <CheckCircle2 className="h-4 w-4" />
      <p>{message}</p>
    </div>
  );
}
