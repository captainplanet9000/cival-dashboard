# Trading Farm Agent Orchestration & Monitoring

This document describes the architecture and integration points for agent orchestration and monitoring in the Trading Farm platform, including ElizaOS integration.

---

## Overview

Phase 4 enables robust orchestration and real-time monitoring of autonomous trading agents. Key features include:
- Agent assignment to farms, strategies, and wallets
- Real-time agent lifecycle controls (start, pause, stop, reassign)
- ElizaOS command console for multi-agent coordination and feedback
- Visualization of agent actions, trade results, and health metrics
- Anomaly/error detection and alerting

---

## Backend Architecture

### Key Services
- `agent-service.ts`: Core CRUD and orchestration for agents
- `agent-coordination-service.ts`: Multi-agent coordination logic
- `eliza-agent-service.ts` / `eliza-agent-integration.ts`: ElizaOS command routing and memory integration
- Real-time event emission via WebSocket or TanStack Query subscriptions

### Endpoints
- `/api/agents/*`: Assignment, lifecycle, and status endpoints
- `/api/elizaos/*`: ElizaOS command/feedback endpoints

### Logging & Monitoring
- All agent actions and errors are logged via `log-manager.ts`
- Anomalies and critical events are flagged for alerting

---

## Frontend Architecture

### Key Components
- `farm-agent-assignment.tsx`, `farm-agents-table.tsx`, `farm-agent-manager.tsx`: Agent assignment and management UI
- `elizaos-agent-config.tsx`, `elizaos-agent-metrics.tsx`, `elizaos-agent-logs.tsx`: ElizaOS command console, agent metrics, and logs
- Health/alert widgets and notification banners for real-time feedback

### Real-Time Data Flow
- TanStack Query hooks (`use-agent-queries.ts`, `use-agent-mutations.ts`) for live agent status, actions, and health
- WebSocket integration for instant event updates

---

## ElizaOS Integration
- Agents can be controlled and queried via the ElizaOS command console
- Multi-agent coordination and memory actions are supported
- All ElizaOS actions are logged and monitored for feedback

---

## Error & Anomaly Detection
- Backend monitors agent activity and triggers alerts on anomalies
- Frontend displays alerts, warnings, and system health in real-time

---

## Example Usage

- Assign an agent to a farm/strategy via the dashboard UI
- Use the ElizaOS command console to start, pause, or stop agents and receive feedback
- Monitor agent trades, health, and alerts in real-time on the dashboard

---

## Extending & Customizing
- Add new agent types or orchestration logic in `agent-coordination-service.ts`
- Extend ElizaOS actions or memory integrations in `eliza-agent-integration.ts`
- Add new dashboard widgets for custom health metrics or alerts

---

For more details, see inline comments in each service/component file.
