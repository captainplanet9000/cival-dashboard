"use client";

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NotificationCenter from '@/components/notifications/NotificationCenter';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <DashboardHeader>
            <div className="flex items-center gap-4">
              <NotificationCenter />
            </div>
          </DashboardHeader>
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}