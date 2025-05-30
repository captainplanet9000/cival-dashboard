/**
 * Agent Cooperation Model
 * 
 * Defines the structure and validation for agent cooperation records.
 * Used for documenting agent interactions, decision sharing, and collaborative trading.
 */

/**
 * Types of cooperation between trading agents
 * @enum {string}
 */
const CooperationTypes = {
  // Signal sharing between agents
  SIGNAL_SHARE: 'signal_share',
  
  // One agent asks another for analysis
  ANALYSIS_REQUEST: 'analysis_request',
  
  // Voting on a trading decision
  DECISION_VOTE: 'decision_vote',
  
  // Risk assessment sharing
  RISK_ASSESSMENT: 'risk_assessment',
  
  // Notifying agents of executed trades
  TRADE_NOTIFICATION: 'trade_notification',
  
  // Coordinating stop loss or take profit levels
  RISK_COORDINATION: 'risk_coordination',
  
  // One agent delegating execution to another
  EXECUTION_DELEGATION: 'execution_delegation',
  
  // Market condition update (volatility, liquidity, etc.)
  MARKET_UPDATE: 'market_update',
  
  // Portfolio balance recommendation
  PORTFOLIO_RECOMMENDATION: 'portfolio_recommendation',
  
  // General message between agents
  MESSAGE: 'message'
};

/**
 * Status options for cooperation records
 * @enum {string}
 */
const CooperationStatus = {
  // Just created, no response yet
  PENDING: 'pending',
  
  // Accepted by the receiving agent
  ACCEPTED: 'accepted',
  
  // Rejected by the receiving agent
  REJECTED: 'rejected',
  
  // Acknowledged but not acted upon
  ACKNOWLEDGED: 'acknowledged',
  
  // Successfully processed and completed
  COMPLETED: 'completed',
  
  // Failed during processing
  FAILED: 'failed',
  
  // Expired without being processed
  EXPIRED: 'expired',
  
  // Cancelled by the initiating agent
  CANCELLED: 'cancelled'
};

/**
 * Validate a cooperation record
 * @param {Object} record - Cooperation record to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validateCooperationRecord(record) {
  const errors = [];
  
  // Check required fields
  if (!record.initiator_agent_id) {
    errors.push('Initiator agent ID is required');
  }
  
  if (!record.receiver_agent_id) {
    errors.push('Receiver agent ID is required');
  }
  
  if (!record.cooperation_type) {
    errors.push('Cooperation type is required');
  } else if (!Object.values(CooperationTypes).includes(record.cooperation_type)) {
    errors.push(`Invalid cooperation type: ${record.cooperation_type}`);
  }
  
  if (record.status && !Object.values(CooperationStatus).includes(record.status)) {
    errors.push(`Invalid status: ${record.status}`);
  }
  
  // Validate data field based on cooperation type
  if (record.cooperation_type === CooperationTypes.SIGNAL_SHARE) {
    if (!record.data || !record.data.signal_type || !record.data.symbol) {
      errors.push('Signal share requires signal_type and symbol in data');
    }
  } else if (record.cooperation_type === CooperationTypes.DECISION_VOTE) {
    if (!record.data || !record.data.decision || !record.data.options) {
      errors.push('Decision vote requires decision and options in data');
    }
  } else if (record.cooperation_type === CooperationTypes.TRADE_NOTIFICATION) {
    if (!record.data || !record.data.order_id || !record.data.symbol) {
      errors.push('Trade notification requires order_id and symbol in data');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format a cooperation record for storage
 * @param {Object} record - Raw cooperation record
 * @returns {Object} Formatted record ready for storage
 */
function formatCooperationRecord(record) {
  const now = new Date().toISOString();
  
  return {
    initiator_agent_id: record.initiator_agent_id,
    receiver_agent_id: record.receiver_agent_id,
    cooperation_type: record.cooperation_type,
    data: record.data || {},
    response_data: record.response_data || null,
    metadata: record.metadata || {},
    status: record.status || CooperationStatus.PENDING,
    created_at: record.created_at || now,
    updated_at: record.updated_at || now,
    expires_at: record.expires_at || null
  };
}

/**
 * Database schema for cooperation records table
 * @type {Object}
 */
const cooperationSchema = {
  tableName: 'agent_cooperation',
  columns: [
    { name: 'id', type: 'uuid', isPrimary: true, defaultValue: 'uuid_generate_v4()' },
    { name: 'initiator_agent_id', type: 'text', isNullable: false },
    { name: 'receiver_agent_id', type: 'text', isNullable: false },
    { name: 'cooperation_type', type: 'text', isNullable: false },
    { name: 'data', type: 'jsonb', isNullable: false, defaultValue: '{}' },
    { name: 'response_data', type: 'jsonb', isNullable: true },
    { name: 'metadata', type: 'jsonb', isNullable: false, defaultValue: '{}' },
    { name: 'status', type: 'text', isNullable: false, defaultValue: 'pending' },
    { name: 'created_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'expires_at', type: 'timestamp with time zone', isNullable: true },
  ],
  indexes: [
    { name: 'idx_cooperation_initiator', columns: ['initiator_agent_id'] },
    { name: 'idx_cooperation_receiver', columns: ['receiver_agent_id'] },
    { name: 'idx_cooperation_type', columns: ['cooperation_type'] },
    { name: 'idx_cooperation_status', columns: ['status'] },
    { name: 'idx_cooperation_created', columns: ['created_at'] },
  ]
};

/**
 * SQL statement to create the cooperation table
 * @returns {string} SQL create table statement
 */
function getCreateTableSQL() {
  return `
    CREATE TABLE IF NOT EXISTS ${cooperationSchema.tableName} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      initiator_agent_id TEXT NOT NULL,
      receiver_agent_id TEXT NOT NULL,
      cooperation_type TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      response_data JSONB,
      metadata JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_cooperation_initiator ON ${cooperationSchema.tableName} (initiator_agent_id);
    CREATE INDEX IF NOT EXISTS idx_cooperation_receiver ON ${cooperationSchema.tableName} (receiver_agent_id);
    CREATE INDEX IF NOT EXISTS idx_cooperation_type ON ${cooperationSchema.tableName} (cooperation_type);
    CREATE INDEX IF NOT EXISTS idx_cooperation_status ON ${cooperationSchema.tableName} (status);
    CREATE INDEX IF NOT EXISTS idx_cooperation_created ON ${cooperationSchema.tableName} (created_at);
  `;
}

module.exports = {
  CooperationTypes,
  CooperationStatus,
  validateCooperationRecord,
  formatCooperationRecord,
  cooperationSchema,
  getCreateTableSQL
}; 