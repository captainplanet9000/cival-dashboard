-- Add columns to simulation_runs table
ALTER TABLE public.simulation_runs
ADD COLUMN name VARCHAR(255) NULL,
ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'paused', 'completed', 'archived')),
ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN ended_at TIMESTAMPTZ NULL;

-- Add comments for clarity (optional but recommended)
COMMENT ON COLUMN public.simulation_runs.name IS 'User-defined name for the simulation run.';
COMMENT ON COLUMN public.simulation_runs.status IS 'Current status of the simulation run (running, paused, completed, archived).';
COMMENT ON COLUMN public.simulation_runs.started_at IS 'Timestamp when the simulation run was started.';
COMMENT ON COLUMN public.simulation_runs.ended_at IS 'Timestamp when the simulation run ended (completed or archived).';

-- Ensure Foreign Keys exist (adjust column names if needed based on your actual schema)
-- Assuming agent_id and agent_simulation_config_id already exist
ALTER TABLE public.simulation_runs
ADD CONSTRAINT simulation_runs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE,
ADD CONSTRAINT simulation_runs_config_id_fkey FOREIGN KEY (agent_simulation_config_id) REFERENCES public.agent_simulation_configs(id) ON DELETE SET NULL;

-- Note: Adjust the ON DELETE behavior for agent_simulation_config_id if needed.
-- ON DELETE SET NULL means if the config is deleted, the run record keeps existing but loses the link.
-- Consider ON DELETE CASCADE if deleting the config should delete the run, or ON DELETE RESTRICT if deleting the config is forbidden while runs reference it.
