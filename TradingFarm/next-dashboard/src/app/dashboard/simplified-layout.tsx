'use client';

import React, { ReactNode } from "react";
import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// This is a simplified version of the dashboard layout without problematic providers
export default function SimplifiedDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <div className="flex min-h-screen">
          {/* Simplified sidebar with just the structure, no complex components */}
          <div className="w-64 bg-gray-900 text-white p-4 hidden md:block">
            <div className="text-xl font-bold mb-6">Trading Farm</div>
            <nav className="space-y-2">
              {['Dashboard', 'Strategies', 'Trades', 'Analytics', 'Banking'].map((item) => (
                <div key={item} className="p-2 rounded hover:bg-gray-800 cursor-pointer">
                  {item}
                </div>
              ))}
            </nav>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            <header className="h-16 border-b flex items-center justify-between px-4">
              <div className="md:hidden">
                <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  Menu
                </button>
              </div>
              
              <div className="hidden md:flex space-x-4">
                {['Dashboard', 'Strategies', 'Trades', 'Analytics', 'Banking'].map((item) => (
                  <button 
                    key={item} 
                    className="px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {item}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  Theme
                </button>
                <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  Profile
                </button>
              </div>
            </header>
            
            <main className="p-6">
              {/* Error boundary with inline component to avoid imports */}
              <ErrorBoundarySimple>
                {children}
              </ErrorBoundarySimple>
            </main>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}

// Simple inline error boundary to avoid imports
function ErrorBoundarySimple({ children }: { children: ReactNode }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Captured error:', event);
      setHasError(true);
      setError(new Error(event.message));
      return true; // Prevent default handling
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
        <h3 className="text-lg font-medium mb-2">Error</h3>
        <p>{error?.message || 'An unexpected error occurred'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm font-medium"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
