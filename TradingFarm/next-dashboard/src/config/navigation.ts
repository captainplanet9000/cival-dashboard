/**
 * Trading Farm Navigation Configuration
 *
 * This file centralizes all navigation groups, items, icons, and route metadata for use in sidebar, mobile, breadcrumbs, menus, etc.
 *
 * - Edit this file to add, remove, or reorganize navigation items and groups.
 * - Each group can have a label, role restrictions, and an array of items.
 * - Each item can have a name, href, icon, roles, and optional badge.
 * - Use roles to control visibility (e.g., 'user', 'admin').
 * - The config is consumed by all navigation components (Sidebar, Navbar, MobileNavigation).
 * - To add a new section, add a new group object.
 * - To show/hide items for certain users, adjust the 'roles' array.
 * - Use the 'badge' field to display notification counts or status indicators.
 *
 * Example:
 * {
 *   group: 'core',
 *   label: 'Core Trading',
 *   roles: ['user', 'admin'],
 *   items: [
 *     { name: 'Farms', href: '/dashboard/farm', icon: Factory, roles: ['user', 'admin'], badge: 3 }
 *   ]
 * }
 */

// TypeScript interfaces for navigation config
export interface NavigationItem {
  /** Display name for the navigation item */
  name: string;
  /** Route path (relative to app root) */
  href: string;
  /** Icon component from Lucide or other icon set */
  icon: React.ComponentType<{ className?: string }>;
  /** Array of roles that can see this item */
  roles: string[];
  /** Optional: Breadcrumb label for this route */
  breadcrumb?: string;
  /** Optional: Show as a tab in UI */
  tab?: boolean;
  /** Optional: Badge value (number or string) */
  badge?: number | string;
  /** ElizaOS/AI agent metadata: intent, description, tags, etc. */
  elizaMeta?: {
    intent: string;
    description: string;
    tags?: string[];
    [key: string]: any;
  };
  /** Optional: Any additional metadata for AI/ElizaOS, etc. */
  [key: string]: any;
}

export interface NavigationGroup {
  /** Unique group key */
  group: string;
  /** Display label for the group */
  label: string;
  /** Roles that can see this group */
  roles: string[];
  /** Items in this group */
  items: NavigationItem[];
  /** ElizaOS/AI agent metadata for the group */
  elizaMeta?: {
    intent: string;
    description: string;
    tags?: string[];
    [key: string]: any;
  };
}

// For secondary/mobile navigation
export interface NavigationSecondaryItem extends NavigationItem {
  /** Optional: Badge value for notifications */
  badge?: number | string;
}

// Central navigation config for Trading Farm Dashboard

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

/**
 * Main navigation groups for the Trading Farm dashboard.
 *
 * To add a new group, append a new object to this array.
 * To add a new item, add it to the `items` array of the appropriate group.
 *
 * Example usage (in a component):
 * import { NAVIGATION } from '@/config/navigation';
 *
 * NAVIGATION.filter(group => group.roles.includes(userRole)).map(...)
 */
