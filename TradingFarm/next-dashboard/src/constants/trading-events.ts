/**
 * Trading Events Constants
 * 
 * Standardized event names for socket communication between client and server
 * Used across all components to ensure consistency in event handling
 */

export const TRADING_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Command events
  COMMAND: 'command',
  COMMAND_RESPONSE: 'command_response',
  COMMAND_ERROR: 'command_error',
  COMMAND_PROCESSING: 'command_processing',
  
  // Market data events
  MARKET_UPDATE: 'market_update',
  MARKET_CHART: 'market_chart',
  MARKET_ALERT: 'market_alert',
  
  // Portfolio events
  PORTFOLIO_UPDATE: 'portfolio_update',
  PORTFOLIO_PERFORMANCE: 'portfolio_performance',
  BALANCE_UPDATE: 'balance_update',
  
  // Trading events
  TRADE_EXECUTED: 'trade_executed',
  TRADE_PENDING: 'trade_pending',
  TRADE_CANCELED: 'trade_canceled',
  TRADE_ERROR: 'trade_error',
  
  // Agent events
  AGENT_STATUS: 'agent_status',
  AGENT_PERFORMANCE: 'agent_performance',
  AGENT_ERROR: 'agent_error',
  AGENT_CREATED: 'agent_created',
  AGENT_DELETED: 'agent_deleted',
  
  // Strategy events
  STRATEGY_UPDATE: 'strategy_update',
  STRATEGY_PERFORMANCE: 'strategy_performance',
  STRATEGY_CREATED: 'strategy_created',
  STRATEGY_DELETED: 'strategy_deleted',
  
  // Knowledge events
  KNOWLEDGE_QUERY: 'knowledge_query',
  KNOWLEDGE_RESPONSE: 'knowledge_response',
  KNOWLEDGE_ERROR: 'knowledge_error',
  
  // System events
  SYSTEM_NOTIFICATION: 'system_notification',
  SYSTEM_STATUS: 'system_status',
  SYSTEM_ERROR: 'system_error'
};

// Event category groups for easier filtering
export const EVENT_CATEGORIES = {
  CONNECTION: [TRADING_EVENTS.CONNECT, TRADING_EVENTS.DISCONNECT, TRADING_EVENTS.ERROR],
  COMMAND: [TRADING_EVENTS.COMMAND, TRADING_EVENTS.COMMAND_RESPONSE, TRADING_EVENTS.COMMAND_ERROR, TRADING_EVENTS.COMMAND_PROCESSING],
  MARKET: [TRADING_EVENTS.MARKET_UPDATE, TRADING_EVENTS.MARKET_CHART, TRADING_EVENTS.MARKET_ALERT],
  PORTFOLIO: [TRADING_EVENTS.PORTFOLIO_UPDATE, TRADING_EVENTS.PORTFOLIO_PERFORMANCE, TRADING_EVENTS.BALANCE_UPDATE],
  TRADING: [TRADING_EVENTS.TRADE_EXECUTED, TRADING_EVENTS.TRADE_PENDING, TRADING_EVENTS.TRADE_CANCELED, TRADING_EVENTS.TRADE_ERROR],
  AGENT: [TRADING_EVENTS.AGENT_STATUS, TRADING_EVENTS.AGENT_PERFORMANCE, TRADING_EVENTS.AGENT_ERROR, TRADING_EVENTS.AGENT_CREATED, TRADING_EVENTS.AGENT_DELETED],
  STRATEGY: [TRADING_EVENTS.STRATEGY_UPDATE, TRADING_EVENTS.STRATEGY_PERFORMANCE, TRADING_EVENTS.STRATEGY_CREATED, TRADING_EVENTS.STRATEGY_DELETED],
  KNOWLEDGE: [TRADING_EVENTS.KNOWLEDGE_QUERY, TRADING_EVENTS.KNOWLEDGE_RESPONSE, TRADING_EVENTS.KNOWLEDGE_ERROR],
  SYSTEM: [TRADING_EVENTS.SYSTEM_NOTIFICATION, TRADING_EVENTS.SYSTEM_STATUS, TRADING_EVENTS.SYSTEM_ERROR]
};
