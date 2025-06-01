# Usage Examples: Trading Farm

## 1. Agent Creation & Assignment
```ts
// In dashboard UI or via API
await createAgent({ name: 'AlphaBot', strategyId: 'strat-1', farmId: 'farm-1' });
```

## 2. Strategy Deployment
```ts
// Assign a strategy to an agent
await assignStrategyToAgent({ agentId: 'agent-1', strategyId: 'strat-2' });
```

## 3. Manual Controls
```tsx
<EmergencyStopButton agentId="agent-123" />
<ManualTradeDialog onSubmit={order => submitOrder(order)} />
<RebalanceDialog onRebalance={params => rebalancePortfolio(params)} />
```

## 4. Monitoring & Alerting
```tsx
// Use dashboard widgets
<AgentHealthWidget agentId="agent-123" />
<AlertBanner message="Risk limit exceeded!" />
```

## 5. Paper Trading Simulation
- Enable `paperTrading: true` in agent config.
- Run simulation and monitor results in the dashboard.

## 6. API Example
```http
POST /api/agents { name, strategyId, ... }
GET /api/orders?agentId=...
```

---
See full documentation in `src/core/README.md` and API reference for more.
