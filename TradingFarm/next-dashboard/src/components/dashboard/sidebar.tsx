import React from 'react';
import Link from 'next/link';
import { useNavigation, UserRole } from '@/utils/useNavigation';
import MetaMaskConnector from '@/components/wallet/metamask-connector';

interface SidebarProps {
  farmId?: string;
  userRole?: UserRole;
}

export function Sidebar({ farmId, userRole = 'user' }: SidebarProps) {
  const { groups, isActive } = useNavigation(userRole);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 shrink-0 border-r bg-background lg:block" aria-label="Sidebar Navigation">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold">Trading Farm</h2>
          </div>
          <nav className="flex-1 px-4 pb-4 space-y-4" aria-label="Main">
            {groups.map(group => (
              <div key={group.group} className="mb-4">
                {group.label && (
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-1 mt-1">
                  {group.items.map(route => (
                    <li key={route.href}>
                      <Link
                        href={route.href}
                        aria-current={isActive(route.href) ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70 ${
                          isActive(route.href)
                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50 shadow'
                            : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                        }`}
                      >
                        <route.icon className="h-4 w-4" aria-hidden="true" />
                        <span>{route.name}</span>
                        {route.badge && (
                          <span className="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground animate-pulse">{route.badge}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t">
          <MetaMaskConnector />
        </div>
      </div>
    </aside>
  );
}