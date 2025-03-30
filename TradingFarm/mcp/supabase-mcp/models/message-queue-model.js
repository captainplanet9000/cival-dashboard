/**
 * Message Queue Model
 * 
 * Defines the structure and validation for the message queue system 
 * that enables inter-agent communication in the Trading Farm.
 */

/**
 * Types of messages that can be exchanged between agents
 * @enum {string}
 */
const MessageTypes = {
  // General information message
  INFO: 'info',
  
  // Signals about trading opportunities
  SIGNAL: 'signal',
  
  // Data about market conditions
  MARKET_DATA: 'market_data',
  
  // Orders that have been executed
  EXECUTION: 'execution',
  
  // Risk assessment information
  RISK_ASSESSMENT: 'risk_assessment',
  
  // Decisions that need to be made
  DECISION: 'decision',
  
  // Responses to previous messages
  RESPONSE: 'response',
  
  // System-level alerts
  ALERT: 'alert',
  
  // Workflow status updates
  WORKFLOW: 'workflow',
  
  // Command messages to control agent behavior
  COMMAND: 'command'
};

/**
 * Priority levels for messages
 * @enum {number}
 */
const MessagePriority = {
  // Highest priority, processed immediately
  CRITICAL: 1,
  
  // High priority, processed before normal messages
  HIGH: 2,
  
  // Standard priority
  NORMAL: 3,
  
  // Lower priority, processed when resources available
  LOW: 4,
  
  // Lowest priority, background processing
  BACKGROUND: 5
};

/**
 * Status options for messages
 * @enum {string}
 */
const MessageStatus = {
  // Message has been created but not delivered
  QUEUED: 'queued',
  
  // Message has been delivered to the recipient
  DELIVERED: 'delivered',
  
  // Message has been processed by the recipient
  PROCESSED: 'processed',
  
  // Failed to deliver the message
  FAILED: 'failed',
  
  // Message has expired (time to live exceeded)
  EXPIRED: 'expired',
  
  // Message delivery has been cancelled
  CANCELLED: 'cancelled',
  
  // Message is scheduled for future delivery
  SCHEDULED: 'scheduled'
};

/**
 * Delivery modes for messages
 * @enum {string}
 */
const DeliveryModes = {
  // Direct message to a specific agent
  DIRECT: 'direct',
  
  // Broadcast to all agents
  BROADCAST: 'broadcast',
  
  // Message to agents with specific specialization
  SPECIALIZATION: 'specialization',
  
  // Publish-subscribe pattern
  PUBSUB: 'pubsub',
  
  // Request-response pattern
  REQUEST_RESPONSE: 'request_response'
};

/**
 * Validate a message
 * @param {Object} message - Message object to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validateMessage(message) {
  const errors = [];
  
  // Check required fields
  if (!message.sender_id) {
    errors.push('Sender ID is required');
  }
  
  if (!message.message_type) {
    errors.push('Message type is required');
  } else if (!Object.values(MessageTypes).includes(message.message_type)) {
    errors.push(`Invalid message type: ${message.message_type}`);
  }
  
  if (!message.payload) {
    errors.push('Message payload is required');
  }
  
  if (message.delivery_mode) {
    if (!Object.values(DeliveryModes).includes(message.delivery_mode)) {
      errors.push(`Invalid delivery mode: ${message.delivery_mode}`);
    }
    
    // For direct messages, recipient_id is required
    if (message.delivery_mode === DeliveryModes.DIRECT && !message.recipient_id) {
      errors.push('Recipient ID is required for direct messages');
    }
    
    // For specialization messages, specialization is required
    if (message.delivery_mode === DeliveryModes.SPECIALIZATION && !message.specialization) {
      errors.push('Specialization is required for specialization delivery mode');
    }
    
    // For pubsub messages, topic is required
    if (message.delivery_mode === DeliveryModes.PUBSUB && !message.topic) {
      errors.push('Topic is required for pubsub delivery mode');
    }
  }
  
  if (message.priority && !Object.values(MessagePriority).includes(message.priority)) {
    errors.push(`Invalid priority: ${message.priority}`);
  }
  
  if (message.status && !Object.values(MessageStatus).includes(message.status)) {
    errors.push(`Invalid status: ${message.status}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format a message for storage
 * @param {Object} message - Raw message
 * @returns {Object} Formatted message ready for storage
 */
function formatMessage(message) {
  const now = new Date().toISOString();
  
  return {
    message_id: message.message_id || crypto.randomUUID(),
    sender_id: message.sender_id,
    recipient_id: message.recipient_id || null,
    specialization: message.specialization || null,
    topic: message.topic || null,
    correlation_id: message.correlation_id || null,
    message_type: message.message_type,
    delivery_mode: message.delivery_mode || DeliveryModes.DIRECT,
    priority: message.priority || MessagePriority.NORMAL,
    payload: message.payload || {},
    status: message.status || MessageStatus.QUEUED,
    created_at: message.created_at || now,
    updated_at: message.updated_at || now,
    delivered_at: message.delivered_at || null,
    processed_at: message.processed_at || null,
    scheduled_for: message.scheduled_for || null,
    expires_at: message.expires_at || null,
    retries: message.retries || 0,
    max_retries: message.max_retries || 3,
    metadata: message.metadata || {}
  };
}

/**
 * Database schema for messages queue table
 * @type {Object}
 */
