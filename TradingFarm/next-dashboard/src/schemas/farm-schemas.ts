import { z } from 'zod';

/**
 * Zod schemas for Farm-related entities in the Trading Farm platform
 */

// Performance metrics schema
export const performanceMetricsSchema = z.object({
  win_rate: z.number(),
  profit_factor: z.number().optional(),
  trades_count: z.number(),
  total_profit_loss: z.number().optional(),
  average_win: z.number().optional(),
  average_loss: z.number().optional(),
});

// Risk profile schema
export const riskProfileSchema = z.object({
  max_drawdown: z.number(),
  max_trade_size: z.number().optional(),
  risk_per_trade: z.number().optional(),
  volatility_tolerance: z.enum(['low', 'medium', 'high']).optional(),
});

// Agent configuration schema
export const agentConfigurationSchema = z.object({
  exchange: z.string().optional(),
  api_key_id: z.string().optional(),
  trading_pairs: z.array(z.string()).optional(),
  risk_level: z.number().optional(),
  max_order_size: z.number().optional(),
  use_elizaos: z.boolean().optional(),
  elizaos_settings: z.record(z.any()).optional(),
});

// Agent performance schema
export const agentPerformanceSchema = z.object({
  trades_count: z.number(),
  win_rate: z.number(),
  profit_loss: z.number(),
  active_since: z.string().optional(),
  last_trade: z.string().optional(),
});

// Agent schema
export const agentSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  farm_id: z.number(),
  is_active: z.boolean(),
  status: z.enum(['idle', 'running', 'error', 'paused']),
  type: z.string(),
  strategy_id: z.number().optional(),
  strategy_name: z.string().optional(),
  configuration: agentConfigurationSchema.optional(),
  performance: agentPerformanceSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Farm schema
export const farmSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  user_id: z.string(),
  is_active: z.boolean(),
  status: z.enum(['active', 'inactive', 'paused']),
  exchange: z.string().optional(),
  asset_pairs: z.array(z.string()).optional(),
  risk_profile: riskProfileSchema,
  performance_metrics: performanceMetricsSchema,
  created_at: z.string(),
  updated_at: z.string(),
  agents: z.array(agentSchema).optional(),
  wallets: z.array(z.any()).optional(), // Will be replaced with walletSchema reference
});

// Trade schema
export const tradeSchema = z.object({
  id: z.number(),
  agent_id: z.number(),
  symbol: z.string(),
  type: z.enum(['market', 'limit', 'stop']),
  side: z.enum(['buy', 'sell']),
  amount: z.number(),
  price: z.number(),
  status: z.enum(['open', 'closed', 'canceled']),
  profit_loss: z.number().optional(),
  fee: z.number().optional(),
  opened_at: z.string(),
  closed_at: z.string().optional(),
});

// Strategy schema
export const strategySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  code: z.string(),
  language: z.string(),
  is_public: z.boolean(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  backtest_results: z.record(z.any()).optional(),
});

// Base schema for farm properties we allow editing/creating
const farmBaseSchema = z.object({
  name: z.string().min(3, { message: 'Farm name must be at least 3 characters' }).max(100),
  description: z.string().max(500).optional().nullable(),
  // owner_id should likely be handled server-side or in the hook based on auth
  // settings: z.record(z.any()).optional().nullable(), // Allow editing settings as JSON
  is_active: z.boolean().optional(), // Allow toggling active status
  // Goal related fields might be handled separately
});

// Schema for creating a new farm
export const createFarmSchema = farmBaseSchema.extend({
  // Add any fields REQUIRED only on creation (if any)
  name: farmBaseSchema.shape.name, // Explicitly require name on create
});

// Schema for updating an existing farm (all fields optional)
export const updateFarmSchema = farmBaseSchema.partial();

// TypeScript types inferred from schemas
export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;

export const createAgentSchema = agentSchema
  .omit({ 
    id: true, 
    created_at: true, 
    updated_at: true, 
    performance: true
  });

export const updateAgentSchema = createAgentSchema.partial();

// Type inference helpers
export type Farm = z.infer<typeof farmSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type Strategy = z.infer<typeof strategySchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
