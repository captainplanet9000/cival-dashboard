# ElizaOS Agent Navigation API

## Overview
This document describes the agent-facing navigation API and event system for the Trading Farm dashboard, enabling ElizaOS agents and the Command Console to query, mutate, and listen to navigation state.

## Navigation Metadata
Each navigation group and item in `NAVIGATION` and `NAVIGATION_SECONDARY` now supports an `elizaMeta` field, e.g.:

```ts
{
  name: 'Dashboard',
  href: '/dashboard/overview',
  icon: LayoutDashboard,
  roles: ['user', 'admin'],
  elizaMeta: {
    intent: 'go_dashboard',
    description: 'Navigate to the main dashboard overview',
    tags: ['main', 'overview', 'home']
  }
}
```

## useElizaNavigation Hook/SDK

```ts
import { useElizaNavigation } from '@/utils/useElizaNavigation';
const nav = useElizaNavigation('user');
```

### API
- `groups`: Navigation groups (with elizaMeta)
- `allItems`: All navigation items (with elizaMeta)
- `favorites`: Array of favorite hrefs
- `addFavorite(href: string)`: Star a navigation item
- `removeFavorite(href: string)`: Unstar a navigation item
- `onNavigationChange(fn: (href: string) => void)`: Listen for navigation changes
- `navigateTo(href: string)`: Programmatically navigate (agent/console)
- `emit(event: string, payload?: any)`: Emit a navigation event
- `on(event: string, fn: (payload: any) => void)`: Listen for any navigation event

### Events
- `'navigation:change'`: Fired when navigation changes (manual or agent-driven)
- `'favorite:add'`: Fired when a favorite is added
- `'favorite:remove'`: Fired when a favorite is removed

### Example: Agent Command
```ts
// Agent wants to navigate to Orders
nav.navigateTo('/trading/orders/history');
// Listen for navigation changes
nav.onNavigationChange((href) => {
  // Agent can react to navigation
});
```

## Integration Notes
- All navigation items/groups expose `elizaMeta` for intent detection, agent context, and command suggestions.
- The API is safe for both UI and agent/console use.
- Extend `elizaMeta` as needed for advanced agent workflows.

## See Also
- `src/config/navigation.ts`
- `src/utils/useElizaNavigation.ts`
- ElizaOS Command Console integration
