'use client';

import { ReactNode } from 'react';
import { Navbar } from '@/app/dashboard/navbar';
import { GlobalCommandButton } from '@/components/elizaos/global-command-button';
import { MobileNav } from '@/components/mobile-nav';
import { UserNav } from '@/components/user-nav';
import { ModeToggle } from '@/components/mode-toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function ElizaOSLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-2">
          <div className="flex items-center gap-2 md:gap-4">
            <MobileNav />
            <Link href="/" className="hidden items-center space-x-2 md:flex">
              <span className="hidden font-bold sm:inline-block">
                Trading Farm
              </span>
            </Link>
            <div className="ml-2">
              <Tabs defaultValue="elizaos">
                <TabsList>
                  <TabsTrigger value="standard" asChild>
                    <Link href="/dashboard">Standard</Link>
                  </TabsTrigger>
                  <TabsTrigger value="elizaos" asChild>
                    <Link href="/dashboard/elizaos">ElizaOS Centric</Link>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalCommandButton />
            <ModeToggle />
            <UserNav />
          </div>
        </div>
        <div className="container flex py-2">
          <Navbar />
        </div>
      </header>
      <main className="flex-1 pt-4">
        {children}
      </main>
    </div>
  );
}
