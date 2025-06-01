# Trading Farm Onboarding Guide

Welcome to the Trading Farm platform! This guide will help you get started with creating farms, assigning agents, monitoring performance, and using manual controls.

---

## 1. Creating a Farm
- Go to the Farms dashboard.
- Click **"Create Farm"** and fill in the required details (name, description, initial capital, etc.).
- Save to create your new farm.

## 2. Assigning Agents
- Navigate to your farm's detail page.
- Click **"Assign Agent"**.
- Select an agent, set allocation percentage, toggle primary/secondary, and add instructions if needed.
- Submit to assign the agent to your farm or goal.
- Assignments are visible in the farm's agent list and update in real time.

## 3. Monitoring Agents
- Go to the **Agent Monitoring Dashboard** for any farm or agent.
- View live health metrics, logs, and performance charts.
- Check the **Event Feed** and **Anomaly Alerts** for real-time updates.
- Use search and filters to drill down into logs and events.

## 4. Using Manual Controls
- On the dashboard, use the **Emergency Stop** button to halt an agent instantly.
- Use **Manual Trade** to place a market order directly from the UI.
- Use **Rebalance** to trigger a portfolio rebalance for the agent.
- All manual actions are logged and reflected in real time.

## 5. Tips
- All actions are secured by Row Level Security (RLS).
- Use the real-time event feed for troubleshooting and compliance.
- Refer to the API/Operational docs for advanced integrations.

---

# API & Operational Documentation

## Key Endpoints
- **/api/farms**: CRUD for farms
- **/api/agents**: CRUD for agents
- **/api/assignments**: Assign/unassign agents
- **/api/orders**: Place, modify, cancel orders
- **/api/positions**: Query current and historical positions
- **/api/events**: Fetch agent/farm events
- **/api/alerts**: Fetch and resolve anomaly alerts

## Hooks (Frontend)
- `useFarm`, `useFarms`: Fetch farm(s)
- `useAgentAssignments`, `useCreateAgentAssignment`: CRUD for assignments
- `useAgentEvents`, `useAgentAnomalyAlerts`: Real-time event/alert feeds
- `useSupabaseRealtime`: Global real-time cache invalidation

## Database Schema (Supabase)
- **farms**: id, name, description, owner_id, created_at
- **agents**: id, name, type, status, created_at
- **agent_assignments**: id, farm_id, agent_id, allocation_percentage, is_primary, instructions, created_at
- **orders**: id, agent_id, symbol, side, quantity, order_type, status, metadata, created_at
- **positions**: id, agent_id, farm_id, size, entry_price, current_price, pnl, created_at
- **agent_events**: id, agent_id, type, source, content, metadata, created_at
- **agent_anomaly_alerts**: id, agent_id, alert_type, description, resolved, created_at
- All tables have RLS enabled and audit triggers for created_at/updated_at.

---

# Go-Live Checklist

- [ ] **Environment Variables:**
    - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
    - Exchange API keys (Bybit, Coinbase, Hyperliquid, etc.)
    - ElizaOS integration keys (if needed)
- [ ] **Secrets Management:**
    - Store all secrets in a secure vault or environment config
    - Never commit secrets to version control
- [ ] **Backups:**
    - Enable daily Supabase backups
    - Export critical tables before launch
- [ ] **Monitoring:**
    - Enable Supabase logs and error notifications
    - Set up health checks for backend and agents
    - Add alerting for failed trades, agent errors, and anomalies
- [ ] **Testing:**
    - Run all unit, integration, and end-to-end tests
    - Complete an extended paper trading simulation
- [ ] **Compliance:**
    - Audit RLS policies and critical action logs
    - Review user roles and permissions
- [ ] **Documentation:**
    - Ensure onboarding and API docs are up to date
    - Provide usage examples and troubleshooting tips
- [ ] **Go-Live:**
    - Run a final go-live review with your team
    - Start with minimal funds, monitor closely, and scale up as confidence grows

---

For more details, see the README or contact the project maintainer.

---

## Agent Orchestration Route (2025-04-17)

- **Route:** `/dashboard/agent-orchestration`
- **Label:** Agent Orchestration
- **Group:** AI Center (and mobile secondary nav)
- **Icon:** Users
- **Roles:** admin
- **Purpose:** Access the Agent Orchestration dashboard for multi-agent coordination, assignment, and monitoring.
- **Integration:**
  - Fully integrated with Supabase for live agent assignment, event feeds, and anomaly alert resolution.
  - Appears in both main and mobile navigation for admin users.
  - Navigating to this route displays the Agent Orchestration UI for real-time management of agent teams and workflows.

**Note:** Ensure your user account has the `admin` role to access this feature.
