// Placeholder interfaces - Define these properly later
export interface AgentMemory {
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  // ... other memory operations
}

export interface AgentTools {
  getTool(name: string): any; // Replace 'any' with a proper tool type/interface
  // ... other tool management methods
}

// import { AgentMemory } from '../memory/AgentMemory'; // Placeholder path
// import { AgentTools } from '../tools/AgentTools';   // Placeholder path

// Placeholder types - Define these properly later
export interface AgentTask {
  id: string;
  type: string;
  payload: any;
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

/**
 * Abstract base class for all autonomous agents in the system.
 * Defines the core lifecycle and operational methods.
 */
export abstract class AutonomousAgent {
  constructor(
    public readonly id: string, // Changed to readonly as ID shouldn't change
    protected memory: AgentMemory, // Assuming AgentMemory class/interface exists
    protected tools: AgentTools      // Assuming AgentTools class/interface exists
  ) {}

  /**
   * Executes a given task.
   * @param task The task to be executed.
   * @returns A promise resolving to the execution result.
   */
  abstract execute(task: AgentTask): Promise<ExecutionResult>;

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

  // Optional: Common methods like heartbeat, logging, etc.
  // async sendHeartbeat(): Promise<void> { ... }
  // log(level: string, message: string, data?: any): void { ... }
} 