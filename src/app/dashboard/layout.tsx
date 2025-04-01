"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  LineChart,
  Brain,
  Settings,
  ChevronDown,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    current: true
  },
  {
    name: 'Portfolio',
    icon: Briefcase,
    current: false,
    children: [
      { name: 'Farms', href: '/dashboard/portfolio/farms' },
      { name: 'Agents', href: '/dashboard/portfolio/agents' },
      { name: 'Goals', href: '/dashboard/portfolio/goals' },
    ],
  },
  {
    name: 'Banking',
    icon: Building2,
    current: false,
    children: [
      { name: 'Balances', href: '/dashboard/banking/balances' },
      { name: 'Vault', href: '/dashboard/banking/vault' },
      { name: 'Transactions', href: '/dashboard/banking/transactions' },
    ],
  },
  {
    name: 'Trading',
    icon: LineChart,
    current: false,
    children: [
      { name: 'Orders', href: '/dashboard/trading/orders' },
      { name: 'Trades', href: '/dashboard/trading/trades' },
      { name: 'Flash Loans', href: '/dashboard/trading/flash-loans' },
    ],
  },
  {
    name: 'AI & System',
    icon: Brain,
    current: false,
    children: [
      { name: 'Command Center', href: '/dashboard/ai/command-center' },
      { name: 'Knowledge Base', href: '/dashboard/ai/knowledge-base' },
      { name: 'Settings', href: '/dashboard/ai/settings' },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggleSection = (sectionName: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionName)
        ? prev.filter((name) => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-white dark:bg-gray-800 shadow-sm">
          <div className="h-16 flex items-center px-6 border-b dark:border-gray-700">
            <h1 className="text-xl font-semibold">Trading Farm</h1>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleSection(item.name)}
                      className={cn(
                        'flex items-center w-full px-3 py-2 text-sm rounded-md',
                        pathname.startsWith(`/dashboard/${item.name.toLowerCase()}`)
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                      <ChevronDown
                        className={cn(
                          'ml-auto h-4 w-4 transition-transform',
                          openSections.includes(item.name) ? 'transform rotate-180' : ''
                        )}
                      />
                    </button>
                    {openSections.includes(item.name) && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              'block px-3 py-2 text-sm rounded-md',
                              pathname === child.href
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm rounded-md',
                      pathname === item.href
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="h-16 border-b dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header content */}
          </div>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
} 