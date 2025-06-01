/**
 * WebSocket Event Constants for ElizaOS Trading Farm
 * 
 * This module defines all the WebSocket event types used across the system,
 * ensuring consistent communication between server, agents, and UI components.
 */

// AGENT EVENTS
export const AGENT_EVENTS = {
  AGENT_CREATED: 'agent:created',
  AGENT_UPDATED: 'agent:updated',
  AGENT_DELETED: 'agent:deleted',
  AGENT_STATUS_CHANGED: 'agent:status_changed',
  AGENT_COMMAND_SENT: 'agent:command_sent',
  AGENT_COMMAND_RECEIVED: 'agent:command_received',
  AGENT_COMMAND_COMPLETED: 'agent:command_completed',
  AGENT_COMMAND_FAILED: 'agent:command_failed',
  AGENT_MESSAGE_SENT: 'agent:message_sent',
  AGENT_MESSAGE_RECEIVED: 'agent:message_received',
} as const;

// FARM EVENTS
export const FARM_EVENTS = {
  FARM_CREATED: 'farm:created',
  FARM_UPDATED: 'farm:updated',
  FARM_DELETED: 'farm:deleted',
  FARM_STATUS_CHANGED: 'farm:status_changed',
  FARM_GOAL_ASSIGNED: 'farm:goal_assigned',
  FARM_GOAL_COMPLETED: 'farm:goal_completed',
  FARM_AGENT_ASSIGNED: 'farm:agent_assigned',
  FARM_AGENT_REMOVED: 'farm:agent_removed',
} as const;

// TRADING EVENTS
export const TRADING_EVENTS = {
  ORDER_CREATED: 'trading:order_created',
  ORDER_UPDATED: 'trading:order_updated',
  ORDER_FILLED: 'trading:order_filled',
  ORDER_CANCELED: 'trading:order_canceled',
  POSITION_OPENED: 'trading:position_opened',
  POSITION_CLOSED: 'trading:position_closed',
  POSITION_UPDATED: 'trading:position_updated',
  TRADE_EXECUTED: 'trading:trade_executed',
} as const;

// MARKET EVENTS
export const MARKET_EVENTS = {
  PRICE_UPDATED: 'market:price_updated',
  TICKER_UPDATED: 'market:ticker_updated',
  ORDERBOOK_UPDATED: 'market:orderbook_updated',
  MARKET_CONDITION_CHANGED: 'market:condition_changed',
  TECHNICAL_INDICATOR_UPDATED: 'market:indicator_updated',
} as const;

// KNOWLEDGE EVENTS
export const KNOWLEDGE_EVENTS = {
  KNOWLEDGE_ADDED: 'knowledge:added',
  KNOWLEDGE_UPDATED: 'knowledge:updated',
  KNOWLEDGE_DELETED: 'knowledge:deleted',
  KNOWLEDGE_QUERIED: 'knowledge:queried',
  KNOWLEDGE_RESPONSE: 'knowledge:response',
  KNOWLEDGE_SHARED: 'knowledge:shared',
} as const;

// COMMAND EVENTS
export const COMMAND_EVENTS = {
  COMMAND_SENT: 'command:sent',
  COMMAND_RECEIVED: 'command:received',
  COMMAND_PROCESSING: 'command:processing',
  COMMAND_COMPLETED: 'command:completed',
  COMMAND_FAILED: 'command:failed',
  COMMAND_RESPONSE: 'command:response',
} as const;

// SYSTEM EVENTS
export const SYSTEM_EVENTS = {
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info',
  SYSTEM_STATUS: 'system:status',
  CONNECTION_ESTABLISHED: 'system:connection_established',
  CONNECTION_LOST: 'system:connection_lost',
  AUTHENTICATION_REQUIRED: 'system:authentication_required',
  AUTHENTICATION_SUCCESS: 'system:authentication_success',
  AUTHENTICATION_FAILED: 'system:authentication_failed',
} as const;

// Combine all event types for export
export const EVENTS = {
  ...AGENT_EVENTS,
  ...FARM_EVENTS,
  ...TRADING_EVENTS,
  ...MARKET_EVENTS,
  ...KNOWLEDGE_EVENTS,
  ...COMMAND_EVENTS,
  ...SYSTEM_EVENTS,
} as const;

// Create a type representing all possible event names
export type EventType = typeof EVENTS[keyof typeof EVENTS];

// WebSocket Message interface
export interface WebSocketMessage {
  event: EventType;
  data: any;
  timestamp: string;
  sender?: string;
  target?: string | string[];
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

// WebSocket Event Handlers
export type EventHandler = (data: any) => void;
export type EventHandlerMap = Map<EventType, Set<EventHandler>>;

/**
 * Creates a typed event emitter message
 */
export function createMessage<T>(
  event: EventType, 
  data: T, 
  options?: { 
    sender?: string;
    target?: string | string[];
    requestId?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }
): WebSocketMessage {
  return {
    event,
    data,
    timestamp: new Date().toISOString(),
    ...options
  };
}
