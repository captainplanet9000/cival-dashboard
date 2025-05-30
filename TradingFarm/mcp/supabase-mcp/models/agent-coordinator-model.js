/**
 * Agent Coordinator Model
 * 
 * Defines the structure and validation for the central coordinator that oversees all specialized agents.
 * The coordinator manages agent relationships, task assignments, and workflow orchestration.
 */

/**
 * Types of tasks that can be assigned to agents
 * @enum {string}
 */
const TaskTypes = {
  // Market analysis tasks
  MARKET_ANALYSIS: 'market_analysis',
  
  // Trade execution tasks
  TRADE_EXECUTION: 'trade_execution',
  
  // Risk management tasks
  RISK_MANAGEMENT: 'risk_management',
  
  // Portfolio balancing tasks
  PORTFOLIO_BALANCING: 'portfolio_balancing',
  
  // Strategy optimization tasks
  STRATEGY_OPTIMIZATION: 'strategy_optimization',
  
  // Data collection tasks
  DATA_COLLECTION: 'data_collection',
  
  // System maintenance tasks
  SYSTEM_MAINTENANCE: 'system_maintenance',
  
  // Performance reporting tasks
  PERFORMANCE_REPORTING: 'performance_reporting'
};

/**
 * Status options for tasks
 * @enum {string}
 */
const TaskStatus = {
  // Task has been created but not assigned
  CREATED: 'created',
  
  // Task has been assigned to an agent
  ASSIGNED: 'assigned',
  
  // Task is currently being processed
  IN_PROGRESS: 'in_progress',
  
  // Task has been completed successfully
  COMPLETED: 'completed',
  
  // Task failed to complete
  FAILED: 'failed',
  
  // Task has been cancelled
  CANCELLED: 'cancelled',
  
  // Task is waiting for another task
  WAITING: 'waiting'
};

/**
 * Agent specialization types
 * @enum {string}
 */
const AgentSpecializations = {
  // Market analysis specialists
  MARKET_ANALYSIS: 'market_analysis',
  
  // Execution specialists
  EXECUTION: 'execution',
  
  // Risk management specialists
  RISK_MANAGEMENT: 'risk_management',
  
  // Portfolio optimization specialists
  PORTFOLIO_OPTIMIZATION: 'portfolio_optimization',
  
  // Cross-chain arbitrage specialists
  CROSS_CHAIN_ARBITRAGE: 'cross_chain_arbitrage',
  
  // Long-term trend specialists
  LONG_TERM_TREND: 'long_term_trend',
  
  // Short-term trend specialists
  SHORT_TERM_TREND: 'short_term_trend',
  
  // General purpose agents
  GENERAL: 'general'
};

/**
 * Coordination workflow types
 * @enum {string}
 */
const WorkflowTypes = {
  // Sequential workflow where tasks are executed in order
  SEQUENTIAL: 'sequential',
  
  // Parallel workflow where tasks are executed simultaneously
  PARALLEL: 'parallel',
  
  // Conditional workflow where execution path depends on outcomes
  CONDITIONAL: 'conditional',
  
  // Event-driven workflow triggered by specific events
  EVENT_DRIVEN: 'event_driven'
};

/**
 * Validate a task assignment
 * @param {Object} taskAssignment - Task assignment object to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validateTaskAssignment(taskAssignment) {
  const errors = [];
  
  // Check required fields
  if (!taskAssignment.task_id) {
    errors.push('Task ID is required');
  }
  
  if (!taskAssignment.agent_id) {
    errors.push('Agent ID is required');
  }
  
  if (!taskAssignment.task_type) {
    errors.push('Task type is required');
  } else if (!Object.values(TaskTypes).includes(taskAssignment.task_type)) {
    errors.push(`Invalid task type: ${taskAssignment.task_type}`);
  }
  
  if (taskAssignment.status && !Object.values(TaskStatus).includes(taskAssignment.status)) {
    errors.push(`Invalid status: ${taskAssignment.status}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate a workflow definition
 * @param {Object} workflow - Workflow definition to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validateWorkflow(workflow) {
  const errors = [];
  
  // Check required fields
  if (!workflow.workflow_id) {
    errors.push('Workflow ID is required');
  }
  
  if (!workflow.name) {
    errors.push('Workflow name is required');
  }
  
  if (!workflow.workflow_type) {
    errors.push('Workflow type is required');
  } else if (!Object.values(WorkflowTypes).includes(workflow.workflow_type)) {
    errors.push(`Invalid workflow type: ${workflow.workflow_type}`);
  }
  
  if (!workflow.tasks || !Array.isArray(workflow.tasks) || workflow.tasks.length === 0) {
    errors.push('Workflow must include at least one task');
  } else {
    // Validate each task in the workflow
    workflow.tasks.forEach((task, index) => {
      if (!task.task_id) {
        errors.push(`Task at index ${index} is missing a task_id`);
      }
      
      if (!task.task_type) {
        errors.push(`Task at index ${index} is missing a task_type`);
      } else if (!Object.values(TaskTypes).includes(task.task_type)) {
        errors.push(`Invalid task type at index ${index}: ${task.task_type}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format a task assignment for storage
 * @param {Object} taskAssignment - Raw task assignment
 * @returns {Object} Formatted task assignment ready for storage
 */
