'use client';

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { websocketConfig } from "@/config/app-config";
import dynamic from "next/dynamic";

// Import UI components
import { Sidebar } from "@/components/dashboard/sidebar";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import { ResponsiveDebugger } from "@/components/dashboard/responsive-debugger";
import { Analytics } from "@/components/analytics/analytics";

// Import performance monitoring tools
import { useReportWebVitals } from 'next/web-vitals';

// Import navigation utilities
import { usePrefetchRoutes, useSmartPrefetch, useNavigationMetrics } from "@/utils/navigation";

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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Performance monitoring */}
      {reportWebVitals()}
      
      {/* Performance and analytics enhancements */}
      <ClientComponents />
      
      {/* Sidebar - Using our updated component */}
      <Sidebar farmId={farmId} />

      {/* Main content - Wrapped in Suspense for better loading experience */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="p-6">Loading...</div>}>
            {children}
          </Suspense>
        </main>
        
        {/* Footer with connection status */}
        <div className="border-t p-2 px-4 flex justify-between items-center">
          <Suspense fallback={<div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>}>
            <ConnectionStatus />
          </Suspense>
          
          <div className="text-xs text-muted-foreground">
            Trading Farm v1.5.2
          </div>
        </div>
      </div>
    </div>
  );
}