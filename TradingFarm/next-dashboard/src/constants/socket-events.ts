/**
 * Trading Farm WebSocket Event Constants
 * 
 * These constants define the event types used for WebSocket communication
 * between the client and server. Using constants ensures type safety and
 * consistency across the codebase.
 */

export const TRADING_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  ERROR: 'error',
  
  // Strategy events
  GET_STRATEGIES: 'get_strategies',
  CREATE_STRATEGY: 'create_strategy',
  UPDATE_STRATEGY: 'update_strategy',
  DELETE_STRATEGY: 'delete_strategy',
  CHANGE_STRATEGY_STATUS: 'change_strategy_status',
  GET_STRATEGY_PERFORMANCE: 'get_strategy_performance',
  GET_STRATEGY_TEMPLATES: 'get_strategy_templates',
  GET_STRATEGY_TYPES: 'get_strategy_types',
  STRATEGY_CREATED: 'strategy_created',
  STRATEGY_UPDATED: 'strategy_updated',
  STRATEGY_DELETED: 'strategy_deleted',
  STRATEGY_STATUS_CHANGED: 'strategy_status_changed',
  STRATEGY_PERFORMANCE_UPDATE: 'strategy_performance_update',
  
  // Strategy-Agent assignment events
  GET_STRATEGY_AGENTS: 'get_strategy_agents',
  ASSIGN_STRATEGY: 'assign_strategy',
  UNASSIGN_STRATEGY: 'unassign_strategy',
  STRATEGY_ASSIGNED: 'strategy_assigned',
  STRATEGY_UNASSIGNED: 'strategy_unassigned',
  STRATEGY_ASSIGNMENT_UPDATED: 'strategy_assignment_updated',
  RUN_STRATEGY_BACKTEST: 'run_strategy_backtest',
  BACKTEST_RESULT: 'backtest_result',
  
  // Trading events
  GET_ACTIVE_TRADES: 'get_active_trades',
  GET_TRADE_HISTORY: 'get_trade_history',
  NEW_TRADE: 'new_trade',
  TRADE_UPDATED: 'trade_updated',
  TRADE_CLOSED: 'trade_closed',
  TRADE_EXECUTED: 'trade_executed',
  
  // Market data events
  MARKET_DATA_UPDATE: 'market_data_update',
  PRICE_UPDATE: 'price_update',
  ORDERBOOK_UPDATE: 'orderbook_update',
  TICKER_UPDATE: 'ticker_update',
  MARKET_CHART: 'market_chart',
  MARKET_UPDATE: 'market_update',
  
  // Farm events
  GET_FARMS: 'get_farms',
  CREATE_FARM: 'create_farm',
  UPDATE_FARM: 'update_farm',
  DELETE_FARM: 'delete_farm',
  FARM_CREATED: 'farm_created',
  FARM_UPDATED: 'farm_updated',
  FARM_DELETED: 'farm_deleted',
  FARM_STATUS_CHANGED: 'farm_status_changed',
  
  // Agent events
  GET_AGENTS: 'get_agents',
  CREATE_AGENT: 'create_agent',
  UPDATE_AGENT: 'update_agent',
  DELETE_AGENT: 'delete_agent',
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  AGENT_DELETED: 'agent_deleted',
  AGENT_STATUS: 'agent_status',
  AGENT_PERFORMANCE: 'agent_performance',
  AGENT_COMMAND: 'agent_command',
  AGENT_ALERT: 'agent_alert',
  AGENT_MESSAGE: 'agent_message',
  AGENT_TRADE: 'agent_trade',
  AGENT_STRATEGY_EXECUTED: 'agent_strategy_executed',
  AGENT_MONITOR_STATUS: 'agent_monitor_status',
  AGENT_ASSIGNED: 'agent_assigned',
  AGENT_UNASSIGNED: 'agent_unassigned',
  AGENT_STATUS_CHANGED: 'agent_status_changed',
  
  // Goal events
  GET_GOALS: 'get_goals',
  CREATE_GOAL: 'create_goal',
  UPDATE_GOAL: 'update_goal',
  DELETE_GOAL: 'delete_goal',
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  GOAL_DELETED: 'goal_deleted',
  GOAL_STATUS_CHANGED: 'goal_status_changed',
  GOAL_PROGRESS_UPDATE: 'goal_progress_update',
  
  // Portfolio events
  PORTFOLIO_UPDATE: 'portfolio_update',
  BALANCE_UPDATE: 'balance_update',
  ASSET_UPDATE: 'asset_update',
  
  // ElizaOS events
  ELIZA_COMMAND: 'eliza_command',
  ELIZA_RESPONSE: 'eliza_response',
  ELIZA_STATUS: 'eliza_status',
  ELIZA_LOG: 'eliza_log',
  COMMAND_PROCESSING: 'command_processing',
  COMMAND_RESPONSE: 'command_response',
  
  // Knowledge events
  KNOWLEDGE_QUERY: 'knowledge_query',
  KNOWLEDGE_RESPONSE: 'knowledge_response',
  KNOWLEDGE_UPDATE: 'knowledge_update',
  
  // System events
  SYSTEM_STATUS: 'system_status',
  SYSTEM_ALERT: 'system_alert',
  SYSTEM_LOG: 'system_log'
} as const;
