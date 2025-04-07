import { Database } from './database.types';

// Base Database Types
export type Tables = Database['public']['Tables'];
export type Workflows = Tables['workflows']['Row'];
export type WorkflowSteps = Tables['workflow_steps']['Row'];
export type WorkflowSchedules = Tables['workflow_schedules']['Row'];
export type WorkflowTemplates = Tables['workflow_templates']['Row'];
export type MonitorConditions = Tables['monitor_conditions']['Row'];
export type WorkflowExecutions = Tables['workflow_executions']['Row'];
export type WorkflowExecutionSteps = Tables['workflow_execution_steps']['Row'];

// Extended Type for Workflow with steps
export interface WorkflowWithSteps extends Workflows {
  steps: WorkflowSteps[];
}

// Types for step types
export type StepType = 'llm_analysis' | 'tool_execution' | 'decision' | 'collaboration' | 'notification' | 'system';

// Types for step and workflow status
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'archived';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

// Types for monitor condition types
export type MonitorConditionType = 'price_threshold' | 'volatility' | 'news_event' | 'technical_indicator' | 'volume_spike' | 'custom';

// Types for workflow execution trigger types
export type TriggerType = 'manual' | 'schedule' | 'condition' | 'api';

// Context for workflow execution
export interface WorkflowContext {
  workflowId: string;
  parameters: Record<string, any>;
  results: Record<string, StepResult>;
  startTime: Date;
  endTime: Date | null;
  status: 'running' | 'completed' | 'failed';
}

// Result of step execution
export interface StepResult {
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
}

// Result of workflow execution
export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed';
  results?: Record<string, StepResult>;
  error?: string;
  startTime: Date;
  endTime: Date;
}

// Types for tool execution
export interface ToolDefinition {
  name: string;
  description: string;
  permissions: string[];
  parameters: Record<string, any>;
  execute: (parameters: any) => Promise<any>;
}

// Type for agent
export interface WorkflowAgent {
  id: string;
  name: string;
  role: string;
  description?: string;
  capabilities?: Record<string, any>;
  tools?: string[];
  parameters?: Record<string, any>;
}

// Decision step option
export interface DecisionOption {
  value: string;
  nextStep?: string;
  isDefault?: boolean;
}

// Collaboration message
export interface CollaborationMessage {
  agentId: string;
  message: string;
  timestamp: Date;
}

// Type for workflow template form
export interface WorkflowTemplateForm {
  name: string;
  description: string;
  steps: any[];
  agentRoles: { 
    name: string;
    required: boolean;
    description: string;
  }[];
  parameters: Record<string, any>;
  category?: string;
}

// Type for monitor condition form
export interface MonitorConditionForm {
  name: string;
  description: string;
  conditionType: MonitorConditionType;
  parameters: Record<string, any>;
  workflowId?: string;
  active: boolean;
}

// Types for different monitor condition parameters
export interface PriceThresholdParameters {
  asset: string;
  exchange: string;
  threshold: number;
  comparator: 'above' | 'below';
}

export interface VolatilityParameters {
  asset: string;
  exchange: string;
  period?: number;
  threshold: number;
}

export interface NewsEventParameters {
  keywords?: string[];
  assets?: string[];
  sentiment_threshold?: number;
  lookback_hours?: number;
}

export interface TechnicalIndicatorParameters {
  asset: string;
  exchange: string;
  indicator: string;
  parameters?: Record<string, any>;
  condition: string;
}

export interface VolumeSpikeParameters {
  asset: string;
  exchange: string;
  threshold?: number;
  lookback_periods?: number;
  timeframe?: string;
}

export interface CustomConditionParameters {
  code: string;
}

// Type for workflow schedule form
export interface WorkflowScheduleForm {
  name: string;
  description?: string;
  cronExpression: string;
  workflowId: string;
  parameters: Record<string, any>;
  active: boolean;
}
