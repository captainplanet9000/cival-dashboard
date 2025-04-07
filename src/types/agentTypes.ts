export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Represents the different operational statuses an agent can be in.
 */
export type AgentStatus = 'initializing' | 'idle' | 'busy' | 'error' | 'recovering';

/**
 * Defines the structure for a task assigned to an agent.
 */
export interface AgentTask {
  id: string; // Unique identifier for the task
  type: string; // Type of task (e.g., 'api_call', 'data_query') - potentially derived from commandName
  payload: any; // Input data required for the task
  priority?: number; // Task priority (lower is higher)
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed'; // Current status of the task
  command?: string; // The original natural language command, if applicable
  commandName?: string; // Specific command/action derived from interpretation
  context?: any; // Additional context (might overlap/replace payload)
  result?: any | null; // Output/result of the task execution
  error?: any | null; // Error details if the task failed
  createdAt: Date; // Timestamp of task creation
  updatedAt: Date; // Timestamp of last update
  assignedAgentId?: string | null; // ID of the worker agent assigned to the task
  metadata?: { // Optional metadata
    source?: string; // e.g., 'user_command', 'system_trigger'
    correlationId?: string;
    [key: string]: any;
  };
  requiredCapabilities?: string[]; // Capabilities needed (e.g., 'llm_query')
}

/**
 * Represents the standard result format for agent operations or task executions.
 */
export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
}

/**
 * Defines the structure for reporting agent health.
 */
export interface BaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: string;
  timestamp: string; // ISO timestamp
  // Add metrics if needed, e.g., cpuUsage, memoryUsage
}

/**
 * Defines the structure for reporting errors encountered by agents.
 */
export interface AgentError {
  code: string; // e.g., 'EXECUTION_FAILED', 'TOOL_NOT_FOUND', 'RECOVERY_FAILED'
  message: string; // Human-readable error message
  details?: any; // Additional error context or stack trace
}

// --- Agent Tool Definitions ---

/**
 * Describes the input parameters expected by a tool.
 * Uses a format compatible with JSON Schema.
 */
export interface ToolParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  properties?: { [key: string]: ToolParameterDefinition }; // For object type
  items?: ToolParameterDefinition; // For array type
}

/**
 * Defines the static properties of an agent tool.
 */
export interface ToolDefinition {
  name: string; // Unique name for the tool
  description: string; // What the tool does
  parameters: { [key: string]: ToolParameterDefinition }; // Input parameters schema
  // Optional: Define output schema if needed
  // outputSchema?: ToolParameterDefinition; 
}

/**
 * Interface representing an executable tool that agents can use.
 */
export interface AgentTool {
  definition: ToolDefinition;
  /**
   * Executes the tool with the provided arguments.
   * @param args An object matching the structure defined in `definition.parameters`.
   * @returns A promise resolving to the tool's output.
   */
  execute(args: { [key: string]: any }): Promise<any>;
} 