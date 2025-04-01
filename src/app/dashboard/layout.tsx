import React from 'react';
import { DashboardNavigation } from '../../components/layout/DashboardNavigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout flex">
      <DashboardNavigation />
      
      <main className="flex-grow bg-gray-100 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
} 