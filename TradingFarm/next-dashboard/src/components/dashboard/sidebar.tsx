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
import MetaMaskConnector from '@/components/wallet/metamask-connector';

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
        href: `/dashboard/overview`,
        icon: LayoutDashboard,
        category: 'main'
      }
    ],
    coreTradingGroup: [
      {
        name: 'Farms',
        href: `/dashboard/farm`,
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
        href: `/goals`,
        icon: Target,
        category: 'core'
      },
      {
        name: 'Strategies',
        href: `/strategies`,
        icon: Briefcase,
        category: 'core'
      }
    ],
    executionGroup: [
      {
        name: 'Positions',
        href: `/trading/positions`,
        icon: Target,
        category: 'execution'
      },
      {
        name: 'Order History',
        href: `/trading/orders/history`,
        icon: History,
        category: 'execution'
      },
      {
        name: 'Activity Logs',
        href: `/dashboard/agent-trading`,
        icon: Activity,
        category: 'execution'
      }
    ],
    analyticsGroup: [
      {
        name: 'Performance',
        href: `/dashboard/simulation`,
        icon: LineChart,
        category: 'analytics'
      },
      {
        name: 'Risk Analysis',
        href: `/dashboard/bybit-test`,
        icon: Shield,
        category: 'analytics'
      },
      {
        name: 'Market Insights',
        href: `/trading/live-data`,
        icon: BarChart,
        category: 'analytics'
      }
    ],
    fundingGroup: [
      {
        name: 'Accounts & Balances',
        href: `/dashboard/banking`,
        icon: Wallet,
        category: 'funding'
      },
      {
        name: 'Vault',
        href: `/dashboard/collaboration`,
        icon: Building2,
        category: 'funding'
      },
      {
        name: 'Transactions',
        href: `/dashboard/dry-run`,
        icon: ArrowRightLeft,
        category: 'funding'
      }
    ],
    aiCenterGroup: [
      {
        name: 'Command Console',
        href: `/dashboard/command-console`,
        icon: BrainCircuit,
        category: 'ai'
      },
      {
        name: 'Knowledge Base',
        href: `/dashboard/guides`,
        icon: BookOpenCheck,
        category: 'ai'
      },
      {
        name: 'ElizaOS Hub',
        href: `/elizaos/agents`,
        icon: Brain,
        category: 'ai'
      },
      {
        name: 'AI Advisor',
        href: `/dashboard/ai-advisor`,
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
    funding: 'Banking & Finance',
    ai: 'AI Center',
    settings: 'Settings'
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 shrink-0 border-r bg-background lg:block">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold">Trading Farm</h2>
          </div>
          <nav className="flex-1 px-4 pb-4 space-y-4">
            {/* Main Dashboard */}
            <div>
              <ul className="space-y-1 mb-2">
                {routeGroups.main.map((route, index) => (
                  <li key={`main-${index}-${route.href}`}>
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
            
            {/* Core Trading */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.core}</p>
              <ul className="space-y-1 mt-1">
                {routeGroups.coreTradingGroup.map((route, index) => (
                  <li key={`core-${index}-${route.href}`}>
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
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.execution}</p>
              <ul className="space-y-1 mt-1">
                {routeGroups.executionGroup.map((route, index) => (
                  <li key={`exec-${index}-${route.href}`}>
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
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.analytics}</p>
              <ul className="space-y-1 mt-1">
                {routeGroups.analyticsGroup.map((route, index) => (
                  <li key={`analytics-${index}-${route.href}`}>
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
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.ai}</p>
              <ul className="space-y-1 mt-1">
                {routeGroups.aiCenterGroup.map((route, index) => (
                  <li key={`ai-${index}-${route.href}`}>
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
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.funding}</p>
              <ul className="space-y-1 mt-1">
                {routeGroups.fundingGroup.map((route, index) => (
                  <li key={`funding-${index}-${route.href}`}>
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
            <div key="settings" className="mb-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1">{groupLabels.settings}</p>
              <ul className="space-y-1 mt-1">
                {routeGroups.settingsGroup.map((route, index) => (
                  <li key={`settings-${index}-${route.href}`}>
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
        </div>
        
        {/* Wallet Connector at the bottom */}
        <div className="mt-auto p-4 border-t">
          <MetaMaskConnector />
        </div>
      </div>
    </aside>
  );
}
