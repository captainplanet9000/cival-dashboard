import React from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: {
    farmId: string;
  };
}

export default async function DashboardLayout({
  children,
  params
}: DashboardLayoutProps) {
  // Safely extract farmId from params
  const farmId = params?.farmId;
  
  // Ensure we have a valid farmId before proceeding
  if (!farmId) {
    return redirect('/dashboard');
  }
  
  const supabase = await createServerClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect('/login');
  }
  
  // Verify farm access
  const { data: farm, error } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .single();
  
  if (error || !farm || farm.user_id !== user.id) {
    console.error('Farm access error:', error);
    return redirect('/dashboard');
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar farmId={farmId} />
      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="md:hidden">
                <h2 className="text-xl font-bold">Trading Farm</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {/* Add notification or profile components here */}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
