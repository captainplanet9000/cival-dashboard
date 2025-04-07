import {
    ManagerAgent,
    ManagerHealthStatus // Import the manager-specific health status
} from './ManagerAgent';
import {
    AutonomousAgent, // Need this for worker pool typing
    AgentTask,
    ExecutionResult,
    HealthStatus as BaseHealthStatus, // Correct single import with alias
    AgentError,
    AgentStatus
} from './AutonomousAgent';
import { AgentMemory } from '../memory/AgentMemory';
import { AgentTools } from '../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js'; 
import { Database } from '@/types/database.types';
import { v4 as uuidv4 } from 'uuid'; // For generating task IDs
// import { ElizaOSClient } from '../lib/elizaos/ElizaOSClient'; // Placeholder path
// import { ElizaWorkerAgent } from './ElizaWorkerAgent'; // Placeholder path

// Placeholder interface for ElizaOS integration
// TODO: Define this interface based on actual ElizaOS client capabilities
export interface ElizaOSClient {
    analyzeTaskRequirements(task: AgentTask): Promise<{ suitableWorkerType: string, priority: number }>;
    getWorkerRecommendations(criteria: any): Promise<string[]>; // Array of worker IDs
    reportAgentStatus(agentId: string, status: BaseHealthStatus): Promise<void>;
    interpretNaturalLanguageCommand(command: string): Promise<AgentTask>;
    query(topic: string, prompt: string, context?: any): Promise<any>; 
    createAgent(spec: any): Promise<{ id: string; /* other details */ }>; 
    destroyAgent(agentId: string): Promise<void>; 
    strategicQuery(topic: string, prompt: string, context?: any): Promise<any>; 
}

// Remove the PlaceholderElizaOSClient class from this file
// We will create a dedicated mock file

/**
 * Represents a Manager Agent enhanced with ElizaOS capabilities for intelligent
 * task management, monitoring, and natural language interaction.
 */
export class ElizaManagerAgent extends ManagerAgent {
    protected elizaClient: ElizaOSClient;

    // Correct constructor signature
    constructor(
        id: string,
        memory: AgentMemory,
        tools: AgentTools,
        elizaClient: ElizaOSClient,
        supabaseClient: SupabaseClient<Database> // Add supabase client
    ) {
        // Pass supabaseClient up to ManagerAgent constructor
        super(id, memory, tools, supabaseClient); 
        this.elizaClient = elizaClient;
        this.log('info', `ElizaManagerAgent ${id} initialized with ElizaOS integration.`);
    }

    /**
     * Core task execution logic enhanced by ElizaOS.
     * Uses ElizaOS to determine the best worker for the task.
     * @param task The task to be performed.
     * @returns A promise resolving to the task's output.
     */
    protected async _performTask(task: AgentTask): Promise<any> {
        this.log('info', `ElizaManager ${this.id} received task: ${task.type} (ID: ${task.id})`);

        try {
            this.log('info', `Querying ElizaOS for worker recommendations for task ${task.id}...`);
            // Assuming getWorkerRecommendations is the correct method
            const recommendedWorkerIds = await this.elizaClient.getWorkerRecommendations({ taskType: task.type, payload: task.payload });
            this.log('info', `ElizaOS recommended workers: ${recommendedWorkerIds.join(', ')}`);

            let selectedWorker: AutonomousAgent | undefined;
            for (const workerId of recommendedWorkerIds) {
                const potentialWorker = this.getWorker(workerId); // Use getWorker from ManagerAgent
                if (potentialWorker && potentialWorker.getStatus() === 'idle') {
                    selectedWorker = potentialWorker;
                    this.log('info', `Selected available worker ${selectedWorker.id} based on ElizaOS recommendation.`);
                    break;
                }
            }
            
            if (!selectedWorker) {
                 this.log('warn', `No recommended ElizaOS worker available. Falling back to any idle worker.`);
                 // Use correct property workerPool
                 for (const worker of this.workerPool.values()) { 
                     if (worker.getStatus() === 'idle') {
                         selectedWorker = worker;
                         this.log('info', `Selected fallback worker ${selectedWorker.id}.`);
                         break;
                     }
                 }
            }

            if (!selectedWorker) {
                this.log('error', `No available worker found via Eliza recommendation or fallback for task ${task.id}`);
                throw new Error(`ElizaManager ${this.id}: No suitable or available worker found for task ${task.id}.`);
            }

            this.log('info', `Delegating task ${task.id} to worker ${selectedWorker.id}`);
            const workerResult = await selectedWorker.execute(task);

            if (!workerResult.success) {
                this.log('error', `Worker ${selectedWorker.id} failed task ${task.id}: ${workerResult.error}`);
                throw new Error(`Worker ${selectedWorker.id} failed task ${task.id}: ${workerResult.error}`);
            }

            return workerResult.output;
        } catch (error: any) {
            this.log('error', `Error in ElizaManager _performTask for task ${task.id}: ${error.message}`);
            throw error; 
        }
    }

