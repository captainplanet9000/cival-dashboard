import { z } from 'zod';

// Base agent schema using Zod for type validation (TypeScript alternative to Pydantic)
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.string()),
  status: z.enum(['idle', 'running', 'paused', 'error']),
  model: z.string(),
  created_at: z.date().optional().default(() => new Date()),
  last_active: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

// Trading specific agent schema
export const TradingAgentSchema = AgentSchema.extend({
  specialization: z.array(z.string()),
  risk_tolerance: z.enum(['low', 'medium', 'high']),
  max_allocation: z.number().min(0).max(100),
  strategies: z.array(z.string()),
  performance: z.object({
    win_rate: z.number().min(0).max(100).optional(),
    profit_factor: z.number().optional(),
    drawdown: z.number().optional(),
    total_trades: z.number().int().optional(),
    successful_trades: z.number().int().optional(),
    failed_trades: z.number().int().optional(),
  }).optional(),
});

// Agent action schema
export const AgentActionSchema = z.object({
  id: z.string(),
  agent_id: z.string(),
  action_type: z.enum(['market_analysis', 'place_trade', 'adjust_position', 'close_position', 'report']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  created_at: z.date().default(() => new Date()),
  completed_at: z.date().optional(),
  params: z.record(z.any()).optional(),
  result: z.record(z.any()).optional(),
  error: z.string().optional(),
});

// Agent instruction schema
export const AgentInstructionSchema = z.object({
  id: z.string(),
  agent_id: z.string(),
  instruction: z.string(),
  created_at: z.date().default(() => new Date()),
  status: z.enum(['pending', 'processed', 'rejected']),
  response: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Extract TypeScript types from Zod schemas
export type Agent = z.infer<typeof AgentSchema>;
export type TradingAgent = z.infer<typeof TradingAgentSchema>;
export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentInstruction = z.infer<typeof AgentInstructionSchema>;

// Market data schema for agent analysis
export const MarketDataSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
  timestamp: z.date(),
  indicators: z.record(z.any()).optional(),
});

export type MarketData = z.infer<typeof MarketDataSchema>;
