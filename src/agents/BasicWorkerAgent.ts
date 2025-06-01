import {
  AutonomousAgent
} from './AutonomousAgent';
import {
  AgentTask,
  ExecutionResult,
  BaseHealthStatus,
  AgentError,
  AgentStatus,
  AgentTool
} from '@/types/agentTypes';
import { AgentMemory } from '../memory/AgentMemory';
import { AgentTools } from '../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { CalculatorTool } from '../tools/CalculatorTool';

/**
 * A basic worker agent implementation.
 * Provides simple implementations for the abstract methods.
 */
export class BasicWorkerAgent extends AutonomousAgent {

  constructor(
    id: string,
    memory: AgentMemory,
    tools: AgentTools,
    supabaseClient: SupabaseClient<Database>
  ) {
    super(id, memory, tools, supabaseClient);
    this.log('info', `BasicWorkerAgent ${id} initialized.`);
  }

  /**
   * Core logic for executing a task in this basic worker.
   * @param task The task to perform.
   * @returns A promise resolving to the task's output.
   */
  protected async _performTask(task: AgentTask): Promise<any> {
    this.log('info', `BasicWorkerAgent ${this.id} starting task: ${task.id} (Type: ${task.type})`, task.payload);

    const requiredToolName = task.commandName;

    if (requiredToolName === 'calculator') {
      this.log('info', `Task ${task.id} requires calculator tool.`);
      const calculatorToolInstance: AgentTool | undefined = this.tools.getTool('calculator');

      if (!calculatorToolInstance) {
        throw new Error(`Calculator tool not registered or available to agent ${this.id}.`);
      }

      const params = calculatorToolInstance.definition.parameters;
      const args = task.payload;
      if (!args || typeof args !== 'object') {
        throw new Error(`Invalid arguments payload for calculator tool in task ${task.id}. Expected object.`);
      }
      const missingParams = Object.keys(params).filter(p => params[p].required && !(p in args));
      if (missingParams.length > 0) {
        throw new Error(`Missing required parameters for calculator tool: ${missingParams.join(', ')} in task ${task.id}.`);
      }
      if (typeof args.operation !== 'string' || typeof args.operand1 !== 'number' || typeof args.operand2 !== 'number') {
        throw new Error(`Incorrect argument types for calculator tool in task ${task.id}.`);
      }

      try {
        this.log('info', `Executing calculator tool for task ${task.id} with args:`, args);
        const result = await calculatorToolInstance.execute(args as { operation: string; operand1: number; operand2: number });
        this.log('info', `Calculator tool execution successful for task ${task.id}. Result: ${result}`);
        return result;
      } catch (toolError: any) {
        this.log('error', `Calculator tool failed for task ${task.id}: ${toolError.message}`, toolError);
        throw new Error(`Tool execution failed: ${toolError.message}`);
      }
    } else {
      this.log('warn', `Task type "${task.type}" or command "${task.commandName}" not explicitly handled by BasicWorkerAgent ${this.id}. Simulating completion.`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { message: `Task ${task.id} of type ${task.type} simulated completion.` };
    }
  }

  /**
   * Simple self-diagnosis: always returns healthy.
   */
  async selfDiagnose(): Promise<BaseHealthStatus> {
    this.log('info', 'Running self-diagnosis...');
    try {
      const healthCheckKey = `health_check_${this.id}`;
      await this.memory.store(healthCheckKey, { timestamp: Date.now() });
      await this.memory.retrieve(healthCheckKey);
      await this.memory.remove(healthCheckKey);
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error: any) {
      this.log('error', 'Self-diagnosis failed during memory access.', error);
      return { status: 'unhealthy', details: `Memory access failed: ${error.message}`, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Simple recovery attempt: logs the error and sets status to idle.
   */
  async recover(error: AgentError): Promise<void> {
    this.log('warn', `Attempting recovery from error: ${error.message}`, error);
    await this.setStatus('recovering');
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.log('info', 'Basic recovery complete. Returning to idle state.');
    await this.setStatus('idle');
  }
} 