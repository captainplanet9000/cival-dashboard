'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SideNav } from '@/components/layout/side-nav';
import { UserNav } from '@/components/layout/user-nav';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SocketProvider } from '@/providers/socket-provider';
import { GlobalCommandButton } from '@/components/elizaos/global-command-button';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const pathname = usePathname();
  
  // Don't show the command button on the command console page itself
  const shouldShowCommandButton = !pathname.includes('/dashboard/command');

  return (
    <SocketProvider>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 items-start flex">
          <aside
            className={cn(
              "fixed top-0 bottom-0 z-30 hidden w-56 border-r bg-background lg:flex flex-col"
            )}
          >
            <div className="border-b p-2 px-3 py-4">
              <h2 className="text-lg font-semibold tracking-tight">
                Trading Farm
              </h2>
            </div>
            <SideNav />
          </aside>
          <div className="fixed flex w-full flex-col border-b bg-background z-20 lg:ml-56">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
              <MobileNav
                isOpen={isMobileNavOpen}
                onOpenChange={setIsMobileNavOpen}
              />
              <div className="flex items-center gap-2">
                <UserNav />
              </div>
            </div>
          </div>
          <main className="flex-1 flex-col px-4 pt-20 lg:ml-56 md:px-8 md:pt-16">
            {children}
          </main>
        </div>
      </div>
      
      {shouldShowCommandButton && <GlobalCommandButton />}
    </SocketProvider>
  );
}
