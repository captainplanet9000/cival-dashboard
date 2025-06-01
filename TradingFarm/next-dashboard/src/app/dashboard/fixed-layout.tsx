'use client';

import React from 'react';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { SafeFixedWeb3Provider } from '@/providers/fixed-web3-provider';

const inter = Inter({ subsets: ['latin'] });

// Debug helper component to capture errors
function ErrorLogger({children}: {children: React.ReactNode}) {
  const [hasError, setHasError] = React.useState(false);
  const [errorInfo, setErrorInfo] = React.useState<{message: string, stack?: string} | null>(null);
  
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error captured in fixed layout:', event);
      setHasError(true);
      setErrorInfo({
        message: event.message,
        stack: event.error?.stack
      });
      return true; // Prevent default error handling
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError && errorInfo) {
    return (
      <div className="p-8 max-w-4xl mx-auto my-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg border">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Dashboard Error</h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md mb-6">
          <h2 className="font-medium mb-2">Error Details</h2>
          <p className="font-mono text-sm mb-4">{errorInfo.message}</p>
          {errorInfo.stack && (
            <details>
              <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">Stack Trace</summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto text-xs">
                {errorInfo.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="font-semibold">Troubleshooting Steps</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Check console for additional errors</li>
            <li>Verify environment variables are correctly set</li>
            <li>Check network requests in browser developer tools</li>
            <li>Try using the simplified dashboard at <a href="/simplified-dashboard" className="text-blue-500 hover:underline">/simplified-dashboard</a></li>
            <li>Check the diagnostic page at <a href="/troubleshoot" className="text-blue-500 hover:underline">/troubleshoot</a></li>
          </ol>
          <div className="flex space-x-4 mt-6">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Reload Page
            </button>
            <button 
              onClick={() => window.location.href = '/dashboard/debug'} 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Go to Debug Page
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

// Dashboard layout with our fixed providers
export default function FixedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
      <ErrorLogger>
        <SafeFixedWeb3Provider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <div className="flex min-h-screen">
              {/* Sidebar */}
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
                  {children}
                </main>
              </div>
            </div>
            <Toaster />
          </ThemeProvider>
        </SafeFixedWeb3Provider>
      </ErrorLogger>
    </div>
  );
}
