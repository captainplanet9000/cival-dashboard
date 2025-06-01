import { AutonomousAgent, AgentTask } from '../agents/AutonomousAgent';
import { ManagerAgent } from '../agents/ManagerAgent';
import { ElizaManagerAgent } from '../agents/ElizaManagerAgent';
import { ElizaWorkerAgent } from '../agents/ElizaWorkerAgent';
import { SpecializedWorkerAgent } from '../agents/workers/SpecializedWorkerAgent';
import { AnalystAgent } from '../agents/workers/AnalystAgent';
import { TraderAgent } from '../agents/workers/TraderAgent';
import { MonitorAgent } from '../agents/workers/MonitorAgent';
import { ResearchAgent } from '../agents/workers/ResearchAgent';
import { AgentFactory, AgentType } from '../agents/AgentFactory';
import { InMemoryAgentMemory } from '../memory/InMemoryAgentMemory';
import { ToolRegistry } from '../tools/AgentTools';
import { WorkflowRegistry } from '../agents/workflow/WorkflowRegistry';
import { WorkflowExecutor } from '../agents/workflow/WorkflowExecutor';
import { WorkflowScheduler } from '../agents/workflow/WorkflowScheduler';
import { MockElizaOSClient } from '../lib/elizaos/MockElizaOSClient';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// A simplified mock of the Supabase client
class MockSupabaseClient {
    private database: Record<string, any[]> = {
        agents: [],
        agent_tasks: [],
        agent_memory: [],
        agent_capabilities: [],
        workflow_templates: [],
        workflow_executions: [],
        scheduled_workflows: []
    };
    
    // Method to simulate Supabase's from().insert() pattern
    from(tableName: string) {
        return {
            insert: (data: any) => {
                if (!this.database[tableName]) {
                    this.database[tableName] = [];
                }
                this.database[tableName].push(data);
                return { error: null };
            },
            update: (data: any) => {
                return { error: null };
            },
            select: (columns: string) => {
                return {
                    eq: (column: string, value: any) => {
                        const results = this.database[tableName]?.filter(item => item[column] === value) || [];
                        return {
                            data: results,
                            error: null
                        };
                    }
                };
            },
            eq: (column: string, value: any) => {
                return { error: null };
            }
        };
    }
}

/**
 * Configuration options for the agent test harness.
 */
export interface AgentTestHarnessConfig {
    useMockSupabase?: boolean;
    enableMockElizaOS?: boolean;
    useInMemoryMemory?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
    registerDefaultTools?: boolean;
    registerDefaultWorkflows?: boolean;
}

/**
 * A test harness for testing agents in isolation.
 */
export class AgentTestHarness {
    private supabase: any;
    private toolRegistry: ToolRegistry;
    private workflowRegistry: WorkflowRegistry;
    private workflowExecutor: WorkflowExecutor;
    private workflowScheduler: WorkflowScheduler;
    private agentFactory: AgentFactory;
    private agents: Map<string, AutonomousAgent> = new Map();
    private tasks: Map<string, AgentTask> = new Map();
    private config: Required<AgentTestHarnessConfig>;
    
    /**
     * Creates a new AgentTestHarness.
     * @param config Configuration options for the test harness
     */
    constructor(config?: AgentTestHarnessConfig) {
        // Set default configuration
        this.config = {
            useMockSupabase: true,
            enableMockElizaOS: true,
            useInMemoryMemory: true,
            logLevel: 'info',
            registerDefaultTools: true,
            registerDefaultWorkflows: true,
            ...config
        };
        
        // Initialize Supabase client (real or mock)
        if (this.config.useMockSupabase) {
            this.supabase = new MockSupabaseClient() as any;
        } else {
            // Create a real Supabase client with env variables
            this.supabase = createClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
            );
        }
        
        // Initialize tool registry
        this.toolRegistry = new ToolRegistry();
        
        // Initialize workflow registry
        this.workflowRegistry = new WorkflowRegistry();
        
        // Create a map of tools for the workflow executor
        const toolMap = new Map();
        this.toolRegistry.listTools().forEach(toolName => {
            const tool = this.toolRegistry.getTool(toolName);
            if (tool) {
                toolMap.set(toolName, tool);
            }
        });
        
        // Initialize workflow executor
        this.workflowExecutor = new WorkflowExecutor(toolMap);
        
        // Initialize workflow scheduler
        this.workflowScheduler = new WorkflowScheduler(this.workflowExecutor, this.workflowRegistry);
        
        // Initialize agent factory
        this.agentFactory = new AgentFactory(this.supabase, this.toolRegistry);
        
