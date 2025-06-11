/**
 * AG UI Protocol Types for Trading Dashboard
 * Implements the open, lightweight, event-based protocol for AI agent-human interaction
 */

// Core AG UI Event Types
export interface AGUIBaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: 'agent' | 'human' | 'system';
  metadata?: Record<string, any>;
}

// Standard AG UI Event Types for Trading
export interface AGUITextEvent extends AGUIBaseEvent {
  type: 'text';
  content: string;
  role: 'assistant' | 'user' | 'system';
}

export interface AGUIThinkingEvent extends AGUIBaseEvent {
  type: 'thinking';
  content: string;
  visible: boolean;
}

export interface AGUIToolCallEvent extends AGUIBaseEvent {
  type: 'tool_call';
  tool_name: string;
  arguments: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
}

export interface AGUIStateEvent extends AGUIBaseEvent {
  type: 'state';
  key: string;
  value: any;
  action: 'set' | 'update' | 'delete';
}

export interface AGUIContextEvent extends AGUIBaseEvent {
  type: 'context';
  context: {
    market_data?: any;
    portfolio?: any;
    agent_status?: any;
    trading_session?: any;
  };
}

export interface AGUIGenerativeUIEvent extends AGUIBaseEvent {
  type: 'generative_ui';
  component_type: 'chart' | 'table' | 'card' | 'form' | 'alert';
  props: Record<string, any>;
  delta?: boolean;
}

export interface AGUIErrorEvent extends AGUIBaseEvent {
  type: 'error';
  error: string;
  code?: string;
  recoverable: boolean;
}

export interface AGUIConfirmationEvent extends AGUIBaseEvent {
  type: 'confirmation';
  message: string;
  options: Array<{
    id: string;
    label: string;
    value: any;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  timeout?: number;
}

export interface AGUIProgressEvent extends AGUIBaseEvent {
  type: 'progress';
  current: number;
  total: number;
  message?: string;
  stage?: string;
}

export interface AGUIStreamEvent extends AGUIBaseEvent {
  type: 'stream';
  content: string;
  delta: boolean;
  complete: boolean;
}

// Trading-Specific Event Types
export interface AGUITradingSignalEvent extends AGUIBaseEvent {
  type: 'trading_signal';
  signal: {
    symbol: string;
    action: 'buy' | 'sell' | 'hold';
    confidence: number;
    price: number;
    quantity?: number;
    reasoning: string[];
    risk_level: 'low' | 'medium' | 'high';
  };
}

export interface AGUIMarketAnalysisEvent extends AGUIBaseEvent {
  type: 'market_analysis';
  analysis: {
    symbol: string;
    timeframe: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    key_levels: {
      support: number[];
      resistance: number[];
    };
    indicators: Record<string, number>;
    summary: string;
  };
}

export interface AGUIRiskAssessmentEvent extends AGUIBaseEvent {
  type: 'risk_assessment';
  assessment: {
    overall_risk: number; // 1-10 scale
    position_risk: number;
    portfolio_risk: number;
    recommendations: string[];
    limits: {
      max_position_size: number;
      stop_loss: number;
      take_profit: number;
    };
  };
}

// Union type for all possible events
export type AGUIEvent = 
  | AGUITextEvent
  | AGUIThinkingEvent
  | AGUIToolCallEvent
  | AGUIStateEvent
  | AGUIContextEvent
  | AGUIGenerativeUIEvent
  | AGUIErrorEvent
  | AGUIConfirmationEvent
  | AGUIProgressEvent
  | AGUIStreamEvent
  | AGUITradingSignalEvent
  | AGUIMarketAnalysisEvent
  | AGUIRiskAssessmentEvent;

// AG UI Client Configuration
export interface AGUIClientConfig {
  endpoint: string;
  transport: 'sse' | 'websocket';
  reconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  headers?: Record<string, string>;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// AG UI Agent Interface
export interface AGUIAgent {
  id: string;
  name: string;
  type: 'trading' | 'analysis' | 'risk' | 'execution' | 'research';
  status: 'online' | 'offline' | 'busy' | 'error';
  capabilities: string[];
  lastActivity: Date;
}

// AG UI Session State
export interface AGUISession {
  id: string;
  agents: AGUIAgent[];
  events: AGUIEvent[];
  state: Record<string, any>;
  context: Record<string, any>;
  startTime: Date;
  lastActivity: Date;
}