// Placeholder interfaces - Define these properly later
// export interface AgentMemory {
//   store(key: string, value: any): Promise<void>;
//   retrieve(key: string): Promise<any>;
//   // ... other memory operations
// }
//
// export interface AgentTools {
//   getTool(name: string): any; // Replace 'any' with a proper tool type/interface
//   // ... other tool management methods
// }

// import { AgentMemory } from '../memory/AgentMemory'; // Placeholder path
// import { AgentTools } from '../tools/AgentTools';   // Placeholder path
import { AgentMemory } from '../memory/AgentMemory';
import { AgentTools } from '../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js'; // Import Supabase client
import { Database } from '@/types/database.types'; // Import DB types

// Placeholder types - Define these properly later
export interface AgentTask {
  id: string;
  type: string;      // e.g., 'data_processing', 'api_call', 'strategic_planning' - maybe replace with commandName?
  payload: any;      // Task-specific data - maybe replace with context?
  priority?: number; // Optional priority (e.g., 1-10, lower is higher priority)
  metadata?: {       // Optional metadata
    source?: string; // e.g., 'user_command', 'system_trigger', 'manager_delegation'
    // createdAt?: string; // ISO timestamp - Moved to top level
    correlationId?: string; // To track related tasks
    [key: string]: any; // Allow other arbitrary metadata
  };
  requiredCapabilities?: string[]; // Optional list of capabilities needed (e.g., ['database_access', 'llm_query'])

  // Added fields for task persistence and tracking
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  command?: string; // The original natural language command, if applicable
  commandName?: string; // Specific command/action derived from interpretation
  context?: any; // Input data/context for the task (potentially replacing payload)
  result?: any | null; // Output/result of the task
  error?: any | null; // Error details if the task failed
  createdAt: Date; // Timestamp of task creation
  updatedAt: Date; // Timestamp of last update
  assignedAgentId?: string | null; // ID of the worker agent assigned to the task
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: string;
}

export interface AgentError {
  code: string;
  message: string;
  details?: any;
}

// Add AgentStatus type
export type AgentStatus = 'idle' | 'busy' | 'error' | 'recovering';

/**
 * Abstract base class for all autonomous agents in the system.
 * Defines the core lifecycle and operational methods.
 */
export abstract class AutonomousAgent {
  // Make supabase client accessible to subclasses if needed, or keep protected
  protected supabase: SupabaseClient<Database>;
  
  constructor(
    public readonly id: string, // Changed to readonly as ID shouldn't change
    protected memory: AgentMemory, // Assuming AgentMemory class/interface exists
    protected tools: AgentTools,      // Assuming AgentTools class/interface exists
    // Add Supabase client to constructor
    supabaseClient: SupabaseClient<Database> 
  ) {
    if (!supabaseClient) {
      throw new Error('Supabase client is required for AutonomousAgent');
    }
    this.supabase = supabaseClient;
  }

  // Agent's current operational status
  protected status: AgentStatus = 'idle';

  /**
   * Updates the agent's status internally and persists it to the database.
   * @param newStatus The new status to set.
   */
  protected async setStatus(newStatus: AgentStatus): Promise<void> { 
    const oldStatus = this.status;
    if (oldStatus === newStatus) return; // No change
    
    this.log('info', `Status changing from ${oldStatus} to ${newStatus}`);
    this.status = newStatus;
    
    // Persist status change to DB
    try {
      const { error } = await this.supabase
        .from('agents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', this.id);
      
      if (error) {
        this.log('error', `Failed to persist status change to DB: ${error.message}`);
        // Decide on error handling: revert status? log only? throw?
        // For now, log the error and continue with the in-memory status change.
      }
    } catch(dbError: any) {
      this.log('error', `Exception persisting status change to DB: ${dbError.message}`);
    }
    // Optionally, emit an event or notify a monitoring service here
  }

  /**
   * Gets the agent's current status.
   * @returns The current status.
   */
  public getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Executes a given task. Handles status updates and basic error catching.
   * Delegates the core task logic to the _performTask method.
   * @param task The task to be executed.
   * @returns A promise resolving to the execution result.
   */
  async execute(task: AgentTask): Promise<ExecutionResult> {
    if (this.status !== 'idle') {
      this.log('warn', `Attempted to execute task ${task.id} while status is ${this.status}. Ignoring.`);
      return {
        success: false,
        error: `Agent is not idle (current status: ${this.status}).`,
      };
    }

    this.log('info', `Starting task: ${task.type} (ID: ${task.id})`, task.payload);
    await this.setStatus('busy'); // Now async

    try {
      const output = await this._performTask(task);
      this.log('info', `Task ${task.id} completed successfully.`);
      await this.setStatus('idle'); // Now async
      return { success: true, output };
    } catch (error: any) {
      this.log('error', `Error executing task ${task.id}: ${error.message}`, error);
      await this.setStatus('error'); // Now async
      const agentError: AgentError = {
        code: 'EXECUTION_FAILED',
        message: `Task ${task.id} failed: ${error.message}`,
        details: error
      };
      // Trigger recovery process
      try {
        await this.recover(agentError);
      } catch (recoveryError: any) {
        this.log('error', `Recovery failed after task error: ${recoveryError.message}`, recoveryError);
        // Stay in error state if recovery fails
      }
      return { success: false, error: agentError.message };
    }
  }

  /**
   * Abstract method to be implemented by subclasses, containing the core logic for executing a task.
   * @param task The task to perform.
   * @returns A promise resolving to the task's output.
   */
  protected abstract _performTask(task: AgentTask): Promise<any>;

  /**
   * Performs a self-diagnosis to check the agent's health.
   * @returns A promise resolving to the agent's health status.
   */
  abstract selfDiagnose(): Promise<HealthStatus>;

  /**
   * Attempts to recover from a given error.
   * @param error The error encountered by the agent.
   * @returns A promise resolving when recovery is attempted (doesn't guarantee success).
   */
  abstract recover(error: AgentError): Promise<void>;

  /**
   * Logs a message with a specified level.
   * Basic implementation using console.log for now.
   * @param level The log level (e.g., 'info', 'warn', 'error').
   * @param message The message to log.
   * @param data Optional additional data to include in the log.
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.id}] [${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
    // In a real implementation, this would integrate with a proper logging framework/service.
  }

  /**
   * Sends a heartbeat signal, updating the timestamp in the database.
   */
  public async sendHeartbeat(): Promise<void> {
    const now = new Date().toISOString();
    this.log('info', 'Sending heartbeat...');
    
    try {
      const { error } = await this.supabase
        .from('agents')
        .update({ last_heartbeat_at: now, updated_at: now })
        .eq('id', this.id);

      if (error) {
        this.log('error', `Failed to update heartbeat timestamp in DB: ${error.message}`);
      }
    } catch (dbError: any) {
      this.log('error', `Exception updating heartbeat timestamp in DB: ${dbError.message}`);
    }
  }

  // Optional: Common methods like heartbeat, logging, etc.
  // async sendHeartbeat(): Promise<void> { ... }
  // log(level: string, message: string, data?: any): void { ... }
} 