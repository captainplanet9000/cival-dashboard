import { z } from 'zod';

/**
 * Zod schemas for Goal-related entities in the Trading Farm platform
 */

// Completion actions schema
export const completionActionsSchema = z.object({
  transferToBank: z.boolean().optional(),
  startNextGoal: z.boolean().optional(),
  nextGoalId: z.string().optional(),
});

// Goal schema
export const goalSchema = z.object({
  id: z.string(),
  farm_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  target_amount: z.number(),
  current_amount: z.number(),
  target_assets: z.array(z.string()),
  selected_asset: z.string().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED']),
  completion_actions: completionActionsSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
  strategies: z.array(z.any()).optional(), // Will be replaced after goalStrategySchema is defined
  transactions: z.array(z.any()).optional(), // Will be replaced after goalTransactionSchema is defined
});

// Goal strategy schema
export const goalStrategySchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  agent_id: z.string(),
  strategy_type: z.string(),
  parameters: z.record(z.any()).optional(),
  is_active: z.boolean(),
  proposed_at: z.string(),
  selected_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  agent: z.any().optional(), // Replace with agentSchema reference if needed
});

// Goal transaction schema
export const goalTransactionSchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  strategy_id: z.string().optional(),
  transaction_type: z.string(),
  asset_from: z.string().optional(),
  amount_from: z.number().optional(),
  asset_to: z.string().optional(),
  amount_to: z.number().optional(),
  transaction_hash: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'FAILED']),
  created_at: z.string(),
  updated_at: z.string(),
});

// Goal monitoring event schema
export const goalMonitoringEventSchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  agent_id: z.string(),
  event_type: z.string(),
  event_data: z.record(z.any()).optional(),
  created_at: z.string(),
});

// Market conditions schema
export const marketConditionsSchema = z.object({
  price: z.number(),
  liquidity: z.number(),
  volatility: z.number(),
  trend: z.enum(['bullish', 'bearish', 'neutral']),
});

// Risk factor schema
export const riskFactorSchema = z.object({
  name: z.string(),
  impact: z.number(),
  description: z.string(),
});

// Risk assessment schema
export const riskAssessmentSchema = z.object({
  risk_level: z.enum(['low', 'medium', 'high']),
  factors: z.array(riskFactorSchema),
});

// Yield opportunity schema
export const yieldOpportunitySchema = z.object({
  protocol: z.string(),
  estimated_apr: z.number(),
  lock_period_days: z.number().optional(),
  risk_level: z.enum(['low', 'medium', 'high']),
});

// Goal analysis schema
export const goalAnalysisSchema = z.object({
  goal_id: z.string(),
  agent_id: z.string(),
  target_asset: z.string(),
  estimated_cost: z.number(),
  estimated_time_days: z.number(),
  strategy_recommendation: z.string(),
  market_conditions: marketConditionsSchema,
  risk_assessment: riskAssessmentSchema,
  yield_opportunities: z.array(yieldOpportunitySchema).optional(),
  created_at: z.string(),
});

// Update schemas with the correct references
// This needs to happen after all schemas are defined
goalSchema.extend({
  strategies: z.array(goalStrategySchema).optional(),
  transactions: z.array(goalTransactionSchema).optional(),
});

// Input schemas for create/update operations
export const createGoalSchema = goalSchema.omit({
  id: true,
  current_amount: true,
  created_at: true,
  updated_at: true,
  strategies: true,
  transactions: true,
  selected_asset: true,
});

export const updateGoalSchema = goalSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    strategies: true,
    transactions: true,
  })
  .partial();

export const createGoalStrategySchema = goalStrategySchema.omit({
  id: true,
  is_active: true,
  proposed_at: true,
  selected_at: true,
  created_at: true,
  updated_at: true,
  agent: true,
});

export const createGoalTransactionSchema = goalTransactionSchema.omit({
  id: true,
  status: true,
  created_at: true,
  updated_at: true,
});

export const createGoalMonitoringEventSchema = goalMonitoringEventSchema.omit({
  id: true,
  created_at: true,
});

// Type inference helpers
export type Goal = z.infer<typeof goalSchema>;
export type GoalStrategy = z.infer<typeof goalStrategySchema>;
export type GoalTransaction = z.infer<typeof goalTransactionSchema>;
export type GoalMonitoringEvent = z.infer<typeof goalMonitoringEventSchema>;
export type GoalAnalysis = z.infer<typeof goalAnalysisSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateGoalStrategyInput = z.infer<typeof createGoalStrategySchema>;
export type CreateGoalTransactionInput = z.infer<typeof createGoalTransactionSchema>;
export type CreateGoalMonitoringEventInput = z.infer<typeof createGoalMonitoringEventSchema>;
