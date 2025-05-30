-- Migration: Agent Coordination Core Functions
-- This migration adds core functions for agent task assignment and coordination

-- Function to find the best agent for a task based on capabilities and workload
CREATE OR REPLACE FUNCTION public.find_best_agent_for_task(
    p_task_id UUID,
    p_farm_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_agent_id UUID;
    v_required_capabilities agent_capability_enum[];
    v_task_priority agent_task_priority_enum;
BEGIN
    -- Get the task details
    SELECT required_capabilities, priority
    INTO v_required_capabilities, v_task_priority
    FROM public.agent_tasks
    WHERE id = p_task_id;
    
    IF v_required_capabilities IS NULL THEN
        RAISE EXCEPTION 'Task % not found or has no required capabilities', p_task_id;
    END IF;
    
    -- Find the best agent based on capability match and current workload
    WITH agent_capability_scores AS (
        -- Calculate capability match score for each agent
        SELECT 
            a.id AS agent_id,
            SUM(ac.proficiency) AS capability_score,
            COUNT(*) AS matching_capabilities,
            COUNT(*) = array_length(v_required_capabilities, 1) AS has_all_required
        FROM public.agents a
        JOIN public.agent_capabilities ac ON a.id = ac.agent_id
        WHERE 
            a.farm_id = p_farm_id
            AND a.status = 'active'
            AND ac.capability = ANY(v_required_capabilities)
        GROUP BY a.id
    ),
    agent_workloads AS (
        -- Calculate current workload for each agent
        SELECT 
            assigned_agent_id,
            COUNT(*) AS task_count,
            SUM(CASE 
                WHEN priority = 'critical' THEN 4
                WHEN priority = 'high' THEN 3
                WHEN priority = 'medium' THEN 2
                ELSE 1
            END) AS weighted_workload
        FROM public.agent_tasks
        WHERE 
            status IN ('assigned', 'in_progress')
            AND assigned_agent_id IS NOT NULL
        GROUP BY assigned_agent_id
    ),
    agent_rankings AS (
        -- Combine capability scores and workloads to rank agents
        SELECT 
            acs.agent_id,
            acs.capability_score,
            acs.matching_capabilities,
            acs.has_all_required,
            COALESCE(aw.weighted_workload, 0) AS weighted_workload,
            -- Ranking formula: prefer agents with all capabilities, then highest score, lowest workload
            CASE WHEN acs.has_all_required THEN 1 ELSE 0 END * 1000
            + acs.capability_score * 10
            - COALESCE(aw.weighted_workload, 0) AS rank_score
        FROM agent_capability_scores acs
        LEFT JOIN agent_workloads aw ON acs.agent_id = aw.assigned_agent_id
        WHERE 
            -- For critical tasks, require all capabilities
            (v_task_priority != 'critical' OR acs.has_all_required)
    )
    SELECT agent_id INTO v_agent_id
    FROM agent_rankings
    ORDER BY rank_score DESC
    LIMIT 1;
    
    RETURN v_agent_id;
END;
$$;

-- Function to assign a task to an agent
CREATE OR REPLACE FUNCTION public.assign_task_to_agent(
    p_task_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_auto_assign BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_task RECORD;
    v_agent_id UUID;
    v_result JSONB;
    v_user_id UUID;
BEGIN
    -- Get current user for access control
    v_user_id := auth.uid();
    
    -- Check if task exists and user has permission
    SELECT * INTO v_task
    FROM public.agent_tasks
    WHERE id = p_task_id;
    
    IF v_task IS NULL THEN
        RAISE EXCEPTION 'Task % not found', p_task_id;
    END IF;
    
    -- Check user permission
    IF NOT (v_user_id = v_task.created_by OR EXISTS (
        SELECT 1 FROM public.farm_members 
        WHERE user_id = v_user_id AND farm_id = v_task.farm_id
    )) THEN
        RAISE EXCEPTION 'Permission denied: Not authorized to assign this task';
    END IF;
    
    -- Check if task is already assigned
    IF v_task.status != 'pending' AND v_task.status != 'failed' THEN
        RAISE EXCEPTION 'Task is already % and cannot be assigned', v_task.status;
    END IF;
    
    -- If auto-assign is true, find the best agent
    IF p_auto_assign THEN
        v_agent_id := public.find_best_agent_for_task(p_task_id, v_task.farm_id);
        
        IF v_agent_id IS NULL THEN
            RAISE EXCEPTION 'No suitable agent found for task %', p_task_id;
        END IF;
    ELSE
        -- Otherwise use the specified agent
        v_agent_id := p_agent_id;
        
        -- Validate that agent exists and belongs to the same farm
        IF NOT EXISTS (
            SELECT 1 FROM public.agents
            WHERE id = v_agent_id AND farm_id = v_task.farm_id AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Invalid agent ID or agent not in the same farm as the task';
        END IF;
    END IF;
    
    -- Check for task dependencies
    IF EXISTS (
        SELECT 1 
        FROM public.agent_task_dependencies atd
        JOIN public.agent_tasks at ON atd.dependent_on_task_id = at.id
        WHERE 
            atd.task_id = p_task_id 
            AND at.status != 'completed'
    ) THEN
        RAISE EXCEPTION 'Task has uncompleted dependencies and cannot be assigned';
    END IF;
    
    -- Update the task with the assigned agent
    UPDATE public.agent_tasks
    SET 
        assigned_agent_id = v_agent_id,
        assigned_at = NOW(),
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING * INTO v_task;
    
    -- Log the assignment
    INSERT INTO public.agent_task_logs (
        task_id,
        agent_id,
        message,
        level
    ) VALUES (
        p_task_id,
        v_agent_id,
        CASE WHEN p_auto_assign 
            THEN 'Task automatically assigned to agent'
            ELSE 'Task manually assigned to agent'
        END,
        'info'
    );
    
    -- Return the updated task
    v_result := jsonb_build_object(
        'task_id', v_task.id,
        'title', v_task.title,
        'status', v_task.status,
        'agent_id', v_task.assigned_agent_id,
        'assigned_at', v_task.assigned_at
    );
    
    RETURN v_result;
END;
$$;

-- Function to update task status
CREATE OR REPLACE FUNCTION public.update_task_status(
    p_task_id UUID,
    p_status agent_task_status_enum,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_task RECORD;
    v_result JSONB;
    v_user_id UUID;
    v_log_level VARCHAR(20);
    v_agent_role TEXT;
BEGIN
    -- Get current user for access control
    v_user_id := auth.uid();
    
    -- Get the task
    SELECT * INTO v_task
    FROM public.agent_tasks
    WHERE id = p_task_id;
    
    IF v_task IS NULL THEN
        RAISE EXCEPTION 'Task % not found', p_task_id;
    END IF;
    
    -- Validate status transition
    CASE 
        WHEN p_status = 'in_progress' AND v_task.status != 'assigned' THEN
            RAISE EXCEPTION 'Task must be assigned before it can be in progress';
        WHEN p_status = 'completed' AND v_task.status != 'in_progress' THEN
            RAISE EXCEPTION 'Task must be in progress before it can be completed';
        WHEN p_status = 'failed' AND v_task.status NOT IN ('assigned', 'in_progress') THEN
            RAISE EXCEPTION 'Only assigned or in-progress tasks can be marked as failed';
        WHEN p_status = 'canceled' AND v_task.status IN ('completed', 'canceled') THEN
            RAISE EXCEPTION 'Completed or already canceled tasks cannot be canceled';
        ELSE
            -- Valid transition
    END CASE;
    
    -- Update timestamps based on status change
    UPDATE public.agent_tasks
    SET 
        status = p_status,
        started_at = CASE WHEN p_status = 'in_progress' AND v_task.started_at IS NULL THEN NOW() ELSE v_task.started_at END,
        completed_at = CASE WHEN p_status IN ('completed', 'failed', 'canceled') THEN NOW() ELSE v_task.completed_at END,
        updated_at = NOW()
    WHERE id = p_task_id
    RETURNING * INTO v_task;
    
    -- Set log level based on status
    CASE 
        WHEN p_status = 'failed' THEN v_log_level := 'error';
        WHEN p_status = 'canceled' THEN v_log_level := 'warning';
        ELSE v_log_level := 'info';
    END CASE;
    
    -- Get agent role for the log message
    SELECT 'Agent ' || name INTO v_agent_role
    FROM public.agents
    WHERE id = v_task.assigned_agent_id;
    
    -- Log the status change
    INSERT INTO public.agent_task_logs (
        task_id,
        agent_id,
        message,
        level
    ) VALUES (
        p_task_id,
        v_task.assigned_agent_id,
        COALESCE(
            p_message, 
            CASE 
                WHEN p_status = 'in_progress' THEN COALESCE(v_agent_role, 'Agent') || ' started working on task'
                WHEN p_status = 'completed' THEN COALESCE(v_agent_role, 'Agent') || ' completed task'
                WHEN p_status = 'failed' THEN COALESCE(v_agent_role, 'Agent') || ' failed to complete task'
                WHEN p_status = 'canceled' THEN 'Task was canceled'
                ELSE 'Task status updated to ' || p_status
            END
        ),
        v_log_level
    );
    
    -- If task is completed, check for dependent tasks that can now be assigned
    IF p_status = 'completed' THEN
        PERFORM public.process_task_dependencies(p_task_id);
    END IF;
    
    -- Return the updated task
    v_result := jsonb_build_object(
        'task_id', v_task.id,
        'title', v_task.title,
        'status', v_task.status,
        'agent_id', v_task.assigned_agent_id,
        'started_at', v_task.started_at,
        'completed_at', v_task.completed_at
    );
    
    RETURN v_result;
END;
$$;

-- Function to process task dependencies
CREATE OR REPLACE FUNCTION public.process_task_dependencies(
    p_completed_task_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_dependent_task_id UUID;
    v_dependent_task_farm_id UUID;
    v_has_uncompleted_dependencies BOOLEAN;
    v_auto_assign BOOLEAN;
BEGIN
    -- Get tasks that depend on the completed task
    FOR v_dependent_task_id, v_dependent_task_farm_id IN 
        SELECT dependent_task.id, dependent_task.farm_id
        FROM public.agent_task_dependencies atd
        JOIN public.agent_tasks dependent_task ON atd.task_id = dependent_task.id
        WHERE 
            atd.dependent_on_task_id = p_completed_task_id
            AND dependent_task.status = 'pending'
    LOOP
        -- Check if this dependent task has any other uncompleted dependencies
        SELECT EXISTS (
            SELECT 1 
            FROM public.agent_task_dependencies atd
            JOIN public.agent_tasks at ON atd.dependent_on_task_id = at.id
            WHERE 
                atd.task_id = v_dependent_task_id
                AND at.status != 'completed'
                AND at.id != p_completed_task_id
        ) INTO v_has_uncompleted_dependencies;
        
        -- If no other uncompleted dependencies, auto-assign if farm has that setting
        IF NOT v_has_uncompleted_dependencies THEN
            -- Check if farm has auto-assign enabled (assuming this is stored in farm settings)
            SELECT COALESCE(
                (settings->>'auto_assign_tasks')::BOOLEAN, 
                FALSE
            )
            INTO v_auto_assign
            FROM public.farms
            WHERE id = v_dependent_task_farm_id;
            
            -- If auto-assign is enabled, assign the task
            IF v_auto_assign THEN
                PERFORM public.assign_task_to_agent(
                    v_dependent_task_id,
                    NULL,
                    TRUE
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Function to get task assignment recommendations
CREATE OR REPLACE FUNCTION public.get_task_assignment_recommendations(
    p_farm_id UUID
)
RETURNS TABLE (
    task_id UUID,
    task_title TEXT,
    recommended_agent_id UUID,
    recommended_agent_name TEXT,
    recommendation_score NUMERIC,
    required_capabilities TEXT[],
    agent_capabilities TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH unassigned_tasks AS (
        SELECT 
            t.id,
            t.title,
            t.required_capabilities
        FROM public.agent_tasks t
        WHERE 
            t.farm_id = p_farm_id
            AND t.status = 'pending'
            AND NOT EXISTS (
                SELECT 1 
                FROM public.agent_task_dependencies atd
                JOIN public.agent_tasks dependent_on_task ON atd.dependent_on_task_id = dependent_on_task.id
                WHERE 
                    atd.task_id = t.id
                    AND dependent_on_task.status != 'completed'
            )
    ),
    agent_capabilities AS (
        SELECT 
            a.id AS agent_id,
            a.name AS agent_name,
            array_agg(DISTINCT ac.capability) AS capabilities,
            SUM(ac.proficiency) AS total_proficiency
        FROM public.agents a
        JOIN public.agent_capabilities ac ON a.id = ac.agent_id
        WHERE 
            a.farm_id = p_farm_id
            AND a.status = 'active'
        GROUP BY a.id, a.name
    ),
    agent_workloads AS (
        SELECT 
            assigned_agent_id,
            COUNT(*) AS task_count
        FROM public.agent_tasks
        WHERE 
            status IN ('assigned', 'in_progress')
            AND assigned_agent_id IS NOT NULL
        GROUP BY assigned_agent_id
    ),
    recommendations AS (
        SELECT 
            ut.id AS task_id,
            ut.title AS task_title,
            ac.agent_id AS recommended_agent_id,
            ac.agent_name AS recommended_agent_name,
            -- Recommendation score based on:
            -- 1. Number of matching capabilities
            -- 2. Total proficiency in those capabilities
            -- 3. Inverse of current workload (less work = higher score)
            (
                array_length(ARRAY(SELECT UNNEST(ac.capabilities) INTERSECT SELECT UNNEST(ut.required_capabilities)), 1)::NUMERIC / 
                array_length(ut.required_capabilities, 1)::NUMERIC * 50 +
                ac.total_proficiency / 10 -
                COALESCE(aw.task_count, 0) * 5
            ) AS recommendation_score,
            ut.required_capabilities,
            ac.capabilities AS agent_capabilities
        FROM unassigned_tasks ut
        CROSS JOIN agent_capabilities ac
        LEFT JOIN agent_workloads aw ON ac.agent_id = aw.assigned_agent_id
        WHERE 
            -- At least one capability must match
            ARRAY(SELECT UNNEST(ac.capabilities) INTERSECT SELECT UNNEST(ut.required_capabilities)) != '{}'
    )
    SELECT 
        r.task_id,
        r.task_title,
        r.recommended_agent_id,
        r.recommended_agent_name,
        r.recommendation_score,
        r.required_capabilities::TEXT[],
        r.agent_capabilities::TEXT[]
    FROM recommendations r
    ORDER BY r.task_id, r.recommendation_score DESC;
END;
$$;
