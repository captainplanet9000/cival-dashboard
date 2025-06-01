-- Migration: Add Workflow System for Trading Farm
-- Description: Creates tables for the agent workflow system including workflows, steps, schedules, etc.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed', 'archived')),
    parameters JSONB DEFAULT '{}'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for workflows
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workflows" 
    ON public.workflows FOR SELECT
    USING (auth.uid() = metadata->>'owner_id' OR metadata->>'is_public' = 'true');

CREATE POLICY "Users can insert their own workflows" 
    ON public.workflows FOR INSERT
    WITH CHECK (auth.uid() = metadata->>'owner_id');

CREATE POLICY "Users can update their own workflows" 
    ON public.workflows FOR UPDATE
    USING (auth.uid() = metadata->>'owner_id')
    WITH CHECK (auth.uid() = metadata->>'owner_id');

CREATE POLICY "Users can delete their own workflows" 
    ON public.workflows FOR DELETE
    USING (auth.uid() = metadata->>'owner_id');

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_workflows
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create workflow_steps table
CREATE TABLE IF NOT EXISTS public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id), -- May be null for system steps
    type TEXT NOT NULL CHECK (type IN ('llm_analysis', 'tool_execution', 'decision', 'collaboration', 'notification', 'system')),
    position INTEGER NOT NULL,
    parameters JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    result JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for workflow_steps
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view steps for workflows they own" 
    ON public.workflow_steps FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND (w.metadata->>'owner_id' = auth.uid() OR w.metadata->>'is_public' = 'true')
    ));

CREATE POLICY "Users can insert steps for workflows they own" 
    ON public.workflow_steps FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

CREATE POLICY "Users can update steps for workflows they own" 
    ON public.workflow_steps FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

CREATE POLICY "Users can delete steps for workflows they own" 
    ON public.workflow_steps FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_workflow_steps
    BEFORE UPDATE ON public.workflow_steps
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create workflow_schedules table
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cron_expression TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    next_run TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    parameters JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for workflow_schedules
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedules for workflows they own" 
    ON public.workflow_schedules FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND (w.metadata->>'owner_id' = auth.uid() OR w.metadata->>'is_public' = 'true')
    ));

CREATE POLICY "Users can insert schedules for workflows they own" 
    ON public.workflow_schedules FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

CREATE POLICY "Users can update schedules for workflows they own" 
    ON public.workflow_schedules FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

CREATE POLICY "Users can delete schedules for workflows they own" 
    ON public.workflow_schedules FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_workflow_schedules
    BEFORE UPDATE ON public.workflow_schedules
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    steps JSONB NOT NULL,
    agent_roles JSONB DEFAULT '[]'::JSONB,
    parameters JSONB DEFAULT '{}'::JSONB,
    category TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for workflow_templates
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all public templates and their own" 
    ON public.workflow_templates FOR SELECT
    USING (metadata->>'is_public' = 'true' OR metadata->>'owner_id' = auth.uid());

CREATE POLICY "Users can insert their own templates" 
    ON public.workflow_templates FOR INSERT
    WITH CHECK (metadata->>'owner_id' = auth.uid());

CREATE POLICY "Users can update their own templates" 
    ON public.workflow_templates FOR UPDATE
    USING (metadata->>'owner_id' = auth.uid())
    WITH CHECK (metadata->>'owner_id' = auth.uid());

CREATE POLICY "Users can delete their own templates" 
    ON public.workflow_templates FOR DELETE
    USING (metadata->>'owner_id' = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_workflow_templates
    BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create monitor_conditions table
CREATE TABLE IF NOT EXISTS public.monitor_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('price_threshold', 'volatility', 'news_event', 'technical_indicator', 'volume_spike', 'custom')),
    parameters JSONB DEFAULT '{}'::JSONB,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for monitor_conditions
ALTER TABLE public.monitor_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view monitor conditions for workflows they own" 
    ON public.monitor_conditions FOR SELECT
    USING (
        workflow_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.workflows w
            WHERE w.id = workflow_id AND (w.metadata->>'owner_id' = auth.uid() OR w.metadata->>'is_public' = 'true')
        )
    );

