# Agent Monitoring System Documentation

## Overview

The Trading Farm Dashboard features a comprehensive Agent Monitoring System that provides real-time insights into agent health, performance, and events. This document outlines the architecture, implementation details, and usage guidelines for the agent monitoring components.

## Architecture

### Core Components

1. **AgentList**: The primary component for viewing and managing agents
2. **AgentMonitoringWidget**: A dashboard widget displaying agent health metrics and events
3. **Agent Health System**: Backend services for tracking agent status and health
4. **Agent Events System**: Event logging and processing for agent activities

### Database Schema

The agent monitoring system relies on two key tables:

#### `agent_health` Table

```sql
CREATE TABLE public.agent_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cpu_usage FLOAT,
  memory_usage FLOAT,
  uptime_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries by agent and farm
CREATE INDEX idx_agent_health_agent_id ON public.agent_health(agent_id);
CREATE INDEX idx_agent_health_farm_id ON public.agent_health(farm_id);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_health
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

#### `agent_events` Table

```sql
CREATE TABLE public.agent_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX idx_agent_events_agent_id ON public.agent_events(agent_id);
CREATE INDEX idx_agent_events_farm_id ON public.agent_events(farm_id);
CREATE INDEX idx_agent_events_created_at ON public.agent_events(created_at);
```

## Implementation

### Component Structure

#### AgentList Component

The `AgentList` component (`src/components/agent/AgentList.tsx`) serves as the main interface for viewing and managing agents:

- **Data Fetching**: Uses Supabase client to fetch agent data with health status
- **Filtering**: Provides filtering capabilities by agent status, type, and farm
- **Actions**: Supports bulk operations like assigning agents to farms/strategies
- **Real-time Updates**: Subscribes to agent health changes for live updates

#### AgentMonitoringWidget

The `AgentMonitoringWidget` (`src/components/dashboard/widgets/AgentMonitoringWidget.tsx`) provides visual insights into agent operations:

- **Health Dashboard**: Visual representation of agent health metrics
- **Event Timeline**: Log of recent agent events with severity indicators
- **Performance Charts**: CPU/memory usage graphs for active agents
- **Farm Filtering**: Ability to view agents by farm

### Data Flow

1. **Agent Health Updates**:
   - Agents send periodic heartbeats to update their status
   - The `agent_health` table maintains the latest health data
   - The UI subscribes to these updates using Supabase real-time features

2. **Agent Events Processing**:
   - Agents log significant events to the `agent_events` table
   - Events are categorized by type and severity
   - The UI displays and filters these events in the monitoring widget

## Usage

### Displaying the AgentList

```tsx
import { AgentList } from '@/components/agent/AgentList';

// In your component
return (
  <div className="container">
    <h1>Agent Management</h1>
    <AgentList farmId={currentFarmId} />
  </div>
);
```

### Implementing the AgentMonitoringWidget

```tsx
import { AgentMonitoringWidget } from '@/components/dashboard/widgets/AgentMonitoringWidget';

// In your dashboard
return (
  <div className="dashboard-grid">
    <AgentMonitoringWidget 
      farmId={selectedFarmId}
      refreshInterval={30000} // Refresh every 30 seconds
    />
    {/* Other widgets */}
  </div>
);
```

### Real-time Subscriptions

The agent monitoring system uses Supabase real-time features to provide live updates:

```typescript
// Inside a component
const subscribeToAgentHealth = async () => {
  const supabase = createBrowserClient();
  
  const subscription = supabase
    .from('agent_health')
    .on('UPDATE', (payload) => {
      // Update agent health in state
      updateAgentHealth(payload.new);
    })
    .subscribe();
    
  // Return unsubscribe function
  return () => supabase.removeSubscription(subscription);
};

// Use in useEffect
React.useEffect(() => {
  const unsubscribe = subscribeToAgentHealth();
  return () => {
    unsubscribe();
  };
}, []);
```

## Agent Status Definitions

The monitoring system uses standardized agent status values:

- **active**: Agent is running normally and responsive
- **idle**: Agent is running but not executing any tasks
- **warning**: Agent has reported minor issues but is still operational
- **error**: Agent has encountered significant issues affecting functionality
- **offline**: Agent is not responding or not running
- **starting**: Agent is in the process of starting up
- **stopping**: Agent is in the process of shutting down

## Agent Event Types

Events are categorized by type and severity:

### Event Types
- **heartbeat**: Regular status update
- **startup**: Agent initialization
- **shutdown**: Agent termination
- **task_start**: Beginning of a task
- **task_complete**: Completion of a task
- **task_error**: Error during task execution
- **config_change**: Configuration modification
- **system**: System-level events

### Severity Levels
- **info**: Informational events
- **warning**: Potential issues requiring attention
- **error**: Serious problems requiring intervention
- **critical**: Critical failures needing immediate action

## Integration with RBAC

The agent monitoring system integrates with the RBAC system to control access:

- **Viewing Agents**: Requires `READ` permission on the `AGENT` resource
- **Modifying Agents**: Requires `UPDATE` permission on the `AGENT` resource
- **Creating Agents**: Requires `CREATE` permission on the `AGENT` resource
- **Deleting Agents**: Requires `DELETE` permission on the `AGENT` resource
- **Starting/Stopping Agents**: Requires `EXECUTE` permission on the `AGENT` resource

## Best Practices

1. **Filtering by Farm**: Always filter agent queries by farm ID to improve performance and ensure proper data segmentation

2. **Pagination**: Implement pagination for farms with large numbers of agents

3. **Event Retention**: Implement a policy for purging old agent events to manage database size

4. **Real-time Updates**: Use real-time subscriptions judiciously to avoid excessive client-side updates

5. **Error Handling**: Implement comprehensive error handling for agent operations

## Troubleshooting

### Common Issues

1. **Missing Agent Health Data**: Ensure agents are properly configured to send heartbeats

2. **Performance Issues**: Check that appropriate indexes are created on the tables

3. **Real-time Updates Not Working**: Verify Supabase real-time features are enabled for the relevant tables

## Future Enhancements

1. **Advanced Filtering**: Implement more sophisticated filtering and search capabilities

2. **Agent Groups**: Allow grouping agents for easier management

3. **Health Alerts**: Add alert functionality for critical agent issues

4. **Historical Analysis**: Implement historical performance analysis tools

5. **Agent Communication**: Add direct communication capabilities with agents

---

## API Reference

### Components

#### `AgentList`

**Props**:
- `farmId?: string`: Optional farm ID to filter agents
- `showFilters?: boolean`: Whether to show filtering options
- `showActions?: boolean`: Whether to show action buttons
- `className?: string`: Additional CSS classes

#### `AgentMonitoringWidget`

**Props**:
- `farmId: string`: Farm ID to monitor
- `refreshInterval?: number`: Data refresh interval in milliseconds
- `expanded?: boolean`: Whether the widget is expanded by default
- `className?: string`: Additional CSS classes

### Utility Functions

#### `fetchAgentHealth(agentId: string): Promise<AgentHealth | null>`
Retrieves the current health status for a specific agent.

#### `fetchAgentEvents(farmId: string, limit?: number): Promise<AgentEvent[]>`
Fetches recent events for agents in a specific farm.

#### `calculateAgentHealthSummary(agents: Agent[]): AgentHealthSummary`
Calculates summary statistics for agent health in a collection.
