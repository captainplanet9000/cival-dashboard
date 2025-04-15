// Central navigation config for Trading Farm Dashboard
// This file centralizes all navigation items, icons, and route metadata
// for use in sidebar, mobile, breadcrumbs, menus, etc.

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
  BarChart2,
  Users,
  Home,
  Bell,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Smartphone,
  Globe,
  Clock,
  Database,
} from 'lucide-react';

export const NAVIGATION = [
  {
    group: 'main',
    label: 'Main',
    roles: ['user', 'admin'], // Example: restrict groups by role
    items: [
      { name: 'Dashboard', href: '/dashboard/overview', icon: LayoutDashboard, roles: ['user', 'admin'], breadcrumb: 'Dashboard', tab: true },
    ],
  },
  {
    group: 'core',
    label: 'Core Trading',
    roles: ['user', 'admin'],
    items: [
      { name: 'Farms', href: '/dashboard/farm', icon: Factory, roles: ['user', 'admin'], breadcrumb: 'Farms', tab: true },
      { name: 'Agents', href: '/dashboard/agents', icon: Bot, roles: ['admin'], breadcrumb: 'Agents', tab: false },
      { name: 'Goals', href: '/goals', icon: Target, roles: ['user', 'admin'], breadcrumb: 'Goals', tab: false },
      { name: 'Strategies', href: '/strategies', icon: Briefcase, roles: ['user', 'admin'], breadcrumb: 'Strategies', tab: true },
    ],
  },
  {
    group: 'execution',
    label: 'Execution',
    roles: ['user', 'admin'],
    items: [
      { name: 'Positions', href: '/trading/positions', icon: Target, roles: ['user', 'admin'], breadcrumb: 'Positions', tab: true },
      { name: 'Order History', href: '/trading/orders/history', icon: History, roles: ['user', 'admin'], breadcrumb: 'Order History', tab: false },
      { name: 'Activity Logs', href: '/dashboard/agent-trading', icon: Activity, roles: ['admin'], breadcrumb: 'Activity Logs', tab: false },
    ],
  },
  {
    group: 'analytics',
    label: 'Analytics',
    roles: ['user', 'admin'],
    items: [
      { name: 'Performance', href: '/dashboard/simulation', icon: LineChart, roles: ['user', 'admin'], breadcrumb: 'Performance', tab: true },
      { name: 'Risk Analysis', href: '/dashboard/bybit-test', icon: Shield, roles: ['admin'], breadcrumb: 'Risk Analysis', tab: false },
      { name: 'Market Insights', href: '/trading/live-data', icon: BarChart, roles: ['user', 'admin'], breadcrumb: 'Market Insights', tab: false },
    ],
  },
  {
    group: 'funding',
    label: 'Funding',
    roles: ['user', 'admin'],
    items: [
      { name: 'Accounts & Balances', href: '/dashboard/banking', icon: Wallet, roles: ['user', 'admin'], breadcrumb: 'Accounts & Balances', tab: false },
      { name: 'Vault', href: '/dashboard/collaboration', icon: Building2, roles: ['user', 'admin'], breadcrumb: 'Vault', tab: false },
      { name: 'Transactions', href: '/dashboard/dry-run', icon: ArrowRightLeft, roles: ['admin'], breadcrumb: 'Transactions', tab: false },
    ],
  },
  {
    group: 'ai',
    label: 'AI Center',
    roles: ['user', 'admin'],
    items: [
      { name: 'Command Console', href: '/dashboard/command-console', icon: BrainCircuit, roles: ['admin'], breadcrumb: 'Command Console', tab: false },
      { name: 'Knowledge Base', href: '/dashboard/guides', icon: BookOpenCheck, roles: ['user', 'admin'], breadcrumb: 'Knowledge Base', tab: false },
      { name: 'ElizaOS Hub', href: '/elizaos/agents', icon: Brain, roles: ['admin'], breadcrumb: 'ElizaOS Hub', tab: false },
      { name: 'AI Advisor', href: '/dashboard/ai-advisor', icon: Zap, roles: ['user', 'admin'], breadcrumb: 'AI Advisor', tab: false },
    ],
  },
  {
    group: 'settings',
    label: 'Settings',
    roles: ['user', 'admin'],
    items: [
      { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['user', 'admin'], breadcrumb: 'Settings', tab: false },
      { name: 'Connections', href: '/dashboard/settings/connections', icon: Blocks, roles: ['admin'], breadcrumb: 'Connections', tab: false },
    ],
  },
];

// Secondary/mobile-only navigation (notifications, sync, offline, etc.)
// Extend with roles/permissions, breadcrumb, and tab metadata as needed
export const NAVIGATION_SECONDARY = [
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    roles: ['user', 'admin'],
    badge: 5, // Example badge count
    breadcrumb: 'Notifications',
    tab: false
  },
  {
    name: 'Sync Status',
    href: '/dashboard/sync',
    icon: Database,
    roles: ['admin'],
    breadcrumb: 'Sync Status',
    tab: false
  },
  {
    name: 'Offline Mode',
    href: '/dashboard/offline',
    icon: Clock,
    roles: ['user', 'admin'],
    breadcrumb: 'Offline Mode',
    tab: false
  },
];

// Usage notes:
// - Filter navigation/groups/items by user role/permissions before rendering
// - Use 'breadcrumb' field for auto-generated breadcrumbs
// - Use 'tab' field to generate navigation tabs
// - Import NAVIGATION/NAVIGATION_SECONDARY in all nav UIs for DRY consistency