CREATE POLICY "Users can insert monitor conditions for workflows they own" 
    ON public.monitor_conditions FOR INSERT
    WITH CHECK (
        workflow_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.workflows w
            WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
        )
    );

CREATE POLICY "Users can update monitor conditions for workflows they own" 
    ON public.monitor_conditions FOR UPDATE
    USING (
        workflow_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.workflows w
            WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
        )
    );

CREATE POLICY "Users can delete monitor conditions for workflows they own" 
    ON public.monitor_conditions FOR DELETE
    USING (
        workflow_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.workflows w
            WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_monitor_conditions
    BEFORE UPDATE ON public.monitor_conditions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create workflow_executions table to track execution history
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'schedule', 'condition', 'api')),
    reference_id UUID, -- ID of schedule or condition that triggered this
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    parameters JSONB DEFAULT '{}'::JSONB,
    results JSONB DEFAULT '{}'::JSONB,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for workflow_executions
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view executions for workflows they own" 
    ON public.workflow_executions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND (w.metadata->>'owner_id' = auth.uid() OR w.metadata->>'is_public' = 'true')
    ));

CREATE POLICY "Users can insert executions for workflows they own" 
    ON public.workflow_executions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

CREATE POLICY "Users can update executions for workflows they own" 
    ON public.workflow_executions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.metadata->>'owner_id' = auth.uid()
    ));

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_workflow_executions
    BEFORE UPDATE ON public.workflow_executions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Add workflow execution step tracking
CREATE TABLE IF NOT EXISTS public.workflow_execution_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES public.workflow_steps(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    result JSONB DEFAULT NULL,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for workflow_execution_steps
ALTER TABLE public.workflow_execution_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view execution steps for workflows they own" 
    ON public.workflow_execution_steps FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.workflow_executions e
        JOIN public.workflows w ON w.id = e.workflow_id
        WHERE e.id = execution_id AND (w.metadata->>'owner_id' = auth.uid() OR w.metadata->>'is_public' = 'true')
    ));

CREATE POLICY "Users can insert execution steps for workflows they own" 
    ON public.workflow_execution_steps FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.workflow_executions e
        JOIN public.workflows w ON w.id = e.workflow_id
        WHERE e.id = execution_id AND w.metadata->>'owner_id' = auth.uid()
    ));