export const NAVIGATION: NavigationGroup[] = [
  {
    group: 'main',
    label: 'Main',
    roles: ['user', 'admin'],
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['user', 'admin'], breadcrumb: 'Dashboard', tab: true },
    ],
  },
  {
    group: 'farms',
    label: 'Farms',
    roles: ['user', 'admin'],
    items: [
      { name: 'Farms Overview', href: '/dashboard/farms', icon: Factory, roles: ['user', 'admin'], breadcrumb: 'Farms', tab: true },
      { name: 'Active Farm', href: '/dashboard/farms/active', icon: Database, roles: ['user', 'admin'], breadcrumb: 'Active Farm', tab: true },
    ],
  },
  {
    group: 'execution',
    label: 'Execution',
    roles: ['user', 'admin'],
    items: [
      { name: 'Portfolio', href: '/dashboard/portfolio', icon: BarChart2, roles: ['user', 'admin'], breadcrumb: 'Portfolio', tab: true },
      { name: 'Trading Hub', href: '/trading-hub', icon: Zap, roles: ['user', 'admin'], breadcrumb: 'Trading Hub', tab: true, badge: 'New' },
      { name: 'Order History', href: '/trading/orders/history', icon: History, roles: ['user', 'admin'], breadcrumb: 'Order History', tab: false },
      { name: 'Activity Logs', href: '/dashboard/agent-trading', icon: Activity, roles: ['admin'], breadcrumb: 'Activity Logs', tab: false },
    ],
  },
  {
    group: 'analytics',
    label: 'Analytics',
    roles: ['user', 'admin'],
    items: [
      { name: 'Performance', href: '/dashboard/analytics/performance', icon: LineChart, roles: ['user', 'admin'], breadcrumb: 'Performance', tab: true },
      { name: 'Risk Analysis', href: '/dashboard/analytics/risk', icon: Shield, roles: ['admin'], breadcrumb: 'Risk Analysis', tab: false },
      { name: 'Market Insights', href: '/dashboard/analytics/market', icon: BarChart, roles: ['user', 'admin'], breadcrumb: 'Market Insights', tab: false },
    ],
  },
  {
    group: 'vault',
    label: 'Vault',
    roles: ['user', 'admin'],
    items: [
      { name: 'Accounts & Balances', href: '/dashboard/vault/accounts', icon: Wallet, roles: ['user', 'admin'], breadcrumb: 'Accounts & Balances', tab: false },
      { name: 'Vault Security', href: '/dashboard/vault/security', icon: Building2, roles: ['user', 'admin'], breadcrumb: 'Vault', tab: false },
      { name: 'Transactions', href: '/dashboard/vault/transactions', icon: ArrowRightLeft, roles: ['admin'], breadcrumb: 'Transactions', tab: false },
    ],
  },
  {
    group: 'ai',
    label: 'AI Center',
    roles: ['user', 'admin'],
    items: [
      { name: 'Command Console', href: '/dashboard/command-console', icon: BrainCircuit, roles: ['admin'], breadcrumb: 'Command Console', tab: false },
      { name: 'Agent Orchestration', href: '/dashboard/agent-orchestration', icon: Users, roles: ['admin'], breadcrumb: 'Agent Orchestration', tab: false },
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

// Farm-specific navigation items that appear when a farm is selected
/**
 * Farm-specific navigation items that show up in secondary navigation when a farm is selected.
 * These items will be displayed in a tabbed interface within farm detail pages.
 * 
 * The actual routing will use the dynamic farm ID from context or route params.
 */
export const FARM_NAVIGATION: NavigationItem[] = [
  { name: 'Overview', href: '/dashboard/farms/:farmId', icon: LayoutDashboard, roles: ['user', 'admin'], breadcrumb: 'Farm Overview', tab: true },
  { name: 'Agents', href: '/dashboard/farms/:farmId/agents', icon: Bot, roles: ['user', 'admin'], breadcrumb: 'Farm Agents', tab: true },
  { name: 'Goals', href: '/dashboard/farms/:farmId/goals', icon: Target, roles: ['user', 'admin'], breadcrumb: 'Farm Goals', tab: true },
  { name: 'Strategies', href: '/dashboard/farms/:farmId/strategies', icon: Briefcase, roles: ['user', 'admin'], breadcrumb: 'Farm Strategies', tab: true },
  { name: 'Performance', href: '/dashboard/farms/:farmId/performance', icon: LineChart, roles: ['user', 'admin'], breadcrumb: 'Farm Performance', tab: true },
  { name: 'Settings', href: '/dashboard/farms/:farmId/settings', icon: Settings, roles: ['user', 'admin'], breadcrumb: 'Farm Settings', tab: true },
];

// Secondary/mobile-only navigation (notifications, sync, offline, etc.)
// Extend with roles/permissions, breadcrumb, and tab metadata as needed
/**
 * Secondary/mobile-only navigation items.
 *
 * Use for notifications, sync, offline, or mobile-specific features.
 *
 * Example usage:
 * import { NAVIGATION_SECONDARY } from '@/config/navigation';
 *
 * NAVIGATION_SECONDARY.filter(item => item.roles.includes(userRole)).map(...)
 */
export const NAVIGATION_SECONDARY: NavigationSecondaryItem[] = [
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
    name: 'Agent Orchestration',
    href: '/dashboard/agent-orchestration',
    icon: Users,
    roles: ['admin'],
    breadcrumb: 'Agent Orchestration',
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

