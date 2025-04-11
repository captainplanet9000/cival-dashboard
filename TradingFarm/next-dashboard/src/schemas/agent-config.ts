/**
 * ElizaOS Agent Configuration Schema
 * 
 * This schema is used for validating agent configurations on both client and server side.
 * Using the same validation logic ensures consistency across the application.
 */
import { z } from 'zod';

/**
 * Base schema for agent configuration
 */
export const agentConfigSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, { message: "Agent name is required" }).max(100, { message: "Agent name must be 100 characters or less" }),
  description: z.string().optional(),
  trading_pairs: z.array(z.string()).min(1, { message: "At least one trading pair is required" }),
  risk_level: z.enum(['low', 'medium', 'high'], { 
    required_error: "Risk level is required",
    invalid_type_error: "Risk level must be low, medium, or high"
  }),
  max_allocation: z.number().min(0, { message: "Allocation cannot be negative" }).max(100, { message: "Maximum allocation cannot exceed 100%" }),
  active: z.boolean().default(false),
  strategy_config: z.record(z.unknown()).default({})
});

/**
 * Full agent type including generated fields and relations
 */
export const fullAgentSchema = agentConfigSchema.extend({
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  user_id: z.string().uuid().optional(),
  farm_id: z.string().uuid().optional(),
  metrics: z.object({
    requests_per_minute: z.number().optional(),
    success_rate: z.number().optional(),
    avg_response_time: z.number().optional(),
    memory_usage: z.number().optional(),
    task_completion_rate: z.number().optional(),
    total_tasks: z.number().optional(),
    successful_tasks: z.number().optional(),
    failed_tasks: z.number().optional(),
    last_updated: z.string().datetime().optional()
  }).optional()
});

// Type extraction from schemas
export type AgentConfig = z.infer<typeof agentConfigSchema>;
export type FullAgent = z.infer<typeof fullAgentSchema>;

/**
 * Partial update schema allows for updating only specific fields
 */
export const agentConfigUpdateSchema = agentConfigSchema.partial().required({
  id: true
});

export type AgentConfigUpdate = z.infer<typeof agentConfigUpdateSchema>;
