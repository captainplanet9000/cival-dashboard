import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { AutonomousAgent } from './AutonomousAgent';
import { ManagerAgent } from './ManagerAgent';
import { ElizaManagerAgent } from './ElizaManagerAgent';
import { ElizaWorkerAgent } from './ElizaWorkerAgent';
import { SpecializedWorkerAgent, AgentCapability } from './workers/SpecializedWorkerAgent';
import { AnalystAgent } from './workers/AnalystAgent';
import { TraderAgent } from './workers/TraderAgent';
import { MonitorAgent } from './workers/MonitorAgent';
import { ResearchAgent } from './workers/ResearchAgent';
import { AgentMemory } from '../memory/AgentMemory';
import { InMemoryAgentMemory } from '../memory/InMemoryAgentMemory';
import { SupabaseAgentMemory } from '../memory/SupabaseAgentMemory';
import { AgentTools } from '../tools/AgentTools';
import { ToolRegistry } from '../tools/AgentTools';
import { ElizaOSClient } from './ElizaManagerAgent';
import { RealElizaOSClient } from '../lib/elizaos/RealElizaOSClient';
import { MockElizaOSClient } from '../lib/elizaos/MockElizaOSClient';
import { WorkflowRegistry } from './workflow/WorkflowRegistry';
import { WorkflowExecutor } from './workflow/WorkflowExecutor';
import { AgentTool } from '@/types/agentTypes';

/**
 * Agent configuration interface for creating agents.
 */
export interface AgentConfig {
    agentId: string;
    agentType: AgentType;
    memoryType?: MemoryType;
    memoryOptions?: Record<string, any>;
    elizaConfig?: ElizaConfig;
    additionalCapabilities?: AgentCapability[];
}

/**
 * Enum of agent types.
 */
export enum AgentType {
    BASIC_WORKER = 'basic_worker',
    ELIZA_WORKER = 'eliza_worker',
    MANAGER = 'manager',
    ELIZA_MANAGER = 'eliza_manager',
    ANALYST = 'analyst',
    TRADER = 'trader',
    MONITOR = 'monitor',
    RESEARCHER = 'researcher'
}

/**
 * Enum of memory types.
 */
export enum MemoryType {
    IN_MEMORY = 'in_memory',
    SUPABASE = 'supabase'
}

/**
 * Interface for ElizaOS configuration.
 */
export interface ElizaConfig {
    apiUrl?: string;
    apiKey?: string;
    useMock?: boolean;
}

/**
 * Factory class for creating different types of agents.
 */
export class AgentFactory {
    private supabase: SupabaseClient<Database>;
    private toolRegistry: ToolRegistry;
    private workflowRegistry: WorkflowRegistry;
    private workflowExecutor: WorkflowExecutor;

    /**
     * Creates a new AgentFactory instance.
     * @param supabase The Supabase client
     * @param toolRegistry Optional tool registry (creates a new one if not provided)
     */
    constructor(
        supabase: SupabaseClient<Database>, 
        toolRegistry?: ToolRegistry
    ) {
        this.supabase = supabase;
        this.toolRegistry = toolRegistry || new ToolRegistry();
        this.workflowRegistry = new WorkflowRegistry();
        
        // Create a map of tools for the workflow executor
        const toolMap = new Map<string, AgentTool>();
        // Convert the toolRegistry to a Map for the WorkflowExecutor
        this.toolRegistry.listTools().forEach(toolName => {
            const tool = this.toolRegistry.getTool(toolName);
            if (tool) {
                toolMap.set(toolName, tool);
            }
        });
        
        this.workflowExecutor = new WorkflowExecutor(toolMap);
    }
    
    /**
     * Creates an agent based on the provided configuration.
     * @param config The agent configuration
     * @returns The created agent
     */
    public async createAgent(config: AgentConfig): Promise<AutonomousAgent> {
        // Create memory system
        const memory = this.createMemory(config.agentId, config.memoryType || MemoryType.SUPABASE, config.memoryOptions);
        
        // Create agent based on type
        switch (config.agentType) {
            case AgentType.BASIC_WORKER:
                return this.createBasicWorker(config.agentId, memory);
                
            case AgentType.ELIZA_WORKER:
                return this.createElizaWorker(config.agentId, memory);
                
            case AgentType.MANAGER:
                return this.createManager(config.agentId, memory);
                
            case AgentType.ELIZA_MANAGER:
                return this.createElizaManager(config.agentId, memory, config.elizaConfig);
                
            case AgentType.ANALYST:
                return this.createAnalyst(config.agentId, memory, config.additionalCapabilities);
                
            case AgentType.TRADER:
                return this.createTrader(config.agentId, memory, config.additionalCapabilities);
                
            case AgentType.MONITOR:
                return this.createMonitor(config.agentId, memory, config.additionalCapabilities);
                
            case AgentType.RESEARCHER:
                return this.createResearcher(config.agentId, memory, config.additionalCapabilities);
                
            default:
                throw new Error(`Unsupported agent type: ${config.agentType}`);
        }
    }