    /**
     * Performs a self-diagnosis, reporting status to ElizaOS.
     * @returns A promise resolving to the manager's health status.
     */
    async selfDiagnose(): Promise<ManagerHealthStatus> {
        this.log('info', `ElizaManager ${this.id} performing self-diagnosis...`);
        const healthStatus = await super.selfDiagnose(); 
        
        try {
            const baseStatus: BaseHealthStatus = { status: healthStatus.status, details: healthStatus.details }; 
            await this.elizaClient.reportAgentStatus(this.id, baseStatus);
            this.log('info', 'Successfully reported manager status to ElizaOS.');

            if (healthStatus.workerStatuses) {
                for (const [workerId, workerHealth] of Object.entries(healthStatus.workerStatuses)) {
                    if (workerHealth?.status) {
                         try {
                             // Ensure reportAgentStatus exists on the client interface
                             if (this.elizaClient.reportAgentStatus) {
                                 await this.elizaClient.reportAgentStatus(workerId, workerHealth);
                             }
                         } catch (workerReportError: any) {
                              this.log('error', `Failed to report status for worker ${workerId} to ElizaOS: ${workerReportError.message}`);
                         }
                    }
                }
            }

        } catch (error: any) {
            this.log('error', `Failed to report status to ElizaOS during self-diagnosis: ${error.message}`);
        }

        return healthStatus;
    }

    /**
     * Attempts recovery, potentially consulting ElizaOS for strategies.
     * @param error The error encountered by the agent.
     * @returns A promise resolving when recovery is attempted.
     */
    async recover(error: AgentError): Promise<void> {
        this.log('warn', `ElizaManager ${this.id} attempting recovery from error: ${error.code}`);
        this.setStatus('recovering');
        
        try {
            this.log('info', 'Executing base manager recovery logic (diagnose/recover workers).');
            await super.recover(error);

            const currentStatus = this.getStatus();
            if (currentStatus === 'recovering') {
                this.log('warn', 'Manager still in recovering state after base recovery attempt. Checking health...');
                const postRecoveryHealth = await this.selfDiagnose(); 
                if (postRecoveryHealth.status === 'healthy') {
                    this.log('info', 'Manager recovered successfully.');
                    this.setStatus('idle');
                } else {
                    this.log('error', `Manager failed to recover. Final status: ${postRecoveryHealth.status}`);
                    this.setStatus('error'); 
                }
            } else if (currentStatus === 'idle') {
                this.log('info', 'Manager recovery successful (status set to idle by base recover).');
            } else {
                 this.log('error', `Manager ended in unexpected status (${currentStatus}) after recovery attempt.`);
                 this.setStatus('error'); 
            }

        } catch (recoveryProcessError: any) {
            this.log('error', `ElizaManager ${this.id} recovery process failed: ${recoveryProcessError.message}`);
            this.setStatus('error'); 
            throw recoveryProcessError;
        }
    }