CREATE POLICY "Users can update execution steps for workflows they own" 
    ON public.workflow_execution_steps FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.workflow_executions e
        JOIN public.workflows w ON w.id = e.workflow_id
        WHERE e.id = execution_id AND w.metadata->>'owner_id' = auth.uid()
    ));

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_workflow_execution_steps
    BEFORE UPDATE ON public.workflow_execution_steps
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create function to instantiate a workflow from a template
CREATE OR REPLACE FUNCTION public.instantiate_workflow_template(
    template_id UUID,
    workflow_name TEXT DEFAULT NULL,
    workflow_description TEXT DEFAULT NULL,
    workflow_parameters JSONB DEFAULT NULL,
    workflow_metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_template public.workflow_templates;
    v_workflow_id UUID;
    v_step_data JSONB;
    v_position INTEGER;
BEGIN
    -- Get the template
    SELECT * INTO v_template FROM public.workflow_templates WHERE id = template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template with ID % not found', template_id;
    END IF;
    
    -- Create a new workflow from the template
    INSERT INTO public.workflows (
        name,
        description,
        status,
        parameters,
        metadata
    ) VALUES (
        COALESCE(workflow_name, v_template.name || ' (from template)'),
        COALESCE(workflow_description, v_template.description),
        'draft',
        COALESCE(workflow_parameters, v_template.parameters),
        COALESCE(workflow_metadata, jsonb_build_object('template_id', template_id, 'owner_id', auth.uid()))
    )
    RETURNING id INTO v_workflow_id;
    
    -- Create steps for the new workflow
    v_position := 0;
    FOR v_step_data IN SELECT * FROM jsonb_array_elements(v_template.steps)
    LOOP
        v_position := v_position + 1;
        
        INSERT INTO public.workflow_steps (
            workflow_id,
            agent_id,
            type,
            position,
            parameters,
            status
        ) VALUES (
            v_workflow_id,
            (v_step_data->>'agent_id')::UUID,
            v_step_data->>'type',
            v_position,
            COALESCE((v_step_data->>'parameters')::JSONB, '{}'::JSONB),
            'pending'
        );
    END LOOP;
    
    RETURN v_workflow_id;
END;
$$;

-- Create function to trigger a workflow execution
CREATE OR REPLACE FUNCTION public.trigger_workflow_execution(
    workflow_id UUID,
    trigger_type TEXT DEFAULT 'manual',
    reference_id UUID DEFAULT NULL,
    execution_parameters JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_workflow public.workflows;
    v_execution_id UUID;
    v_step public.workflow_steps;
BEGIN
    -- Check if workflow exists and is active
    SELECT * INTO v_workflow FROM public.workflows WHERE id = workflow_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workflow with ID % not found', workflow_id;
    END IF;
    
    IF v_workflow.status != 'active' THEN
        RAISE EXCEPTION 'Workflow with ID % is not active (status: %)', workflow_id, v_workflow.status;
    END IF;
    
    -- Create new execution record
    INSERT INTO public.workflow_executions (
        workflow_id,
        triggered_by,
        reference_id,
        status,
        parameters,
        started_at
    ) VALUES (
        workflow_id,
        trigger_type,
        reference_id,
        'pending',
        COALESCE(execution_parameters, v_workflow.parameters),
        NOW()
    )
    RETURNING id INTO v_execution_id;
    
    -- Create execution steps for each workflow step
    FOR v_step IN 
        SELECT * FROM public.workflow_steps 
        WHERE workflow_id = workflow_id 
        ORDER BY position
    LOOP
        INSERT INTO public.workflow_execution_steps (
            execution_id,
            step_id,
            status
        ) VALUES (
            v_execution_id,
            v_step.id,
            'pending'
        );
    END LOOP;
    
    -- Update execution status to running
    UPDATE public.workflow_executions 
    SET status = 'running' 
    WHERE id = v_execution_id;
    
    -- If triggered by schedule, update the last_run timestamp
    IF trigger_type = 'schedule' AND reference_id IS NOT NULL THEN
        UPDATE public.workflow_schedules
        SET last_run = NOW()
        WHERE id = reference_id;
    END IF;
    
    -- If triggered by monitor condition, update the last_triggered timestamp and increment trigger_count
    IF trigger_type = 'condition' AND reference_id IS NOT NULL THEN
        UPDATE public.monitor_conditions
        SET last_triggered = NOW(), trigger_count = trigger_count + 1
        WHERE id = reference_id;
    END IF;
    
    RETURN v_execution_id;
END;
$$;

-- Create example workflow templates for common use cases
INSERT INTO public.workflow_templates (
    name, 
    description, 
    steps, 
    agent_roles, 
    parameters, 
    category,
    metadata
) VALUES (
    'Volatility-Based Position Sizing',
    'Automatically adjusts position sizes based on asset volatility to maintain consistent risk exposure.',
    '[
        {
            "type": "tool_execution",
            "agent_id": null,
            "parameters": {
                "toolName": "market_sentiment",
                "parameters": {
                    "query": "Overall market volatility assessment"
                }
            }
        },
        {
            "type": "tool_execution",
            "agent_id": null,
            "parameters": {
                "toolName": "price_analysis",
                "parameters": {
                    "exchange": "${parameters.exchange}",
                    "assets": "${parameters.targetAssets}",
                    "indicator": "volatility",
                    "params": {
                        "period": "${parameters.volatilityLookbackDays}"
                    }
                }
            }
        },
        {
            "type": "llm_analysis",
            "agent_id": null,
            "parameters": {
                "prompt": "Calculate the optimal position sizes in USD for a ${parameters.portfolioValue} portfolio across the following assets: ${parameters.targetAssets}.\nThe goal is to maintain a consistent risk contribution per asset based on volatility.\n\nInputs:\n- Total Portfolio Value: ${parameters.portfolioValue}\n- Risk Factor per Position: ${parameters.riskFactor}\n- Asset Volatilities (from step 2): ${results[\"step-2-asset-volatility\"].result}\n- Current Market Volatility Condition (from step 1): ${results[\"step-1-market-conditions\"].result.marketVolatility || \"normal\"}\n- Market Volatility Factor (Normal): ${parameters.marketVolatilityFactorNormal}\n- Market Volatility Factor (High): ${parameters.marketVolatilityFactorHigh}\n\nCalculation Logic:\n1. Determine the Market Volatility Factor based on the Current Market Volatility Condition.\n2. For each asset:\n   Position Size (USD) = (Portfolio Value * Risk Factor) / (Asset Volatility * Market Volatility Factor)\n   Ensure Asset Volatility is the raw decimal value (e.g., 0.03 for 3%). If it is annualized, adjust accordingly. If the tool provides % value, convert it (e.g., 3 -> 0.03).\n3. Ensure the total allocated size does not exceed the portfolio value. If it does, scale down proportionally.\n\nOutput Format:\nReturn a JSON object mapping each asset symbol to its calculated position size in USD."
            }
        },
        {
            "type": "decision",
            "agent_id": null,
            "parameters": {
                "condition": "typeof results[\"step-3-calculate-sizes\"].result === \"object\" && results[\"step-3-calculate-sizes\"].result !== null && parameters.targetAssets.every(asset => typeof results[\"step-3-calculate-sizes\"].result[asset] === \"number\" && results[\"step-3-calculate-sizes\"].result[asset] >= 0) && Object.values(results[\"step-3-calculate-sizes\"].result).reduce((sum, size) => sum + size, 0) <= parameters.portfolioValue",
                "options": [
                    { "value": "true", "nextStep": "step-5-execute-trades" },
                    { "value": "false", "nextStep": "step-6-manual-review", "isDefault": true }
                ]
            }
        },
        {
            "type": "tool_execution",
            "agent_id": null,
            "parameters": {
                "toolName": "portfolio_rebalance",
                "parameters": {
                    "exchange": "${parameters.exchange}",
                    "targetAllocations": "${results[\"step-3-calculate-sizes\"].result}",
                    "portfolioValue": "${parameters.portfolioValue}",
                    "executionStrategy": "market_order",
                    "allowPartialFills": true,
                    "maxSlippagePercent": 0.5
                }
            }
        },
        {
            "type": "notification",
            "agent_id": null,
            "parameters": {
                "toolName": "send_alert",
                "parameters": {
                    "channel": "email",
                    "recipient": "${parameters.notification_email}",
                    "subject": "Manual Review Required: Volatility Position Sizing Failed",
                    "message": "Workflow \"${workflow.name}\" requires manual review.\nReason: Failed validation at Step 4.\nCalculated Sizes: ${JSON.stringify(results[\"step-3-calculate-sizes\"]?.result, null, 2)}\nVolatility Data: ${JSON.stringify(results[\"step-2-asset-volatility\"]?.result, null, 2)}\nMarket Condition: ${results[\"step-1-market-conditions\"]?.result?.marketVolatility}\nWorkflow ID: ${workflow.id}"
                }
            }
        },
        {
            "type": "llm_analysis",
            "agent_id": null,
            "parameters": {
                "prompt": "Generate a summary report for the Volatility-Based Position Sizing workflow execution (ID: ${workflow.id}).\n\nInclude the following sections:\n1. **Execution Overview**: Start time, End time, Final Status (${results[\"step-4-validate-sizes\"]?.result === \"true\" ? \"Trades Executed\" : \"Manual Review Required\"}).\n2. **Market Context**: Assessed Market Volatility (${results[\"step-1-market-conditions\"]?.result?.marketVolatility}).\n3. **Asset Volatility**: Calculated volatilities (${JSON.stringify(results[\"step-2-asset-volatility\"]?.result, null, 2)}).\n4. **Calculated Position Sizes**: Target allocations (${JSON.stringify(results[\"step-3-calculate-sizes\"]?.result, null, 2)}).\n5. **Execution Details**: (If trades executed) Summary of trades placed by step 5 (${JSON.stringify(results[\"step-5-execute-trades\"]?.result, null, 2)}). (If manual review) Note that review is required (${JSON.stringify(results[\"step-6-manual-review\"]?.result, null, 2)}).\n6. **Parameters Used**: Portfolio Value (${parameters.portfolioValue}), Risk Factor (${parameters.riskFactor}), Target Assets (${parameters.targetAssets}).\n\nFormat as a clear, concise Markdown report."
            }
        }
    ]'::JSONB,
    '[
        {
            "name": "market_analyst",
            "required": true,
            "description": "Analyzes market conditions and asset volatility"
        },
        {
            "name": "trade_executor",
            "required": true,
            "description": "Executes trades based on calculated position sizes"
        }
    ]'::JSONB,
    '{
        "marketConditions": "normal",
        "riskFactor": 0.02,
        "portfolioValue": 100000,
        "targetAssets": ["BTC/USD", "ETH/USD", "SOL/USD"],
        "exchange": "binance",
        "volatilityLookbackDays": 30,
        "marketVolatilityFactorNormal": 1.0,
        "marketVolatilityFactorHigh": 1.2,
        "notification_email": "trader@example.com"
    }'::JSONB,
    'trading',
    '{"is_public": "true", "template_version": "1.0"}'::JSONB
),
(
    'Price Alert Trigger',
    'Monitors price thresholds and triggers actions when crossed.',
    '[
        {
            "type": "tool_execution",
            "agent_id": null,
            "parameters": {
                "toolName": "exchange_data",
                "parameters": {
                    "exchange": "${parameters.exchange}",
                    "symbol": "${parameters.asset}",
                    "dataType": "price"
                }
            }
        },
        {
            "type": "decision",
            "agent_id": null,
            "parameters": {
                "condition": "(parameters.direction === \"above\" && results[\"step-1-get-price\"].result.price > parameters.threshold) || (parameters.direction === \"below\" && results[\"step-1-get-price\"].result.price < parameters.threshold)",
                "options": [
                    { "value": "true", "nextStep": "step-3-execute-action" },
                    { "value": "false", "nextStep": "step-4-no-action" }
                ]
            }
        },
        {
            "type": "tool_execution",
            "agent_id": null,
            "parameters": {
                "toolName": "${parameters.actionType}",
                "parameters": "${parameters.actionParameters}"
            }
        },
        {
            "type": "notification",
            "agent_id": null,
            "parameters": {
                "toolName": "send_alert",
                "parameters": {
                    "channel": "${parameters.notificationChannel}",
                    "recipient": "${parameters.notificationRecipient}",
                    "subject": "No Action - Price Threshold Not Met",
                    "message": "Current price of ${parameters.asset} (${results[\"step-1-get-price\"].result.price}) has not crossed the ${parameters.direction} threshold of ${parameters.threshold}."
                }
            }
        }
    ]'::JSONB,
    '[
        {
            "name": "monitor_agent",
            "required": true,
            "description": "Monitors price and executes actions when thresholds are crossed"
        }
    ]'::JSONB,
    '{
        "exchange": "binance",
        "asset": "BTC/USD",
        "direction": "above",
        "threshold": 50000,
        "actionType": "notification",
        "actionParameters": {
            "channel": "email",
            "recipient": "trader@example.com",
            "subject": "Price Alert: ${parameters.asset} crossed ${parameters.threshold}",
            "message": "The price of ${parameters.asset} has crossed the ${parameters.direction} threshold of ${parameters.threshold}. Current price: ${results[\"step-1-get-price\"].result.price}"
        },
        "notificationChannel": "email",
        "notificationRecipient": "trader@example.com"
    }'::JSONB,
    'monitoring',
    '{"is_public": "true", "template_version": "1.0"}'::JSONB
);
