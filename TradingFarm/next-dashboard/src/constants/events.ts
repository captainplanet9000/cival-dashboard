/**
 * System-wide event constants
 */

// Trading events
export const TRADING_EVENTS = {
  // Order events
  ORDER_CREATED: 'order:created',
  ORDER_EXECUTED: 'order:executed',
  ORDER_CANCELED: 'order:canceled',
  ORDER_REJECTED: 'order:rejected',
  
  // Position events
  POSITION_OPENED: 'position:opened',
  POSITION_CLOSED: 'position:closed',
  POSITION_UPDATED: 'position:updated',
  
  // Market data events
  PRICE_UPDATE: 'market:price_update',
  MARKET_STATE_CHANGE: 'market:state_change',
  
  // Trading agent events
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',
  AGENT_SIGNAL: 'agent:signal'
};

// System events
export const SYSTEM_EVENTS = {
  STARTUP: 'system:startup',
  SHUTDOWN: 'system:shutdown',
  ERROR: 'system:error',
  WARNING: 'system:warning',
  INFO: 'system:info'
};

// User events
export const USER_EVENTS = {
  LOGIN: 'user:login',
  LOGOUT: 'user:logout',
  PROFILE_UPDATE: 'user:profile_update',
  SETTINGS_CHANGE: 'user:settings_change'
};

// Notification events
export const NOTIFICATION_EVENTS = {
  NEW: 'notification:new',
  READ: 'notification:read',
  CLEARED: 'notification:cleared'
};

// Farm events
export const FARM_EVENTS = {
  CREATED: 'farm:created',
  UPDATED: 'farm:updated',
  DELETED: 'farm:deleted',
  STATUS_CHANGE: 'farm:status_change'
};

// Export all events in a combined object
export const EVENTS = {
  ...TRADING_EVENTS,
  ...SYSTEM_EVENTS,
  ...USER_EVENTS,
  ...NOTIFICATION_EVENTS,
  ...FARM_EVENTS
};
