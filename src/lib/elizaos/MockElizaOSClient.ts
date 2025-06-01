import { AgentTask, HealthStatus as BaseHealthStatus } from '@/agents/AutonomousAgent';
import { ElizaOSClient } from '@/agents/ElizaManagerAgent'; // Import from where it's defined
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock implementation of ElizaOSClient for development and testing.
 */
export class MockElizaOSClient implements ElizaOSClient {
    private mockAgents: Map<string, { spec: any }> = new Map();

    log(level: 'info' | 'warn' | 'error', message: string, ...args: any[]) {
        console[level](`[MockElizaOSClient] ${message}`, ...args);
    }

    async analyzeTaskRequirements(task: AgentTask): Promise<{ suitableWorkerType: string; priority: number }> {
        this.log('info', `Mock analyzing task requirements for task ${task.id}`);
        // Simple mock logic: return a generic worker type and task priority
        return {
            suitableWorkerType: 'generic-worker',
            priority: task.priority || 5,
        };
    }

    async getWorkerRecommendations(criteria: any): Promise<string[]> {
        this.log('info', `Mock getting worker recommendations for criteria:`, criteria);
        // Simple mock logic: return a predefined list or an empty list
        // In a real scenario, this would involve more complex matching.
        // For now, let's assume we have some potential workers
        const potentialWorkers = ['worker-001', 'worker-002', 'worker-003'];
        // Simulate filtering based on criteria (e.g., task type) - very basic
        if (criteria?.taskType === 'data-analysis') {
            return ['worker-001'];
        }
        return potentialWorkers; // Return some default recommendations
    }

    async reportAgentStatus(agentId: string, status: BaseHealthStatus): Promise<void> {
        this.log('info', `Mock reporting status for agent ${agentId}:`, status);
        // No operation in mock, just log
        return Promise.resolve();
    }

    async interpretNaturalLanguageCommand(command: string): Promise<AgentTask> {
        this.log('info', `Mock interpreting natural language command: "${command}"`);
        // Simple mock interpretation
        const taskId = uuidv4();
        return {
            id: taskId,
            type: 'interpreted_command',
            payload: { originalCommand: command, interpretation: 'mock_action' },
            status: 'pending',
            command: command, // Store original command
            commandName: 'mock_action', // Example command name
            context: { originalCommand: command }, // Example context
            priority: 5,
            result: null,
            error: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedAgentId: null,
            // metadata: { source: 'mock_nl_interpretation' }
        };
    }

    async query(topic: string, prompt: string, context?: any): Promise<any> {
        this.log('info', `Mock performing query on topic "${topic}" with prompt: "${prompt}"`, context);
        // Mock response based on topic
        if (topic === 'command_interpretation') {
            // Simulate interpreting the prompt (which is the command here)
            return {
                commandName: 'mock_interpreted_action',
                context: { queryContext: context, originalCommand: prompt },
                priority: 5,
                // Add other fields expected by processNaturalLanguageCommand
            };
        }
        return { mockData: `Query result for ${topic}: ${prompt}` };
    }

    async strategicQuery(topic: string, prompt: string, context?: any): Promise<any> {
        this.log('info', `Mock performing STRATEGIC query on topic "${topic}" with prompt: "${prompt}"`, context);
        // Mock response for strategic queries
         return { mockStrategicData: `Strategic result for ${topic}: ${prompt}`, confidence: 0.8 };
    }

    async createAgent(spec: any): Promise<{ id: string }> {
        const newId = `mock-agent-${uuidv4().substring(0, 8)}`;
        this.log('info', `Mock creating agent with spec:`, spec);
        this.mockAgents.set(newId, { spec });
        return { id: newId };
    }

    async destroyAgent(agentId: string): Promise<void> {
        this.log('info', `Mock destroying agent ${agentId}`);
        if (this.mockAgents.has(agentId)) {
            this.mockAgents.delete(agentId);
            return Promise.resolve();
        } else {
            throw new Error(`Mock Agent ${agentId} not found for destruction.`);
        }
    }
} 