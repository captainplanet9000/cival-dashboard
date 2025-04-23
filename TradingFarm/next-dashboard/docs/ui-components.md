# Trading Farm Dashboard UI Components

## Overview

The Trading Farm Dashboard utilizes a modern, component-based architecture with TypeScript and React to ensure type safety, reusability, and consistent styling. This document outlines the key UI components, their usage patterns, and implementation details.

## Design System

The dashboard follows the modern strategies template with the following key design elements:

- **Layout Structure**: Top navigation for main sections, side navigation with icons, and a main content area
- **Component Styling**: Based on shadcn/ui principles with Tailwind CSS utilities
- **Theming**: Light/dark mode support throughout the application
- **Responsive Design**: Mobile-friendly with appropriate breakpoints

## Core Components

### Layout Components

#### `DashboardLayout`

The primary layout wrapper for dashboard pages:

```tsx
<DashboardLayout>
  <YourPageContent />
</DashboardLayout>
```

**Features**:
- Top navigation
- Side navigation
- User profile menu
- Theme toggle
- Responsive behavior

### Widget Components

#### `WidgetContainer`

Base wrapper for dashboard widgets:

```tsx
<WidgetContainer
  title="Widget Title"
  description="Optional description"
  icon={<Icon />}
  actions={<ActionButtons />}
>
  {/* Widget content */}
</WidgetContainer>
```

#### `AgentMonitoringWidget`

Displays agent health and events:

```tsx
<AgentMonitoringWidget 
  farmId={farmId}
  refreshInterval={30000}
/>
```

**Features**:
- Real-time agent health status
- Event timeline
- Performance metrics
- Farm filtering

#### `ElizaDeFiConsoleWidget`

AI-powered DeFi analysis console:

```tsx
<ElizaDeFiConsoleWidget />
```

**Features**:
- Natural language interface
- Market insights
- Strategy recommendations
- Trading history analysis

### Data Display Components

#### `AgentList`

Displays and manages agents:

```tsx
<AgentList farmId={farmId} />
```

**Features**:
- Filterable table of agents
- Status indicators
- Bulk operations
- Action buttons with RBAC integration

#### `DataTable`

Generic table component with sorting and filtering:

```tsx
<DataTable 
  columns={columns}
  data={data}
  searchable={true}
  sortable={true}
  pagination={true}
/>
```

### Form Components

#### `StrategyForm`

Form for creating/editing trading strategies:

```tsx
<StrategyForm 
  initialData={strategy}
  onSubmit={handleSubmit}
/>
```

### Dialog Components

#### `BulkAssignAgentsDialog`

Dialog for assigning multiple agents:

```tsx
<BulkAssignAgentsDialog
  agents={agents}
  farms={farms}
  strategies={strategies}
  onAssign={handleAssign}
/>
```

#### `ConfirmActionDialog`

Generic confirmation dialog:

```tsx
<ConfirmActionDialog
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  confirmLabel="Proceed"
  cancelLabel="Cancel"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

## UI Element Components

### Status Indicators

#### `AgentStatusBadge`

Visual indicator for agent status:

```tsx
<AgentStatusBadge status="active" />
```

**Available Statuses**:
- `active`: Green badge
- `idle`: Blue badge
- `warning`: Yellow badge
- `error`: Red badge
- `offline`: Gray badge

#### `HealthIndicator`

General-purpose health status indicator:

```tsx
<HealthIndicator 
  status="healthy" 
  pulseEffect={true}
  tooltip="System is operating normally"
/>
```

### Charts and Visualizations

#### `MetricsChart`

Configurable chart for displaying metrics:

```tsx
<MetricsChart
  data={metricsData}
  type="line" // or "bar", "area", etc.
  xAxis="timestamp"
  yAxis="value"
  categories={categories}
/>
```

#### `PerformanceGauge`

Radial gauge for displaying performance metrics:

```tsx
<PerformanceGauge
  value={75}
  maxValue={100}
  label="CPU Usage"
  size="medium"
/>
```

## Integration Components

### `RBACTester`

A component for testing the RBAC system:

```tsx
<RBACTester />
```

**Features**:
- Displays permissions by role
- Allows role switching for testing
- Shows resource access matrix

### `ElizaOS Terminal`

Integrated AI terminal for system-wide interactions:

```tsx
<ElizaTerminal />
```

**Features**:
- Command-line interface
- Natural language processing
- System-wide queries and commands
- Context-aware responses

## Styling Patterns

### Component-Level Styling

All components follow this styling approach:

```tsx
// In component-styles.ts
export const cardStyles = {
  base: "bg-card rounded-lg border shadow-sm",
  header: "flex justify-between items-center p-4 border-b",
  content: "p-4"
};

// In your component
import { cardStyles } from '@/utils/component-styles';

