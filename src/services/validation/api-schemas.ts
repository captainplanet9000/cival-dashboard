import { z } from 'zod';

/**
 * Zod schemas for API response validation
 * Used to validate responses from backend services and ensure consistent structure
 */

// Base API response schema
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  data: dataSchema.nullable(),
  error: z.string().nullable(),
  status: z.number().optional(),
  success: z.boolean().optional(),
  cached: z.boolean().optional(),
  fromMock: z.boolean().optional(),
});

// Exchange schemas
export const marketSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  base: z.string(),
  quote: z.string(),
  active: z.boolean(),
  precision: z.object({
    price: z.number(),
    amount: z.number(),
  }),
  limits: z.object({
    amount: z.object({
      min: z.number(),
      max: z.number().nullable(),
    }),
    price: z.object({
      min: z.number(),
      max: z.number().nullable(),
    }),
  }),
});

export const marketDataSchema = z.object({
  symbol: z.string(),
  timestamp: z.number(),
  datetime: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  change: z.number().optional(),
  percentage: z.number().optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  type: z.string(),
  side: z.string(),
  price: z.number().nullable(),
  amount: z.number(),
  filled: z.number(),
  status: z.string(),
  timestamp: z.number(),
  datetime: z.string(),
});

export const balanceSchema = z.object({
  currency: z.string(),
  free: z.number(),
  used: z.number(),
  total: z.number(),
});

export const positionSchema = z.object({
  symbol: z.string(),
  size: z.number(),
  side: z.string(),
  entryPrice: z.number(),
  markPrice: z.number().optional(),
  liquidationPrice: z.number().optional(),
  margin: z.number().optional(),
  leverage: z.number(),
  unrealizedPnl: z.number().optional(),
  realizedPnl: z.number().optional(),
  timestamp: z.number(),
  datetime: z.string(),
});

// ElizaOS schemas
export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  capabilities: z.array(z.string()).optional(),
});

export const agentTaskSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
  })),
});

// Vault schemas
export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  balance: z.number(),
  currency: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const transactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

// Simulation schemas
export const simulationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  parameters: z.record(z.any()).optional(),
  results: z.record(z.any()).optional(),
});

// User schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.string(),
  createdAt: z.string(),
});

// Define typed schemas for API responses
export const marketsResponseSchema = apiResponseSchema(z.array(marketSchema));
export const marketDataResponseSchema = apiResponseSchema(marketDataSchema);
export const orderResponseSchema = apiResponseSchema(orderSchema);
export const ordersResponseSchema = apiResponseSchema(z.array(orderSchema));
export const balancesResponseSchema = apiResponseSchema(z.record(balanceSchema));
export const positionsResponseSchema = apiResponseSchema(z.array(positionSchema));
export const agentsResponseSchema = apiResponseSchema(z.array(agentSchema));
export const agentTasksResponseSchema = apiResponseSchema(z.array(agentTaskSchema));
export const workflowsResponseSchema = apiResponseSchema(z.array(workflowSchema));
export const accountsResponseSchema = apiResponseSchema(z.array(accountSchema));
export const transactionsResponseSchema = apiResponseSchema(z.array(transactionSchema));
export const simulationsResponseSchema = apiResponseSchema(z.array(simulationSchema));
export const userResponseSchema = apiResponseSchema(userSchema);

// Type inference from schemas
export type MarketData = z.infer<typeof marketDataSchema>;
export type Market = z.infer<typeof marketSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Balance = z.infer<typeof balanceSchema>;
export type Position = z.infer<typeof positionSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type AgentTask = z.infer<typeof agentTaskSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Simulation = z.infer<typeof simulationSchema>;
export type User = z.infer<typeof userSchema>; 