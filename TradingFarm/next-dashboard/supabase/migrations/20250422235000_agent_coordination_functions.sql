-- Migration: Agent Coordination System
-- This migration adds tables and functions for coordinating agent tasks and assignments

-- Create enums for agent tasks
DO $$ BEGIN
    CREATE TYPE agent_task_status_enum AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'canceled');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_task_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_capability_enum AS ENUM ('trading', 'analysis', 'research', 'monitoring', 'reporting', 'communication', 'execution');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create table for agent tasks
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status agent_task_status_enum NOT NULL DEFAULT 'pending',
    priority agent_task_priority_enum NOT NULL DEFAULT 'medium',
    required_capabilities agent_capability_enum[] NOT NULL,
    assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create table for agent capabilities
CREATE TABLE IF NOT EXISTS public.agent_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    capability agent_capability_enum NOT NULL,
    proficiency INTEGER NOT NULL DEFAULT 1 CHECK (proficiency BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, capability)
);

-- Create table for agent task dependencies
CREATE TABLE IF NOT EXISTS public.agent_task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
    dependent_on_task_id UUID NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, dependent_on_task_id),
    CHECK (task_id != dependent_on_task_id) -- Prevent self-dependency
);

-- Create table for agent task logs
CREATE TABLE IF NOT EXISTS public.agent_task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for agent coordination rules
CREATE TABLE IF NOT EXISTS public.agent_coordination_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_coordination_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_tasks
CREATE POLICY "Users can view agent tasks they created or in their farms" 
    ON public.agent_tasks FOR SELECT 
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = agent_tasks.farm_id
        )
    );

CREATE POLICY "Users can insert agent tasks in their farms" 
    ON public.agent_tasks FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = agent_tasks.farm_id
        )
    );

CREATE POLICY "Users can update agent tasks they created or in their farms" 
    ON public.agent_tasks FOR UPDATE 
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = agent_tasks.farm_id
        )
    );

CREATE POLICY "Users can delete agent tasks they created" 
    ON public.agent_tasks FOR DELETE 
    USING (auth.uid() = created_by);

-- RLS policies for agent_capabilities
CREATE POLICY "Anyone can view agent capabilities" 
    ON public.agent_capabilities FOR SELECT 
    USING (true);

CREATE POLICY "Only admins can modify agent capabilities" 
    ON public.agent_capabilities FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS policies for agent_task_dependencies
CREATE POLICY "Users can view task dependencies they have access to" 
    ON public.agent_task_dependencies FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_tasks
            WHERE id = agent_task_dependencies.task_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.farm_members 
                    WHERE user_id = auth.uid() AND farm_id = agent_tasks.farm_id
                )
            )
        )
    );

CREATE POLICY "Users can create task dependencies for tasks they manage" 
    ON public.agent_task_dependencies FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agent_tasks
            WHERE id = agent_task_dependencies.task_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.farm_members 
                    WHERE user_id = auth.uid() AND farm_id = agent_tasks.farm_id AND role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Users can delete task dependencies they manage" 
    ON public.agent_task_dependencies FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_tasks
            WHERE id = agent_task_dependencies.task_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.farm_members 
                    WHERE user_id = auth.uid() AND farm_id = agent_tasks.farm_id AND role = 'admin'
                )
            )
        )
    );

-- RLS policies for agent_task_logs
CREATE POLICY "Users can view task logs they have access to" 
    ON public.agent_task_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.agent_tasks
            WHERE id = agent_task_logs.task_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.farm_members 
                    WHERE user_id = auth.uid() AND farm_id = agent_tasks.farm_id
                )
            )
        )
    );

CREATE POLICY "Anyone can insert task logs (restricted by application logic)" 
    ON public.agent_task_logs FOR INSERT 
    WITH CHECK (true);

-- RLS policies for agent_coordination_rules
CREATE POLICY "Users can view coordination rules in their farms" 
    ON public.agent_coordination_rules FOR SELECT 
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = agent_coordination_rules.farm_id
        )
    );

CREATE POLICY "Users can insert coordination rules in their farms" 
    ON public.agent_coordination_rules FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = agent_coordination_rules.farm_id AND role = 'admin'
        )
    );

CREATE POLICY "Users can update coordination rules they created or as farm admin" 
    ON public.agent_coordination_rules FOR UPDATE 
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = agent_coordination_rules.farm_id AND role = 'admin'
        )
    );

CREATE POLICY "Users can delete coordination rules they created or as farm admin" 
    ON public.agent_coordination_rules FOR DELETE 
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = agent_coordination_rules.farm_id AND role = 'admin'
        )
    );

-- Trigger functions for timestamps
DROP TRIGGER IF EXISTS agent_tasks_created_at ON public.agent_tasks;
CREATE TRIGGER agent_tasks_created_at BEFORE INSERT ON public.agent_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS agent_tasks_updated_at ON public.agent_tasks;
CREATE TRIGGER agent_tasks_updated_at BEFORE UPDATE ON public.agent_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS agent_capabilities_created_at ON public.agent_capabilities;
CREATE TRIGGER agent_capabilities_created_at BEFORE INSERT ON public.agent_capabilities FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS agent_capabilities_updated_at ON public.agent_capabilities;
CREATE TRIGGER agent_capabilities_updated_at BEFORE UPDATE ON public.agent_capabilities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS agent_coordination_rules_created_at ON public.agent_coordination_rules;
CREATE TRIGGER agent_coordination_rules_created_at BEFORE INSERT ON public.agent_coordination_rules FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS agent_coordination_rules_updated_at ON public.agent_coordination_rules;
CREATE TRIGGER agent_coordination_rules_updated_at BEFORE UPDATE ON public.agent_coordination_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
