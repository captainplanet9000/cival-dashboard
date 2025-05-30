'use client';

import React from 'react';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from 'next-themes';

type RootProvidersProps = {
  children: React.ReactNode;
};

/**
 * Combined providers wrapper for the application
 * Wraps the application with all required providers in the correct order
 */
export function RootProviders({ children }: RootProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryProvider>
  );
}
