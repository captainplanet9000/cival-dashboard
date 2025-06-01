# Agent Collaboration System Documentation

## Overview

The Agent Collaboration System enables coordinated workflows between multiple agents in a farm, allowing them to work together on complex trading operations. This system leverages the specialized skills of different agent types (Analysts, Traders, Monitors) to achieve superior results through structured collaboration.

## Key Features

- **Predefined Collaboration Flows**: Structured workflows with step-by-step coordination
- **Role-Based Execution**: Agent actions based on clearly defined roles (Initiator, Executor, Reviewer, Observer)
- **Approval Workflows**: Critical steps require explicit approval from authorized agents
- **Progress Tracking**: Real-time monitoring of collaboration status and progress
- **Results Summarization**: Comprehensive summaries of completed collaborations using LLM technology

## Components

### Core Services

- **AgentCollaborationService**: Manages collaboration tasks, flows, and step execution

### API Endpoints

- **/api/collaborations**: List and create collaboration tasks
- **/api/collaborations/[taskId]**: Manage individual collaboration tasks
- **/api/collaborations/[taskId]/steps**: Execute and approve collaboration steps
- **/api/collaborations/flows**: List available collaboration flow templates

### UI Components

- **AgentCollaboration**: Main component for creating and managing collaborations
- **CollaborationDetails**: Component for viewing and interacting with a specific collaboration

## Collaboration Flows

The system includes several predefined collaboration flows:

### 1. Market Analysis and Trade

A coordinated workflow where an Analyst performs market analysis, a Trader reviews the analysis and executes a trade based on the analyst's recommendations, and a Monitor observes the execution.

**Steps:**
1. Analyst (Initiator): Perform market analysis on specified assets
2. Trader (Reviewer): Review market analysis and determine if trade is viable
3. Trader (Executor): Execute trade based on analysis recommendations
4. Monitor (Observer): Monitor trade execution and record results

### 2. Risk Assessment and Portfolio Rebalance

A workflow where a Monitor assesses portfolio risk, an Analyst reviews the assessment, and a Trader rebalances the portfolio based on the risk assessment.

**Steps:**
1. Monitor (Initiator): Evaluate portfolio risk metrics and identify imbalances
2. Analyst (Reviewer): Review risk assessment and provide recommendations
3. Trader (Executor): Rebalance portfolio based on risk assessment

### 3. Multi-Asset Analysis

A collaborative analysis involving multiple Analysts to create a comprehensive report on multiple assets, which is then reviewed by a Trader.

**Steps:**
1. Analyst (Initiator): Coordinate asset distribution and analysis parameters
2. Analyst (Executor): Perform analysis on assigned assets
3. Analyst (Executor): Compile individual analyses into comprehensive report
4. Trader (Reviewer): Review final report and determine actionable insights

## Agent Roles

Agents can take on different roles within a collaboration:

- **Initiator**: Starts the collaboration and typically performs the first step
- **Executor**: Performs action steps in the workflow
- **Reviewer**: Reviews and approves completed steps before proceeding
- **Observer**: Monitors the collaboration without direct action

## Task Lifecycle

1. **Creation**: An agent initiates a new collaboration task
2. **Assignment**: Agents are assigned to specific roles in the task
3. **Execution**: The workflow steps are executed in sequence
4. **Approval**: Critical steps require approval before advancing
5. **Completion**: The task is completed when all steps are finished
6. **Summarization**: An LLM-generated summary of the task results is created

## API Usage

### Listing Collaboration Flows

```typescript
// Get all collaboration flows
const response = await fetch('/api/collaborations/flows');
const { data: flows } = await response.json();

// Get flows for a specific agent type
const response = await fetch(`/api/collaborations/flows?agentType=TRADER`);
const { data: traderFlows } = await response.json();
```

### Creating a Collaboration Task

```typescript
const response = await fetch('/api/collaborations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    farmId: 'farm-123',
    flowId: 'market_analysis_and_trade',
    initiatorAgentId: 'agent-456',
    name: 'BTC Market Analysis and Trade',
    description: 'Analyze BTC market and execute trade if bullish',
    priority: 'HIGH',
    agentAssignments: {
      'agent-456': 'INITIATOR',
      'agent-789': 'EXECUTOR',
      'agent-101': 'REVIEWER'
    },
    metadata: {
      assets: 'BTC',
      tradingAmount: '1000'
    }
  }),
});
```

### Executing a Collaboration Step

```typescript
const response = await fetch(`/api/collaborations/${taskId}/steps`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'EXECUTE',
    agentId: 'agent-456',
    input: 'BTC shows bullish patterns with strong support at $50,000'
  }),
});
```

### Approving a Step

```typescript
const response = await fetch(`/api/collaborations/${taskId}/steps`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'APPROVE',
    agentId: 'agent-101',
    stepNumber: 2,
    notes: 'Analysis looks solid, approved for trade execution'
  }),
});
```

### Generating a Summary

```typescript
const response = await fetch(`/api/collaborations/${taskId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'GENERATE_SUMMARY'
  }),
});
```

## Integration with LLM Service

The Agent Collaboration System integrates with the LLM Service to:

1. Generate detailed summaries of completed collaborations
2. Analyze the results of each step for insights
3. Provide natural language explanations of complex trading operations

## Security and Permissions

- Only assigned agents can execute their designated steps
- Review and approval steps create accountability
- Task creation and execution are logged for audit purposes
- Agent trading limits are enforced in relevant collaboration steps

## Future Extensions

- **Custom Flows**: Allow users to create custom collaboration flows
- **Parallel Steps**: Enable concurrent execution of certain steps
- **Conditional Branching**: Add decision points that alter the workflow based on results
- **Cross-Farm Collaboration**: Enable collaboration between agents in different farms
- **Automated Agent Selection**: Intelligent matching of agents to roles based on performance 