/**
 * Socket.IO event constants for the Trading Farm system
 */
export const TRADING_EVENTS = {
  // Connection events
  CONNECTION: "connect",
  DISCONNECT: "disconnect",
  
  // Market data events
  MARKET_UPDATE: "market_update",
  MARKET_SUBSCRIBE: "market_subscribe",
  MARKET_UNSUBSCRIBE: "market_unsubscribe",
  
  // Trading events
  TRADE_EXECUTION: "trade_execution",
  ORDER_CREATED: "order_created",
  ORDER_UPDATED: "order_updated",
  ORDER_CANCELLED: "order_cancelled",
  
  // Portfolio events
  PORTFOLIO_UPDATE: "portfolio_update",
  
  // Agent events
  AGENT_STATUS: "agent_status",
  AGENT_ACTION: "agent_action",
  AGENT_COMMAND: "agent_command",
  
  // System events
  SYSTEM_ALERT: "system_alert",
  SYSTEM_STATUS: "system_status",
  
  // ElizaOS integration events
  KNOWLEDGE_UPDATE: "knowledge_update",
  AI_INSIGHT: "ai_insight",
  FARM_STATUS: "farm_status",
  BOSSMAN_MESSAGE: "bossman_message",
  
  // Command center events
  COMMAND_SEND: "command:send",
  COMMAND_RESPONSE: "command:response",
  COMMAND_ERROR: "command:error",
  SYSTEM_MESSAGE: "system:message"
};