    /**
     * Processes a natural language command using ElizaOS.
     * @param command The natural language command string.
     * @returns A promise resolving to the result of executing the interpreted task.
     */
    async processNaturalLanguageCommand(command: string, context: any = {}): Promise<{ success: boolean; output?: any; error?: string, taskId?: string }> {
        this.log('info', `Processing natural language command: "${command}"`, context);
        await this.setStatus('busy');
        let taskId: string | undefined;

        try {
            const interpretation = await this.elizaClient.query('command_interpretation', command, context);
            this.log('info', 'Command interpretation result:', interpretation);

            taskId = uuidv4();
            // Map interpretation to AgentTask fields
            const task: AgentTask = {
                id: taskId,
                type: interpretation.commandName || 'unknown', // Map commandName to type
                payload: interpretation.context || context, // Map context to payload
                status: 'pending',
                command: command,
                commandName: interpretation.commandName || 'unknown',
                context: interpretation.context || context,
                priority: interpretation.priority || 5,
                result: null,
                error: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedAgentId: null,
                // metadata: { source: 'user_command' } // Optional
            };
            this.log('info', `Created task ${task.id} for command "${command}"`);

            // Use this.supabase
            const { error: insertError } = await this.supabase
                .from('agent_tasks')
                .insert({
                    id: task.id,
                    status: task.status,
                    priority: task.priority,
                    // command_context: task.context as any, // Also not in types, potentially use payload or metadata
                    // original_command: task.command, // REMOVED - Missing from generated types
                    // manager_id: this.id, // REMOVED - Missing from generated types
                    created_at: task.createdAt.toISOString(),
                    updated_at: task.updatedAt.toISOString(),
                    // Add columns that *are* in the types definition
                    task_type: task.type, // As per database.types.ts
                    payload: task.payload, // As per database.types.ts
                    // assigned_agent_id is nullable and optional on insert
                    // result is nullable and optional on insert
                    // error_message is nullable and optional on insert
                    // metadata is nullable and optional on insert
                });

            if (insertError) {
                this.log('error', `Failed to insert task ${task.id} into database`, insertError);
                throw new Error(`Database error: ${insertError.message}`);
            }
            this.log('info', `Task ${task.id} persisted to database.`);

            const executionResult = await this.executeTask(task);

            const finalStatus = executionResult.success ? 'completed' : 'failed';
            const { error: updateError } = await this.supabase
                .from('agent_tasks')
                .update({
                    status: finalStatus,
                    result: executionResult.output as any,
                    error: executionResult.error ? { message: executionResult.error } as any : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', task.id);
            
            if (updateError) {
                 this.log('error', `Failed to update task ${task.id} status to ${finalStatus} in database`, updateError);
            } else {
                 this.log('info', `Task ${task.id} final status (${finalStatus}) updated in database.`);
            }

            await this.setStatus('idle');
            return { ...executionResult, taskId: task.id };

        } catch (error: any) {
            this.log('error', 'Error processing natural language command', error);
            await this.setStatus('error');
            if (taskId) {
                 try {
                     await this.supabase
                         .from('agent_tasks')
                         .update({ status: 'failed', error: { message: error.message } as any, updated_at: new Date().toISOString() })
                         .eq('id', taskId);
                 } catch (dbError) {
                     this.log('error', `Failed to update task ${taskId} to failed status after main error`, dbError);
                 }
            }
            return { success: false, error: error.message, taskId };
        }
    }
    
    async executeTask(task: AgentTask): Promise<{ success: boolean; output?: any; error?: string }> {
        this.log('info', `Executing task ${task.id}`);
        try {
            const workerId = this.workerPool.keys().next().value; 
            if (!workerId) {
                throw new Error("No workers available to execute task");
            }
            const worker = this.workerPool.get(workerId);
             if (!worker) {
                throw new Error(`Worker ${workerId} not found in pool`);
            }
            
            const { error: assignError } = await this.supabase
                 .from('agent_tasks')
                 .update({ assigned_agent_id: workerId, status: 'in_progress', updated_at: new Date().toISOString() })
                 .eq('id', task.id);
            
            if (assignError) {
                this.log('error', `Failed to assign task ${task.id} to worker ${workerId}`, assignError);
                throw new Error(`DB error assigning task: ${assignError.message}`);
            }
            this.log('info', `Task ${task.id} assigned to worker ${workerId}.`);

            const result = await worker.execute(task);
            
            this.log('info', `Task ${task.id} completed by worker ${workerId}`);
            if (result.success) {
                return { success: true, output: result.output }; 
            } else {
                this.log('error', `Worker ${workerId} failed task ${task.id}: ${result.error}`);
                return { success: false, error: result.error };
            }

        } catch (error: any) {
            this.log('error', `Failed to execute task ${task.id}`, error);
            return { success: false, error: error.message };
        }
    }
} 