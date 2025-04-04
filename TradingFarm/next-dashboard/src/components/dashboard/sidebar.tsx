'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  LineChart, 
  Wallet,
  Settings, 
  History,
  BookOpenCheck,
  BriefcaseBusiness,
  Blocks
} from 'lucide-react';

interface SidebarProps {
  farmId: string;
}

export function Sidebar({ farmId }: SidebarProps) {
  const pathname = usePathname();
  
  const routes = [
    {
      name: 'Dashboard',
      href: `/dashboard/${farmId}`,
      icon: LayoutDashboard
    },
    {
      name: 'Trading',
      href: `/dashboard/${farmId}/trading`,
      icon: LineChart
    },
    {
      name: 'Wallets',
      href: `/dashboard/${farmId}/wallets`,
      icon: Wallet
    },
    {
      name: 'Strategies',
      href: `/dashboard/${farmId}/strategies`,
      icon: BriefcaseBusiness
    },
    {
      name: 'Transactions',
      href: `/dashboard/${farmId}/transactions`,
      icon: History
    },
    {
      name: 'Reports',
      href: `/dashboard/${farmId}/reports`,
      icon: BookOpenCheck
    },
    {
      name: 'Integrations',
      href: `/dashboard/${farmId}/integrations`,
      icon: Blocks
    },
    {
      name: 'Settings',
      href: `/dashboard/${farmId}/settings`,
      icon: Settings
    }
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r border-gray-200 dark:border-gray-800 hidden md:block">
      <div className="flex flex-col h-full bg-white dark:bg-gray-950 shadow-sm">
        <div className="p-6">
          <h2 className="text-2xl font-bold">Trading Farm</h2>
        </div>
        <nav className="flex-1 px-4 pb-4">
          <ul className="space-y-1">
            {routes.map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    pathname === route.href
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  {route.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="rounded-full h-8 w-8 bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-sm font-medium">Farm ID: {farmId}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Trading Farm</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
