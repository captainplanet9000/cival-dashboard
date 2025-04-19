-- Migration: Agent Assignment, Event Logging, and Anomaly Alerting
-- PHASE 4: Agent Orchestration & Monitoring

-- 1. Agent Assignment Table (agent_assignments)
CREATE TABLE IF NOT EXISTS public.agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_id ON public.agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_farm_id ON public.agent_assignments(farm_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_strategy_id ON public.agent_assignments(strategy_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_wallet_id ON public.agent_assignments(wallet_id);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_agent_assignments_created_at ON public.agent_assignments;
CREATE TRIGGER handle_agent_assignments_created_at
BEFORE INSERT ON public.agent_assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_agent_assignments_updated_at ON public.agent_assignments;
CREATE TRIGGER handle_agent_assignments_updated_at
BEFORE UPDATE ON public.agent_assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS and policies
ALTER TABLE public.agent_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view agent assignments they have access to"
ON public.agent_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = agent_assignments.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_agents.farm_id
        AND farm_users.user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "Users can manage agent assignments for their agents"
ON public.agent_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = agent_assignments.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_agents.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin')
      )
    )
  )
);

-- 2. Agent Events Table (agent_events)
CREATE TABLE IF NOT EXISTS public.agent_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON public.agent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON public.agent_events(event_type);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_agent_events_created_at ON public.agent_events;
CREATE TRIGGER handle_agent_events_created_at
BEFORE INSERT ON public.agent_events
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view agent events they have access to"
ON public.agent_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = agent_events.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_agents.farm_id
        AND farm_users.user_id = auth.uid()
      )
    )
  )
);

-- 3. Agent Anomaly Alerts Table (agent_anomaly_alerts)
CREATE TABLE IF NOT EXISTS public.agent_anomaly_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
    alert_type VARCHAR(32) NOT NULL,
    alert_message TEXT NOT NULL,
    alert_data JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_anomaly_alerts_agent_id ON public.agent_anomaly_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_anomaly_alerts_alert_type ON public.agent_anomaly_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_agent_anomaly_alerts_resolved ON public.agent_anomaly_alerts(resolved);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_agent_anomaly_alerts_created_at ON public.agent_anomaly_alerts;
CREATE TRIGGER handle_agent_anomaly_alerts_created_at
BEFORE INSERT ON public.agent_anomaly_alerts
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

ALTER TABLE public.agent_anomaly_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view agent anomaly alerts they have access to"
ON public.agent_anomaly_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = agent_anomaly_alerts.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_agents.farm_id
        AND farm_users.user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "Users can resolve their agent anomaly alerts"
ON public.agent_anomaly_alerts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = agent_anomaly_alerts.agent_id
    AND elizaos_agents.user_id = auth.uid()
  )
);

-- END PHASE 4 MIGRATION
