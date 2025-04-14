-- Goals table is already created in 20240501000000_create_goals_table.sql
-- This migration will only add example data

-- NOTE: The original goals table structure in this file was different:
-- It had 'progress' instead of 'progress_percentage'
-- It had 'type' instead of 'goal_type'
-- It had 'farm_id' as INTEGER instead of UUID
-- These differences have been reconciled in the INSERT statement below

-- RLS policies and triggers already applied in 20240501000000_create_goals_table.sql

-- Add some example goals
-- Add some example goals using the correct column names
-- Note: Using the schema from 20240501000000_create_goals_table.sql
INSERT INTO public.goals (
  name, 
  description, 
  goal_type, -- Changed from 'type' to match the actual schema
  status, 
  farm_id, 
  target_value, 
  current_value, 
  progress_percentage, -- Changed from 'progress' to match the actual schema
  metadata, -- Changed from 'metrics' to match the actual schema
  start_date,
  target_date -- Changed from 'deadline' to match the actual schema
)
SELECT
  name, 
  description, 
  CASE -- Convert type values to match the constraints in the actual schema
    WHEN val->>'type' = 'profit' THEN 'profit'
    WHEN val->>'type' = 'risk' THEN 'custom'
    ELSE 'custom'
  END,
  status,
  -- Find the first farm_id with UUID type (converted from the integer value)
  (SELECT id FROM public.farms LIMIT 1),
  (val->>'target_value')::DECIMAL,
  (val->>'current_value')::DECIMAL,
  (val->>'progress')::DECIMAL * 100, -- Convert 0-1 scale to 0-100 scale for progress_percentage
  jsonb_build_object(
    'original_metrics', val->>'metrics',
    'strategy', val->>'strategy',
    'priority', val->>'priority'
  ),
  now(),
  (now() + (val->>'deadline_days')::INTEGER * INTERVAL '1 day')
FROM (
  VALUES
    (jsonb_build_object(
      'name', 'Monthly Profit Target', 
      'description', 'Achieve a 5% monthly profit across the farm', 
      'type', 'profit', 
      'status', 'in_progress',
      'target_value', 0.05, 
      'current_value', 0.032, 
      'progress', 0.64, 
      'metrics', '{"startValue": 10000, "currentValue": 10320, "targetValue": 10500}',
      'strategy', 'Incremental growth with controlled risk', 
      'priority', 'high', 
      'deadline_days', 15
    )),
    (jsonb_build_object(
      'name', 'Risk Reduction', 
      'description', 'Reduce maximum drawdown to under 10%', 
      'type', 'risk', 
      'status', 'in_progress',
      'target_value', 0.10, 
      'current_value', 0.14, 
      'progress', 0.40, 
      'metrics', '{"startValue": 0.22, "currentValue": 0.14, "targetValue": 0.10}',
      'strategy', 'Implement tighter stop-losses and improve risk scoring', 
      'priority', 'medium', 
      'deadline_days', 30
    ))
  ) AS t(val);