const messageQueueSchema = {
  tableName: 'agent_messages',
  columns: [
    { name: 'id', type: 'uuid', isPrimary: true, defaultValue: 'uuid_generate_v4()' },
    { name: 'message_id', type: 'text', isNullable: false },
    { name: 'sender_id', type: 'text', isNullable: false },
    { name: 'recipient_id', type: 'text', isNullable: true },
    { name: 'specialization', type: 'text', isNullable: true },
    { name: 'topic', type: 'text', isNullable: true },
    { name: 'correlation_id', type: 'text', isNullable: true },
    { name: 'message_type', type: 'text', isNullable: false },
    { name: 'delivery_mode', type: 'text', isNullable: false, defaultValue: 'direct' },
    { name: 'priority', type: 'integer', isNullable: false, defaultValue: 3 },
    { name: 'payload', type: 'jsonb', isNullable: false, defaultValue: '{}' },
    { name: 'status', type: 'text', isNullable: false, defaultValue: 'queued' },
    { name: 'created_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'delivered_at', type: 'timestamp with time zone', isNullable: true },
    { name: 'processed_at', type: 'timestamp with time zone', isNullable: true },
    { name: 'scheduled_for', type: 'timestamp with time zone', isNullable: true },
    { name: 'expires_at', type: 'timestamp with time zone', isNullable: true },
    { name: 'retries', type: 'integer', isNullable: false, defaultValue: 0 },
    { name: 'max_retries', type: 'integer', isNullable: false, defaultValue: 3 },
    { name: 'metadata', type: 'jsonb', isNullable: false, defaultValue: '{}' },
  ],
  indexes: [
    { name: 'idx_messages_message_id', columns: ['message_id'] },
    { name: 'idx_messages_sender_id', columns: ['sender_id'] },
    { name: 'idx_messages_recipient_id', columns: ['recipient_id'] },
    { name: 'idx_messages_status', columns: ['status'] },
    { name: 'idx_messages_correlation_id', columns: ['correlation_id'] },
    { name: 'idx_messages_priority', columns: ['priority'] },
    { name: 'idx_messages_topic', columns: ['topic'] },
    { name: 'idx_messages_specialization', columns: ['specialization'] },
    { name: 'idx_messages_created_at', columns: ['created_at'] },
    { name: 'idx_messages_scheduled_for', columns: ['scheduled_for'] },
  ]
};

/**
 * Database schema for message subscriptions table
 * @type {Object}
 */
const messageSubscriptionSchema = {
  tableName: 'agent_message_subscriptions',
  columns: [
    { name: 'id', type: 'uuid', isPrimary: true, defaultValue: 'uuid_generate_v4()' },
    { name: 'agent_id', type: 'text', isNullable: false },
    { name: 'topic', type: 'text', isNullable: false },
    { name: 'created_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'filter_criteria', type: 'jsonb', isNullable: false, defaultValue: '{}' },
    { name: 'active', type: 'boolean', isNullable: false, defaultValue: true },
  ],
  indexes: [
    { name: 'idx_subscriptions_agent_id', columns: ['agent_id'] },
    { name: 'idx_subscriptions_topic', columns: ['topic'] },
    { name: 'idx_subscriptions_agent_topic', columns: ['agent_id', 'topic'] },
    { name: 'idx_subscriptions_active', columns: ['active'] },
  ]
};

/**
 * SQL statement to create the message queue table
 * @returns {string} SQL create table statement
 */
function getMessageQueueTableSQL() {
  return `
    CREATE TABLE IF NOT EXISTS ${messageQueueSchema.tableName} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      recipient_id TEXT,
      specialization TEXT,
      topic TEXT,
      correlation_id TEXT,
      message_type TEXT NOT NULL,
      delivery_mode TEXT NOT NULL DEFAULT 'direct',
      priority INTEGER NOT NULL DEFAULT 3,
      payload JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      delivered_at TIMESTAMPTZ,
      processed_at TIMESTAMPTZ,
      scheduled_for TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      retries INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      metadata JSONB NOT NULL DEFAULT '{}'
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_messages_message_id ON ${messageQueueSchema.tableName} (message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON ${messageQueueSchema.tableName} (sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON ${messageQueueSchema.tableName} (recipient_id);
    CREATE INDEX IF NOT EXISTS idx_messages_status ON ${messageQueueSchema.tableName} (status);
    CREATE INDEX IF NOT EXISTS idx_messages_correlation_id ON ${messageQueueSchema.tableName} (correlation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_priority ON ${messageQueueSchema.tableName} (priority);
    CREATE INDEX IF NOT EXISTS idx_messages_topic ON ${messageQueueSchema.tableName} (topic);
    CREATE INDEX IF NOT EXISTS idx_messages_specialization ON ${messageQueueSchema.tableName} (specialization);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON ${messageQueueSchema.tableName} (created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_scheduled_for ON ${messageQueueSchema.tableName} (scheduled_for);
  `;
}

/**
 * SQL statement to create the message subscriptions table
 * @returns {string} SQL create table statement
 */
function getMessageSubscriptionTableSQL() {
  return `
    CREATE TABLE IF NOT EXISTS ${messageSubscriptionSchema.tableName} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      filter_criteria JSONB NOT NULL DEFAULT '{}',
      active BOOLEAN NOT NULL DEFAULT true
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_subscriptions_agent_id ON ${messageSubscriptionSchema.tableName} (agent_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_topic ON ${messageSubscriptionSchema.tableName} (topic);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_agent_topic ON ${messageSubscriptionSchema.tableName} (agent_id, topic);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON ${messageSubscriptionSchema.tableName} (active);
  `;
}

module.exports = {
  MessageTypes,
  MessagePriority,
  MessageStatus,
  DeliveryModes,
  validateMessage,
  formatMessage,
  messageQueueSchema,
  messageSubscriptionSchema,
  getMessageQueueTableSQL,
  getMessageSubscriptionTableSQL
}; 