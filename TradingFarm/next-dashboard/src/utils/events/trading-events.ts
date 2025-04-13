/**
 * Trading Events System
 * 
 * Provides a typed event system for the Trading Farm with ElizaOS integration
 * Enables communication between agents, services, and the UI
 */

import { EventEmitter } from 'events';

// Define all trading event types
export enum TRADING_EVENTS {
  // Order events
  ORDER_PLACED = 'order:placed',
  ORDER_FILLED = 'order:filled',
  ORDER_CANCELLED = 'order:cancelled',
  ORDER_REJECTED = 'order:rejected',
  ORDER_UPDATE = 'order:update',
  
  // Position events
  POSITION_OPENED = 'position:opened',
  POSITION_CLOSED = 'position:closed',
  POSITION_UPDATE = 'position:update',
  POSITION_LIQUIDATION_WARNING = 'position:liquidation_warning',
  
  // Market events
  MARKET_PRICE_UPDATE = 'market:price_update',
  MARKET_VOLUME_SPIKE = 'market:volume_spike',
  MARKET_VOLATILITY_CHANGE = 'market:volatility_change',
  MARKET_TREND_CHANGE = 'market:trend_change',
  
  // Agent events
  AGENT_STARTED = 'agent:started',
  AGENT_STOPPED = 'agent:stopped',
  AGENT_ERROR = 'agent:error',
  AGENT_MESSAGE = 'agent:message',
  AGENT_DECISION = 'agent:decision',
  
  // Farm events
  FARM_CREATED = 'farm:created',
  FARM_UPDATED = 'farm:updated',
  FARM_DELETED = 'farm:deleted',
  FARM_AGENT_ADDED = 'farm:agent_added',
  FARM_AGENT_REMOVED = 'farm:agent_removed',
  
  // Goal events
  GOAL_CREATED = 'goal:created',
  GOAL_UPDATED = 'goal:updated',
  GOAL_DELETED = 'goal:deleted',
  GOAL_PROGRESS_UPDATED = 'goal:progress_updated',
  GOAL_COMPLETED = 'goal:completed',
  GOAL_FAILED = 'goal:failed',
  GOAL_STEP_STARTED = 'goal:step_started',
  GOAL_STEP_COMPLETED = 'goal:step_completed',
  GOAL_STEP_FAILED = 'goal:step_failed',
  AGENT_ASSIGNED_TO_STEP = 'goal:agent_assigned',
  
  // System events
  SYSTEM_ERROR = 'system:error',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_INFO = 'system:info',
  
  // Generic events
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Base event interface
export interface TradingEvent<T = any> {
  type: TRADING_EVENTS;
  timestamp: number;
  source: string;
  data: T;
}

// Order event types
export interface OrderEvent extends TradingEvent {
  data: {
    orderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'take_profit';
    size: number;
    price?: number;
    status: string;
    exchange: string;
    agentId?: string;
    farmId?: string;
  };
}

// Position event types
export interface PositionEvent extends TradingEvent {
  data: {
    positionId: string;
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnl: number;
    pnlPercentage: number;
    leverage: number;
    liquidationPrice?: number;
    agentId?: string;
    farmId?: string;
  };
}

// Market event types
export interface MarketEvent extends TradingEvent {
  data: {
    symbol: string;
    price: number;
    volume: number;
    timestamp: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    change?: number;
    changePercent?: number;
  };
}

// Agent event types
export interface AgentEvent extends TradingEvent {
  data: {
    agentId: string;
    agentName: string;
    status?: string;
    message?: string;
    decision?: {
      action: string;
      confidence: number;
      reason: string;
      parameters: Record<string, any>;
    };
    farmId?: string;
  };
}

// Farm event types
export interface FarmEvent extends TradingEvent {
  data: {
    farmId: string;
    farmName: string;
    agentIds?: string[];
    status?: string;
    goal?: string;
    performance?: Record<string, any>;
  };
}

// System event types
export interface SystemEvent extends TradingEvent {
  data: {
    level: 'error' | 'warning' | 'info';
    code?: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Goal event types
export interface GoalEvent extends TradingEvent {
  data: {
    goalId: string;
    goalType?: 'acquisition' | 'profit' | 'portfolio' | 'risk_management' | 'custom';
    name?: string;
    status?: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
    targetAsset?: string;
    currentAmount?: number;
    percentage?: number;
    stepId?: string;
    stepName?: string;
    agentId?: string;
    runId?: string;
    farmId?: string;
    timestamp: string;
    metrics?: Record<string, any>;
  };
}

// Create a singleton event emitter
class TradingEventEmitterClass extends EventEmitter {
  private static instance: TradingEventEmitterClass;
  
  constructor() {
    super();
    // Set higher max listener count for complex agent systems
    this.setMaxListeners(50);
  }
  
  static getInstance(): TradingEventEmitterClass {
    if (!TradingEventEmitterClass.instance) {
      TradingEventEmitterClass.instance = new TradingEventEmitterClass();
    }
    return TradingEventEmitterClass.instance;
  }
  
  // Emit a typed trading event
  emitEvent<T extends TradingEvent>(event: T): boolean {
    return this.emit(event.type, event.data);
  }
  
  // Emit a simple event with just the type and data
  emit(type: string | symbol, ...args: any[]): boolean {
    return super.emit(type, ...args);
  }
  
  // Logger for debugging events
  enableLogging(): void {
    const originalEmit = this.emit;
    this.emit = function(type, ...args): boolean {
      console.log(`[EVENT] ${String(type)}`, ...args);
      return originalEmit.apply(this, [type, ...args]);
    };
  }
}

// Export singleton instance
export const TradingEventEmitter = TradingEventEmitterClass.getInstance();
