/**
 * Type definitions for multi-agent coordination system
 */

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Task status values
 */
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Task types
 */
export enum TaskType {
  MARKET_ANALYSIS = 'market_analysis',
  ORDER_EXECUTION = 'order_execution',
  RISK_ASSESSMENT = 'risk_assessment',
  STRATEGY_OPTIMIZATION = 'strategy_optimization',
  TRADE_SIGNAL_GENERATION = 'trade_signal_generation',
  PORTFOLIO_REBALANCING = 'portfolio_rebalancing',
  PERFORMANCE_EVALUATION = 'performance_evaluation',
  NEWS_ANALYSIS = 'news_analysis',
  AGENT_COMMUNICATION = 'agent_communication',
  DATA_PREPROCESSING = 'data_preprocessing',
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  farmId: string;
  description: string;
  parameters: Record<string, any>;
  createdAt: number;
  deadline?: number;
  assignedTo?: string[];
  status: TaskStatus;
  result?: any;
  error?: string;
  progress?: number;
  updatedAt: number;
  parentTaskId?: string;
  subtaskIds?: string[];
  requiredCapabilities?: string[];
}

/**
 * Agent definition for coordinator
 */
export interface CoordinatorAgent {
  id: string;
  name: string;
  farmId: string;
  status: string;
  capabilities: string[];
  currentTasks: string[];
  maxConcurrentTasks: number;
  priority: number;
  lastHeartbeat: number;
  performance: AgentPerformance;
}

/**
 * Agent performance metrics
 */
export interface AgentPerformance {
  tasksCompleted: number;
  tasksSuccessRate: number;
  averageTaskDuration: number;
  lastCompletionTime?: number;
}

/**
 * Task assignment result
 */
export interface TaskAssignmentResult {
  success: boolean;
  taskId: string;
  assignedAgents: string[];
  error?: string;
}

/**
 * Task result submission
 */
export interface TaskResult {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  result: any;
  error?: string;
  completedAt: number;
  metrics?: Record<string, any>;
}

/**
 * Agent capabilities by task type
 */
export const TASK_CAPABILITIES: Record<TaskType, string[]> = {
  [TaskType.MARKET_ANALYSIS]: ['market_analysis', 'data_analysis'],
  [TaskType.ORDER_EXECUTION]: ['order_execution', 'trade_execution'],
  [TaskType.RISK_ASSESSMENT]: ['risk_assessment', 'risk_management'],
  [TaskType.STRATEGY_OPTIMIZATION]: ['strategy_optimization', 'machine_learning'],
  [TaskType.TRADE_SIGNAL_GENERATION]: ['signal_generation', 'technical_analysis'],
  [TaskType.PORTFOLIO_REBALANCING]: ['portfolio_management', 'asset_allocation'],
  [TaskType.PERFORMANCE_EVALUATION]: ['performance_analysis', 'data_reporting'],
  [TaskType.NEWS_ANALYSIS]: ['news_analysis', 'sentiment_analysis'],
  [TaskType.AGENT_COMMUNICATION]: ['agent_communication', 'coordination'],
  [TaskType.DATA_PREPROCESSING]: ['data_processing', 'data_transformation'],
};