function MyComponent() {
  return (
    <div className={cardStyles.base}>
      <div className={cardStyles.header}>Header</div>
      <div className={cardStyles.content}>Content</div>
    </div>
  );
}
```

### Theme Variables

Key theme variables (from Tailwind configuration):

```css
--background: 0 0% 100%; /* Light mode background */
--foreground: 222.2 84% 4.9%; /* Light mode text */
--card: 0 0% 100%; /* Card background */
--card-foreground: 222.2 84% 4.9%; /* Card text */
--popover: 0 0% 100%; /* Popover background */
--popover-foreground: 222.2 84% 4.9%; /* Popover text */
--primary: 221.2 83% 53.3%; /* Primary action color */
--primary-foreground: 210 40% 98%; /* Primary action text */
--secondary: 210 40% 96.1%; /* Secondary action color */
--secondary-foreground: 222.2 47.4% 11.2%; /* Secondary action text */
--muted: 210 40% 96.1%; /* Muted elements */
--muted-foreground: 215.4 16.3% 46.9%; /* Muted text */
--accent: 210 40% 96.1%; /* Accent elements */
--accent-foreground: 222.2 47.4% 11.2%; /* Accent text */
--destructive: 0 84.2% 60.2%; /* Destructive action color */
--destructive-foreground: 210 40% 98%; /* Destructive text */
--border: 214.3 31.8% 91.4%; /* Border color */
--input: 214.3 31.8% 91.4%; /* Input border */
--ring: 221.2 83% 53.3%; /* Focus ring */
```

## Component Best Practices

1. **Typed Props**: Always define TypeScript interfaces for component props
   ```tsx
   interface WidgetProps {
     title: string;
     description?: string;
     children: React.ReactNode;
   }
   ```

2. **Error Handling**: Implement comprehensive error states
   ```tsx
   {isError ? (
     <ErrorDisplay message={error.message} />
   ) : isLoading ? (
     <LoadingIndicator />
   ) : (
     <DataContent data={data} />
   )}
   ```

3. **React Query**: Use for data fetching and caching
   ```tsx
   const { data, isLoading, error } = useQuery(['agents', farmId], 
     () => fetchAgents(farmId))
   ```

4. **RBAC Integration**: Always check permissions for conditional rendering
   ```tsx
   {hasPermission(userRole, ResourceType.AGENT, Action.CREATE) && (
     <Button onClick={createAgent}>Create Agent</Button>
   )}
   ```

5. **Responsive Design**: Use mobile-first approach
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
   ```

6. **Component Composition**: Prefer composition over complex components
   ```tsx
   <WidgetContainer>
     <WidgetHeader />
     <WidgetContent />
     <WidgetFooter />
   </WidgetContainer>
   ```

## Testing Components

Components should be tested with React Testing Library:

```tsx
import { render, screen } from '@testing-library/react';
import { AgentStatusBadge } from './AgentStatusBadge';

describe('AgentStatusBadge', () => {
  it('renders with correct status text', () => {
    render(<AgentStatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies correct style class for status', () => {
    const { container } = render(<AgentStatusBadge status="error" />);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });
});
```

## Accessibility

All components should follow these accessibility guidelines:

1. **Keyboard Navigation**: All interactive elements must be keyboard accessible
2. **ARIA Attributes**: Use appropriate ARIA roles and attributes
3. **Color Contrast**: Maintain 4.5:1 contrast ratio for text
4. **Focus Indication**: Clearly visible focus states
5. **Screen Reader Support**: Alt text for images and appropriate ARIA labels

## Integration with Backend

Components interact with backend services through:

1. **Supabase Client**: Direct database queries and real-time subscriptions
2. **API Routes**: Server-side functions for complex operations
3. **RPC Functions**: Database-level functions for data processing

## Example: Complete AgentStatusBadge Component

```tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

export type AgentStatus = 'active' | 'idle' | 'warning' | 'error' | 'offline' | 'starting' | 'stopping';

interface AgentStatusBadgeProps {
  status: AgentStatus | string;
  tooltipText?: string;
  className?: string;
}

const statusVariantMap: Record<string, string> = {
  active: 'bg-green-500 hover:bg-green-600',
  idle: 'bg-blue-500 hover:bg-blue-600',
  warning: 'bg-yellow-500 hover:bg-yellow-600',
  error: 'bg-destructive hover:bg-destructive/90',
  offline: 'bg-muted-foreground hover:bg-muted-foreground/90',
  starting: 'bg-blue-500 hover:bg-blue-600',
  stopping: 'bg-yellow-500 hover:bg-yellow-600',
};

export function AgentStatusBadge({ status, tooltipText, className }: AgentStatusBadgeProps) {
  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
  const variant = statusVariantMap[status.toLowerCase()] || 'bg-muted-foreground';
  
  const content = (
    <Badge 
      className={cn(
        'text-white font-medium text-xs px-2 py-0.5 rounded',
        variant,
        className
      )}
    >
      {displayStatus}
    </Badge>
  );
  
  if (tooltipText) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return content;
}
```

## Additional Resources

- **Storybook**: Component examples and documentation (when implemented)
- **Figma Designs**: Source designs for the component system
- **shadcn/ui Documentation**: Reference for base component patterns
- **Tailwind CSS Documentation**: For styling utilities and customization
