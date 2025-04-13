'use client';

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { websocketConfig } from "@/config/app-config";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Import Wallet Provider
import { WalletProvider } from '@/contexts/WalletContext';

// Import UI components
import { Sidebar } from "@/components/dashboard/sidebar";
import { Toaster } from "@/components/ui/toaster";

// Import performance monitoring tools
import { useReportWebVitals } from 'next/web-vitals';

// Dynamic imports for new components
const ConnectionStatus = dynamic(
  () => import("@/components/dashboard/connection-status").then(mod => ({ default: mod.ConnectionStatus })),
  { ssr: false, loading: () => <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div> }
);

const ResponsiveDebugger = dynamic(
  () => import("@/components/dashboard/responsive-debugger").then(mod => ({ default: mod.ResponsiveDebugger })),
  { ssr: false }
);

const Analytics = dynamic(
  () => import("@/components/analytics/analytics").then(mod => ({ default: mod.Analytics })),
  { ssr: false }
);

/**
 * Client Components Bundle - simplified version
 */
function ClientComponents() {
  return (
    <>
      {/* Analytics tracking (invisible component) */}
      <Analytics />
      
      {/* Responsive layout debugging tool (only in dev mode with ?responsive=true) */}
      {process.env.NODE_ENV === 'development' && <ResponsiveDebugger />}
    </>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Performance monitoring function to collect metrics
function reportWebVitals() {
  useReportWebVitals(metric => {
    // Analytics implementation
    console.log(metric);
    
    // In production, send to your analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to custom endpoint
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   body: JSON.stringify(metric)
      // });
    }
  });
  
  return null;
}

// Create a client
const queryClient = new QueryClient();

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Extract farmId from URL if applicable
  const getFarmIdFromUrl = () => {
    const parts = pathname.split('/');
    const farmIndex = parts.findIndex(part => part === 'farms');
    if (farmIndex !== -1 && parts.length > farmIndex + 1) {
      return parts[farmIndex + 1];
    }
    return null;
  };
  
  const farmId = getFarmIdFromUrl() || '';
  
  // Note: Route prefetching is now handled by the ClientSideComponents
  
  // Note: Analytics tracking is now handled by the Analytics component

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <div className="h-screen bg-background overflow-hidden relative">
          {/* Performance monitoring */}
          {reportWebVitals()}
          
          {/* Performance and analytics enhancements */}
          <ClientComponents />
          
          {/* Sidebar - Positioned with fixed positioning and high z-index */}
          <Sidebar farmId={farmId} />

          {/* Main content - Adding left margin to accommodate sidebar */}
          <div className="ml-0 lg:ml-64 flex-1 flex flex-col overflow-hidden relative z-0">
            {/* Main content area */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
            
            {/* Footer with connection status */}
            <div className="border-t p-2 px-4 flex justify-between items-center">
              <ConnectionStatus />
              
              <div className="text-xs text-muted-foreground">
                Trading Farm v1.5.2
              </div>
            </div>
          </div>
          
          {/* Add Toaster here, outside the main content flow */}
          <Toaster />
        </div>
      </WalletProvider>
      {/* Optional React Query Devtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}