    /**
     * Creates a memory system of the specified type.
     * @param agentId The agent ID
     * @param memoryType The type of memory to create
     * @param options Additional options for memory creation
     * @returns The created memory system
     */
    private createMemory(agentId: string, memoryType: MemoryType, options?: Record<string, any>): AgentMemory {
        switch (memoryType) {
            case MemoryType.IN_MEMORY:
                return new InMemoryAgentMemory();
                
            case MemoryType.SUPABASE:
                return new SupabaseAgentMemory(agentId, this.supabase);
                
            default:
                throw new Error(`Unsupported memory type: ${memoryType}`);
        }
    }

    /**
     * Creates a basic worker agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @returns A basic worker agent
     */
    private createBasicWorker(agentId: string, memory: AgentMemory): AutonomousAgent {
        return new ElizaWorkerAgent(agentId, memory, this.toolRegistry, this.supabase);
    }

    /**
     * Creates an ElizaOS worker agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @returns An ElizaOS worker agent
     */
    private createElizaWorker(agentId: string, memory: AgentMemory): AutonomousAgent {
        return new ElizaWorkerAgent(agentId, memory, this.toolRegistry, this.supabase);
    }

    /**
     * Creates a manager agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @returns A manager agent
     */
    private createManager(agentId: string, memory: AgentMemory): AutonomousAgent {
        return new ManagerAgent(agentId, memory, this.toolRegistry, this.supabase);
    }

    /**
     * Creates an ElizaOS manager agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @param elizaConfig The ElizaOS configuration
     * @returns An ElizaOS manager agent
     */
    private createElizaManager(agentId: string, memory: AgentMemory, elizaConfig?: ElizaConfig): AutonomousAgent {
        const config = elizaConfig || {};
        let elizaClient: ElizaOSClient;
        
        if (config.useMock) {
            elizaClient = new MockElizaOSClient();
        } else {
            elizaClient = new RealElizaOSClient({
                apiUrl: config.apiUrl || 'https://api.elizaos.ai',
                apiKey: config.apiKey || 'default-key'
            });
        }
        
        return new ElizaManagerAgent(agentId, memory, this.toolRegistry, elizaClient, this.supabase);
    }

    /**
     * Creates an analyst agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @param additionalCapabilities Additional capabilities to add
     * @returns An analyst agent
     */
    private createAnalyst(agentId: string, memory: AgentMemory, additionalCapabilities?: AgentCapability[]): AutonomousAgent {
        return new AnalystAgent(agentId, memory, this.toolRegistry, this.supabase, additionalCapabilities);
    }

    /**
     * Creates a trader agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @param additionalCapabilities Additional capabilities to add
     * @returns A trader agent
     */
    private createTrader(agentId: string, memory: AgentMemory, additionalCapabilities?: AgentCapability[]): AutonomousAgent {
        return new TraderAgent(agentId, memory, this.toolRegistry, this.supabase, additionalCapabilities);
    }

    /**
     * Creates a monitor agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @param additionalCapabilities Additional capabilities to add
     * @returns A monitor agent
     */
    private createMonitor(agentId: string, memory: AgentMemory, additionalCapabilities?: AgentCapability[]): AutonomousAgent {
        return new MonitorAgent(agentId, memory, this.toolRegistry, this.supabase, additionalCapabilities);
    }

    /**
     * Creates a researcher agent.
     * @param agentId The agent ID
     * @param memory The memory system
     * @param additionalCapabilities Additional capabilities to add
     * @returns A researcher agent
     */
    private createResearcher(agentId: string, memory: AgentMemory, additionalCapabilities?: AgentCapability[]): AutonomousAgent {
        return new ResearchAgent(
            agentId, 
            memory, 
            this.toolRegistry, 
            this.supabase, 
            this.workflowRegistry,
            this.workflowExecutor,
            additionalCapabilities
        );
    }

    /**
     * Factory method to create a worker farm with a manager and multiple workers.
     * @param farmConfig Configuration for the farm
     * @returns The created manager agent and worker agents
     */
    public async createWorkerFarm(farmConfig: {
        managerId: string;
        managerType: AgentType.MANAGER | AgentType.ELIZA_MANAGER;
        memoryType?: MemoryType;
        elizaConfig?: ElizaConfig;
        workers: Array<{
            count: number;
            type: AgentType;
            additionalCapabilities?: AgentCapability[];
        }>;
    }): Promise<{
        manager: ManagerAgent | ElizaManagerAgent;
        workers: AutonomousAgent[];
    }> {
        // Create the manager
        const managerConfig: AgentConfig = {
            agentId: farmConfig.managerId,
            agentType: farmConfig.managerType,
            memoryType: farmConfig.memoryType,
            elizaConfig: farmConfig.elizaConfig
        };
        
        const manager = await this.createAgent(managerConfig) as ManagerAgent | ElizaManagerAgent;
        
        // Create workers
        const workers: AutonomousAgent[] = [];
        
        for (const workerSpec of farmConfig.workers) {
            for (let i = 0; i < workerSpec.count; i++) {
                const workerId = `${workerSpec.type.toLowerCase()}_worker_${i + 1}`;
                
                const workerConfig: AgentConfig = {
                    agentId: workerId,
                    agentType: workerSpec.type,
                    memoryType: farmConfig.memoryType,
                    additionalCapabilities: workerSpec.additionalCapabilities
                };
                
                const worker = await this.createAgent(workerConfig);
                workers.push(worker);
                
                // Register worker with manager
                if (manager instanceof ManagerAgent) {
                    manager.registerWorker(worker);
                }
            }
        }
        
        return { manager, workers };
    }
} 