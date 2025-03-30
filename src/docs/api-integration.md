# Trading Farm Supabase MCP API Integration

This document describes how to integrate with the Trading Farm Supabase MCP (Model-Controller-Provider) server that powers agent cooperation, message queuing, and coordination features.

## Overview

The Trading Farm MCP server provides several key features:

1. **Agent Coordination**: Register and manage agents, assign tasks, and coordinate group decisions
2. **Message Queue**: Asynchronous communication between agents with prioritization and delivery guarantees
3. **Cooperation**: Facilitate cooperation between specialized agents
4. **Data Persistence**: Store trading signals, strategies, and analysis results

## API Endpoints

### Agent Coordinator API

- `POST /api/coordinator/agents` - Register a new agent
- `GET /api/coordinator/agents` - Get all registered agents
- `GET /api/coordinator/agents/:agentId` - Get a specific agent
- `PUT /api/coordinator/agents/:agentId` - Update an agent
- `PATCH /api/coordinator/agents/:agentId/status` - Update agent status
- `GET /api/coordinator/specialists/:specialization` - Get specialist agents
- `POST /api/coordinator/decisions` - Request a coordinated decision
- `GET /api/coordinator/specializations` - List available specializations
- `GET /api/coordinator/decision-modes` - List available decision modes

### Task Management API

- `POST /api/coordinator/tasks` - Create a new task assignment
- `GET /api/coordinator/tasks` - Get tasks with optional filtering
- `PUT /api/coordinator/tasks/:taskId` - Update task status or details
- `POST /api/coordinator/workflows` - Create a new workflow
- `POST /api/coordinator/assign-task` - Assign a task to the best matching agent

### Message Queue API

- `POST /api/messages` - Send a message
- `GET /api/messages/agent/:agentId` - Get messages for an agent
- `PATCH /api/messages/:messageId/deliver` - Mark message as delivered
- `PATCH /api/messages/:messageId/read` - Mark message as read
- `POST /api/messages/:messageId/respond` - Respond to a message
- `GET /api/messages/types` - List available message types
- `GET /api/messages/priorities` - List available message priorities

### Subscription API

- `POST /api/coordinator/subscriptions` - Subscribe an agent to a topic
- `DELETE /api/coordinator/subscriptions` - Unsubscribe an agent from a topic
- `GET /api/coordinator/subscriptions` - Get subscriptions for an agent

### Broadcasting API

- `POST /api/coordinator/broadcast` - Send a broadcast message to all agents
- `POST /api/coordinator/publish` - Publish a message to a topic

## Integration Examples

### Registering an Agent

```typescript
const agentData = {
  agent_id: "agent_market_1",
  name: "Market Analysis Agent",
  specialization: "market_analysis",
  capabilities: ["technical_analysis", "pattern_recognition", "trend_detection"],
  status: "active"
};

const result = await CoordinatorService.registerAgent(agentData);
```

### Sending a Message

```typescript
const message = {
  sender_id: "agent_market_1",
  recipient_id: "agent_execution_1", 
  message_type: "SIGNAL",
  payload: {
    signal_type: "buy",
    asset: "BTC/USD",
    price: 38500,
    confidence: 0.85
  }
};

const result = await MessageQueueService.sendMessage(message);
```

### Creating a Task

```typescript
const taskData = {
  task_id: "task_123",
  task_type: "MARKET_ANALYSIS",
  parameters: {
    asset: "ETH/USD",
    timeframe: "4h"
  },
  priority: 2 // High priority
};

const task = await CoordinatorService.assignTaskToAgent(taskData);
```

### Requesting a Coordinated Decision

```typescript
const decision = await CoordinatorService.coordinateDecision(
  "market_entry",
  {
    asset: "SOL/USD",
    current_price: 45.78,
    signal_strength: 0.75
  },
  "democratic" // Use democratic voting
);
```

## Authentication

All API calls require a valid Supabase API key to be included in the request headers:

```
Authorization: Bearer your_supabase_key_here
```

## Error Handling

The API returns standard HTTP status codes:

- 200/201: Success
- 400: Bad request - check your input parameters
- 401: Unauthorized - invalid API key
- 404: Resource not found
- 500: Server error

All error responses include a message explaining the issue.

## Websocket Notifications

For real-time updates, you can subscribe to the Supabase realtime channel:

```typescript
const channel = supabase
  .channel('agent-messages')
  .on('broadcast', { event: 'new_message' }, (payload) => {
    console.log('New message:', payload);
  })
  .subscribe();
``` 