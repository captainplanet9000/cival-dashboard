import { ElizaWorkerAgent } from '../ElizaWorkerAgent';
import { AgentMemory } from '../../memory/AgentMemory';
import { AgentTools } from '../../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { AgentTask, HealthStatus } from '../AutonomousAgent';

/**
 * Represents the capabilities of a specialized worker agent.
 */
export interface AgentCapability {
    id: string;
    name: string;
    description: string;
    confidence: number; // 0-1 value indicating confidence in this capability
    parameters?: Record<string, any>; // Optional configuration for this capability
}

/**
 * Base class for specialized worker agents that extends ElizaWorkerAgent with capability management.
 * Specialized agents should inherit from this class and register their specific capabilities.
 */
export abstract class SpecializedWorkerAgent extends ElizaWorkerAgent {
    private capabilities: Map<string, AgentCapability> = new Map();

    constructor(
        id: string,
        memory: AgentMemory,
        tools: AgentTools,
        supabaseClient: SupabaseClient<Database>,
        initialCapabilities: AgentCapability[] = []
    ) {
        super(id, memory, tools, supabaseClient);
        this.log('info', `SpecializedWorkerAgent ${id} initializing...`);
        
        // Register initial capabilities
        initialCapabilities.forEach(capability => {
            this.registerCapability(capability);
        });
    }

    /**
     * Registers a capability with this agent.
     * @param capability The capability to register
     */
    protected registerCapability(capability: AgentCapability): void {
        this.capabilities.set(capability.id, capability);
        this.log('info', `Registered capability: ${capability.name} (${capability.id})`);
        
        // Store capabilities in memory for persistence
        this.persistCapabilities();
    }

    /**
     * Updates an existing capability's configuration.
     * @param capabilityId The ID of the capability to update
     * @param updates Partial updates to apply to the capability
     * @returns True if successful, false if capability not found
     */
    protected updateCapability(capabilityId: string, updates: Partial<AgentCapability>): boolean {
        const capability = this.capabilities.get(capabilityId);
        if (!capability) {
            this.log('warn', `Cannot update: Capability ${capabilityId} not found`);
            return false;
        }
        
        // Apply updates
        Object.assign(capability, updates);
        this.log('info', `Updated capability: ${capability.name} (${capability.id})`);
        
        // Store updated capabilities
        this.persistCapabilities();
        return true;
    }

    /**
     * Removes a capability from this agent.
     * @param capabilityId The ID of the capability to remove
     * @returns True if successful, false if capability not found
     */
    protected removeCapability(capabilityId: string): boolean {
        const removed = this.capabilities.delete(capabilityId);
        if (removed) {
            this.log('info', `Removed capability: ${capabilityId}`);
            this.persistCapabilities();
        } else {
            this.log('warn', `Cannot remove: Capability ${capabilityId} not found`);
        }
        return removed;
    }

    /**
     * Checks if the agent has a specific capability.
     * @param capabilityId The capability ID to check for
     * @returns True if the agent has the capability
     */
    public hasCapability(capabilityId: string): boolean {
        return this.capabilities.has(capabilityId);
    }

    /**
     * Gets a list of all capability IDs supported by this agent.
     * @returns Array of capability IDs
     */
    public getCapabilityIds(): string[] {
        return Array.from(this.capabilities.keys());
    }

    /**
     * Gets all capabilities supported by this agent.
     * @returns Array of capabilities
     */
    public getCapabilities(): AgentCapability[] {
        return Array.from(this.capabilities.values());
    }

    /**
     * Gets details about a specific capability.
     * @param capabilityId The capability ID to get
     * @returns The capability details or undefined if not found
     */
    public getCapabilityDetails(capabilityId: string): AgentCapability | undefined {
        return this.capabilities.get(capabilityId);
    }

    /**
     * Checks if this agent can handle a specific task based on required capabilities.
     * @param task The task to check
     * @returns True if the agent can handle the task
     */
    public canHandleTask(task: AgentTask): boolean {
        // If no capabilities are required, assume we can handle it
        if (!task.requiredCapabilities || task.requiredCapabilities.length === 0) {
            return true;
        }
        
        // Check if we have all required capabilities
        return task.requiredCapabilities.every(capabilityId => this.hasCapability(capabilityId));
    }

    /**
     * Persists the agent's capabilities to memory for recovery/initialization.
     * @private
     */
    private async persistCapabilities(): Promise<void> {
        try {
            await this.memory.store('capabilities', Array.from(this.capabilities.values()));
        } catch (error: any) {
            this.log('error', `Failed to persist capabilities: ${error.message}`);
        }
    }

    /**
     * Loads capabilities from memory during initialization or recovery.
     * @protected
     */
    protected async loadCapabilities(): Promise<void> {
        try {
            const storedCapabilities = await this.memory.retrieve('capabilities');
            if (Array.isArray(storedCapabilities)) {
                this.capabilities.clear();
                storedCapabilities.forEach((capability: AgentCapability) => {
                    this.capabilities.set(capability.id, capability);
                });
                this.log('info', `Loaded ${storedCapabilities.length} capabilities from memory`);
            }
        } catch (error: any) {
            this.log('warn', `Failed to load capabilities from memory: ${error.message}`);
        }
    }

    /**
     * Enhanced self-diagnosis that includes capability verification.
     * @override
     */
    public async selfDiagnose(): Promise<HealthStatus> {
        const baseStatus = await super.selfDiagnose();
        
        // Enhance with capability information
        const capabilityCount = this.capabilities.size;
        const capabilityDetails = `${capabilityCount} capabilities registered`;
        
        return {
            status: baseStatus.status,
            details: baseStatus.details ? `${baseStatus.details}, ${capabilityDetails}` : capabilityDetails
        };
    }
} 