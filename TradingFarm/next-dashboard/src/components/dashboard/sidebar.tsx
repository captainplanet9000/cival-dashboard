'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/ui-utils';
import { 
  LayoutDashboard, 
  LineChart, 
  Wallet,
  Settings, 
  History,
  BookOpenCheck,
  Briefcase,
  Blocks,
  Activity,
  Bot,
  MessageSquare,
  Brain,
  Factory,
  Target,
  Shield,
  BarChart,
  Building2,
  ArrowRightLeft,
  BrainCircuit,
  Zap,
  BarChart2
} from 'lucide-react';

interface SidebarProps {
  farmId: string;
}

export function Sidebar({ farmId }: SidebarProps) {
  const pathname = usePathname();
  
  // Group routes by category for better organization
  const routeGroups = {
    main: [
      {
        name: 'Dashboard',
        href: `/dashboard`,
        icon: LayoutDashboard,
        category: 'main'
      }
    ],
    coreTradingGroup: [
      {
        name: 'Farms',
        href: `/dashboard/farms`,
        icon: Factory,
        category: 'core'
      },
      {
        name: 'Agents',
        href: `/dashboard/agents`,
        icon: Bot,
        category: 'core'
      },
      {
        name: 'Goals',
        href: `/dashboard/goals`,
        icon: Target,
        category: 'core'
      },
      {
        name: 'Strategies',
        href: `/dashboard/strategies`,
        icon: Briefcase,
        category: 'core'
      }
    ],
    executionGroup: [
      {
        name: 'Positions',
        href: `/dashboard/execution/positions`,
        icon: Target,
        category: 'execution'
      },
      {
        name: 'Order History',
        href: `/dashboard/execution/orders`,
        icon: History,
        category: 'execution'
      },
      {
        name: 'Activity Logs',
        href: `/dashboard/execution/logs`,
        icon: Activity,
        category: 'execution'
      }
    ],
    analyticsGroup: [
      {
        name: 'Performance',
        href: `/dashboard/analytics/performance`,
        icon: LineChart,
        category: 'analytics'
      },
      {
        name: 'Risk Analysis',
        href: `/dashboard/analytics/risk`,
        icon: Shield,
        category: 'analytics'
      },
      {
        name: 'Market Insights',
        href: `/dashboard/analytics/market`,
        icon: BarChart,
        category: 'analytics'
      }
    ],
    fundingGroup: [
      {
        name: 'Accounts & Balances',
        href: `/dashboard/funding/accounts`,
        icon: Wallet,
        category: 'funding'
      },
      {
        name: 'Vault',
        href: `/dashboard/funding/vault`,
        icon: Building2,
        category: 'funding'
      },
      {
        name: 'Transactions',
        href: `/dashboard/funding/transactions`,
        icon: ArrowRightLeft,
        category: 'funding'
      }
    ],
    aiCenterGroup: [
      {
        name: 'Command & Control',
        href: `/dashboard/ai-center/command`,
        icon: BrainCircuit,
        category: 'ai'
      },
      {
        name: 'Knowledge Base',
        href: `/dashboard/ai-center/knowledge`,
        icon: BookOpenCheck,
        category: 'ai'
      },
      {
        name: 'ElizaOS',
        href: `/dashboard/ai-center/eliza`,
        icon: Brain,
        category: 'ai'
      },
      {
        name: 'AI Advisor',
        href: `/dashboard/ai-center/advisor`,
        icon: Zap, 
        category: 'ai'
      }
    ],
    settingsGroup: [
      {
        name: 'Settings',
        href: `/dashboard/settings`,
        icon: Settings,
        category: 'settings'
      },
      {
        name: 'Connections',
        href: `/dashboard/settings/connections`,
        icon: Blocks,
        category: 'settings'
      }
    ]
  };
  
  // Flatten all routes for rendering
  const routes = [
    ...routeGroups.main,
    ...routeGroups.coreTradingGroup,
    ...routeGroups.executionGroup,
    ...routeGroups.analyticsGroup,
    ...routeGroups.fundingGroup,
    ...routeGroups.aiCenterGroup,
    ...routeGroups.settingsGroup
  ];

  // Group labels for the navigation sections
  const groupLabels = {
    main: '',
    core: 'Core Trading',
    execution: 'Execution',
    analytics: 'Analytics',
    funding: 'Funding',
    ai: 'AI Center',
    settings: 'System'
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r border-gray-200 dark:border-gray-800 hidden md:block">
      <div className="flex flex-col h-full bg-white dark:bg-gray-950 shadow-sm overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold">Trading Farm</h2>
        </div>
        <nav className="flex-1 px-4 pb-4">
          {/* Main Dashboard */}
          <ul className="space-y-1 mb-2">
            {routeGroups.main.map((route) => (
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
          
          {/* Core Trading Group */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.core}</p>
            <ul className="space-y-1 mt-1">
              {routeGroups.coreTradingGroup.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      pathname === route.href || pathname.startsWith(`${route.href}/`)
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
          </div>
          
          {/* Execution Group */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.execution}</p>
            <ul className="space-y-1 mt-1">
              {routeGroups.executionGroup.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      pathname === route.href || pathname.startsWith(`${route.href}/`)
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
          </div>
          
          {/* Analytics Group */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.analytics}</p>
            <ul className="space-y-1 mt-1">
              {routeGroups.analyticsGroup.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      pathname === route.href || pathname.startsWith(`${route.href}/`)
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
          </div>
          
          {/* Funding Group */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.funding}</p>
            <ul className="space-y-1 mt-1">
              {routeGroups.fundingGroup.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      pathname === route.href || pathname.startsWith(`${route.href}/`)
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
          </div>
          
          {/* AI Center Group */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.ai}</p>
            <ul className="space-y-1 mt-1">
              {routeGroups.aiCenterGroup.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      pathname === route.href || pathname.startsWith(`${route.href}/`)
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
          </div>
          
          {/* Settings Group */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.settings}</p>
            <ul className="space-y-1 mt-1">
              {routeGroups.settingsGroup.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      pathname === route.href || pathname.startsWith(`${route.href}/`)
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
          </div>
        </nav>
        
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="rounded-full h-8 w-8 bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-sm font-medium">Farm ID: {farmId || 'None Selected'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Trading Farm</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