function formatTaskAssignment(taskAssignment) {
  const now = new Date().toISOString();
  
  return {
    task_id: taskAssignment.task_id,
    agent_id: taskAssignment.agent_id,
    task_type: taskAssignment.task_type,
    parameters: taskAssignment.parameters || {},
    status: taskAssignment.status || TaskStatus.CREATED,
    priority: taskAssignment.priority || 3, // Default medium priority (1-5)
    created_at: taskAssignment.created_at || now,
    updated_at: taskAssignment.updated_at || now,
    due_at: taskAssignment.due_at || null,
    completed_at: taskAssignment.completed_at || null,
    metadata: taskAssignment.metadata || {}
  };
}

/**
 * Format a workflow for storage
 * @param {Object} workflow - Raw workflow definition
 * @returns {Object} Formatted workflow ready for storage
 */
function formatWorkflow(workflow) {
  const now = new Date().toISOString();
  
  return {
    workflow_id: workflow.workflow_id,
    name: workflow.name,
    description: workflow.description || '',
    workflow_type: workflow.workflow_type,
    tasks: workflow.tasks || [],
    dependencies: workflow.dependencies || {},
    status: workflow.status || 'active',
    created_at: workflow.created_at || now,
    updated_at: workflow.updated_at || now,
    metadata: workflow.metadata || {}
  };
}

/**
 * Database schema for task assignments table
 * @type {Object}
 */
const taskAssignmentSchema = {
  tableName: 'agent_task_assignments',
  columns: [
    { name: 'id', type: 'uuid', isPrimary: true, defaultValue: 'uuid_generate_v4()' },
    { name: 'task_id', type: 'text', isNullable: false },
    { name: 'agent_id', type: 'text', isNullable: false },
    { name: 'task_type', type: 'text', isNullable: false },
    { name: 'parameters', type: 'jsonb', isNullable: false, defaultValue: '{}' },
    { name: 'status', type: 'text', isNullable: false, defaultValue: 'created' },
    { name: 'priority', type: 'integer', isNullable: false, defaultValue: 3 },
    { name: 'created_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'due_at', type: 'timestamp with time zone', isNullable: true },
    { name: 'completed_at', type: 'timestamp with time zone', isNullable: true },
    { name: 'metadata', type: 'jsonb', isNullable: false, defaultValue: '{}' },
  ],
  indexes: [
    { name: 'idx_task_assignments_task_id', columns: ['task_id'] },
    { name: 'idx_task_assignments_agent_id', columns: ['agent_id'] },
    { name: 'idx_task_assignments_status', columns: ['status'] },
    { name: 'idx_task_assignments_priority', columns: ['priority'] },
    { name: 'idx_task_assignments_task_type', columns: ['task_type'] },
  ]
};

/**
 * Database schema for workflows table
 * @type {Object}
 */
const workflowSchema = {
  tableName: 'agent_workflows',
  columns: [
    { name: 'id', type: 'uuid', isPrimary: true, defaultValue: 'uuid_generate_v4()' },
    { name: 'workflow_id', type: 'text', isNullable: false },
    { name: 'name', type: 'text', isNullable: false },
    { name: 'description', type: 'text', isNullable: false, defaultValue: '' },
    { name: 'workflow_type', type: 'text', isNullable: false },
    { name: 'tasks', type: 'jsonb', isNullable: false, defaultValue: '[]' },
    { name: 'dependencies', type: 'jsonb', isNullable: false, defaultValue: '{}' },
    { name: 'status', type: 'text', isNullable: false, defaultValue: 'active' },
    { name: 'created_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'updated_at', type: 'timestamp with time zone', isNullable: false, defaultValue: 'now()' },
    { name: 'metadata', type: 'jsonb', isNullable: false, defaultValue: '{}' },
  ],
  indexes: [
    { name: 'idx_workflows_workflow_id', columns: ['workflow_id'] },
    { name: 'idx_workflows_status', columns: ['status'] },
    { name: 'idx_workflows_workflow_type', columns: ['workflow_type'] },
  ]
};

/**
 * SQL statement to create the task assignments table
 * @returns {string} SQL create table statement
 */
function getTaskAssignmentTableSQL() {
  return `
    CREATE TABLE IF NOT EXISTS ${taskAssignmentSchema.tableName} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      parameters JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'created',
      priority INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      due_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON ${taskAssignmentSchema.tableName} (task_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_agent_id ON ${taskAssignmentSchema.tableName} (agent_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON ${taskAssignmentSchema.tableName} (status);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_priority ON ${taskAssignmentSchema.tableName} (priority);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_task_type ON ${taskAssignmentSchema.tableName} (task_type);
  `;
}

/**
 * SQL statement to create the workflows table
 * @returns {string} SQL create table statement
 */
function getWorkflowTableSQL() {
  return `
    CREATE TABLE IF NOT EXISTS ${workflowSchema.tableName} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      workflow_type TEXT NOT NULL,
      tasks JSONB NOT NULL DEFAULT '[]',
      dependencies JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB NOT NULL DEFAULT '{}'
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_workflows_workflow_id ON ${workflowSchema.tableName} (workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_status ON ${workflowSchema.tableName} (status);
    CREATE INDEX IF NOT EXISTS idx_workflows_workflow_type ON ${workflowSchema.tableName} (workflow_type);
  `;
}

module.exports = {
  TaskTypes,
  TaskStatus,
  AgentSpecializations,
  WorkflowTypes,
  validateTaskAssignment,
  validateWorkflow,
  formatTaskAssignment,
  formatWorkflow,
  taskAssignmentSchema,
  workflowSchema,
  getTaskAssignmentTableSQL,
  getWorkflowTableSQL
}; 