        // Set logging level
        this.setLogLevel(this.config.logLevel);
    }
    
    /**
     * Creates an agent of the specified type.
     * @param type The type of agent to create
     * @param id Optional ID for the agent (generates a UUID if not provided)
     * @returns The created agent
     */
    async createAgent(type: AgentType, id?: string): Promise<AutonomousAgent> {
        const agentId = id || `test-agent-${uuidv4()}`;
        
        const agent = await this.agentFactory.createAgent({
            agentId,
            agentType: type,
            memoryType: this.config.useInMemoryMemory ? 'in_memory' : 'supabase',
            elizaConfig: {
                useMock: this.config.enableMockElizaOS
            }
        });
        
        this.agents.set(agentId, agent);
        
        return agent;
    }
    
    /**
     * Creates a manager agent with worker agents.
     * @param managerId Optional ID for the manager agent
     * @param workerTypes Types of worker agents to create
     * @param useElizaManager Whether to use an ElizaManagerAgent (true) or a regular ManagerAgent (false)
     * @returns The created manager agent
     */
    async createManagerWithWorkers(
        managerId?: string,
        workerTypes: AgentType[] = [AgentType.ANALYST, AgentType.TRADER, AgentType.MONITOR],
        useElizaManager: boolean = true
    ): Promise<ManagerAgent | ElizaManagerAgent> {
        // Create manager agent
        const manager = await this.createAgent(
            useElizaManager ? AgentType.ELIZA_MANAGER : AgentType.MANAGER,
            managerId
        ) as ManagerAgent | ElizaManagerAgent;
        
        // Create worker agents
        for (const workerType of workerTypes) {
            const worker = await this.createAgent(workerType);
            
            // Register worker with manager if method exists
            if ('registerWorker' in manager) {
                (manager as any).registerWorker(worker);
            }
        }
        
        return manager;
    }
    
    /**
     * Creates a task for testing agent behavior.
     * @param type The type of task
     * @param payload The payload for the task
     * @param options Additional options for the task
     * @returns The created task
     */
    createTask(type: string, payload: any, options?: Partial<AgentTask>): AgentTask {
        const taskId = options?.id || `test-task-${uuidv4()}`;
        
        const task: AgentTask = {
            id: taskId,
            type,
            payload,
            status: options?.status || 'pending',
            createdAt: options?.createdAt || new Date(),
            updatedAt: options?.updatedAt || new Date(),
            command: options?.command,
            commandName: options?.commandName || type,
            context: options?.context || payload,
            result: options?.result || null,
            error: options?.error || null,
            assignedAgentId: options?.assignedAgentId || null,
            priority: options?.priority || 5,
            requiredCapabilities: options?.requiredCapabilities || [],
            metadata: options?.metadata || { source: 'test_harness' }
        };
        
        this.tasks.set(taskId, task);
        
        return task;
    }
    
    /**
     * Executes a task on an agent.
     * @param agentId The ID of the agent to execute the task
     * @param taskId The ID of the task to execute
     * @returns The execution result
     */
    async executeTask(agentId: string, taskId: string): Promise<any> {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found`);
        }
        
        const result = await agent.execute(task);
        
        // Update task with result
        if (result.success) {
            task.status = 'completed';
            task.result = result.output;
        } else {
            task.status = 'failed';
            task.error = result.error;
        }
        
        task.updatedAt = new Date();
        
        return result;
    }
    
    /**
     * Gets an agent by ID.
     * @param id The ID of the agent
     * @returns The agent, or undefined if not found
     */
    getAgent(id: string): AutonomousAgent | undefined {
        return this.agents.get(id);
    }
    
    /**
     * Gets a task by ID.
     * @param id The ID of the task
     * @returns The task, or undefined if not found
     */
    getTask(id: string): AgentTask | undefined {
        return this.tasks.get(id);
    }
    
    /**
     * Gets all agents.
     * @returns All agents
     */
    getAllAgents(): AutonomousAgent[] {
        return Array.from(this.agents.values());
    }
    
    /**
     * Gets all tasks.
     * @returns All tasks
     */
    getAllTasks(): AgentTask[] {
        return Array.from(this.tasks.values());
    }
    
    /**
     * Removes an agent.
     * @param id The ID of the agent to remove
     */
    removeAgent(id: string): void {
        this.agents.delete(id);
    }
    
    /**
     * Removes a task.
     * @param id The ID of the task to remove
     */
    removeTask(id: string): void {
        this.tasks.delete(id);
    }
    
    /**
     * Clears all agents and tasks.
     */
    clear(): void {
        this.agents.clear();
        this.tasks.clear();
    }
    
    /**
     * Gets the tool registry.
     * @returns The tool registry
     */
    getToolRegistry(): ToolRegistry {
        return this.toolRegistry;
    }
    
    /**
     * Gets the workflow registry.
     * @returns The workflow registry
     */
    getWorkflowRegistry(): WorkflowRegistry {
        return this.workflowRegistry;
    }
    
    /**
     * Gets the workflow executor.
     * @returns The workflow executor
     */
    getWorkflowExecutor(): WorkflowExecutor {
        return this.workflowExecutor;
    }
    
    /**
     * Gets the workflow scheduler.
     * @returns The workflow scheduler
     */
    getWorkflowScheduler(): WorkflowScheduler {
        return this.workflowScheduler;
    }
    
    /**
     * Sets the logging level.
     * @param level The logging level
     */
    private setLogLevel(level: 'debug' | 'info' | 'warn' | 'error' | 'none'): void {
        // Simplified implementation - in a real application, use a proper logging library
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            none: 4
        };
        
        const threshold = levels[level];
        
        // Override console methods based on threshold
        const originalConsole = {
            debug: console.debug,
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error
        };
        
        if (threshold > levels.debug) {
            console.debug = () => {};
        }
        
        if (threshold > levels.info) {
            console.log = () => {};
            console.info = () => {};
        }
        
        if (threshold > levels.warn) {
            console.warn = () => {};
        }
        
        if (threshold > levels.error) {
            console.error = () => {};
        }
        
        // Method to restore original console behavior
        (this as any).restoreConsole = () => {
            console.debug = originalConsole.debug;
            console.log = originalConsole.log;
            console.info = originalConsole.info;
            console.warn = originalConsole.warn;
            console.error = originalConsole.error;
        };
    }
    
    /**
     * Restores the original console behavior after changing the log level.
     */
    restoreConsole(): void {
        // Implementation added dynamically in setLogLevel
        // This is just a placeholder to define the method signature
    }
    
    /**
     * Disposes of the test harness and cleans up resources.
     */
    dispose(): void {
        this.clear();
        this.restoreConsole();
        this.workflowScheduler.stop();
    }
} 