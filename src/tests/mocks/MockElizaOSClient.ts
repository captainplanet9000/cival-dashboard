import { 
    ElizaOSClient 
} from '../../agents/ElizaManagerAgent'; // Adjust path as needed
import {
    AgentTask,
    BaseHealthStatus
} from '../../agents/AutonomousAgent'; // Adjust path as needed

/**
 * Mock implementation of the ElizaOSClient for testing purposes.
 * Uses jest.fn() for spy capabilities.
 */
export class MockElizaOSClient implements ElizaOSClient {
    
    analyzeTaskRequirements = jest.fn().mockImplementation(async (task: AgentTask): Promise<{ suitableWorkerType: string, priority: number }> => {
        console.log(`[MockElizaOSClient] analyzeTaskRequirements called for task ${task.id}`);
        // Simulate analysis based on task type
        let workerType = 'generic';
        if (task.type.includes('data')) {
            workerType = 'data_processing';
        }
        return { suitableWorkerType: workerType, priority: task.payload?.priority || 5 };
    });

    getWorkerRecommendations = jest.fn().mockImplementation(async (criteria: any): Promise<string[]> => {
        console.log(`[MockElizaOSClient] getWorkerRecommendations called with criteria:`, criteria);
        // Return a predefined list or generate mock IDs
        return [
            `worker-rec-${Math.random().toString(36).substring(2, 7)}`,
            `worker-rec-${Math.random().toString(36).substring(2, 7)}`
        ];
    });

    reportAgentStatus = jest.fn().mockImplementation(async (agentId: string, status: BaseHealthStatus): Promise<void> => {
        console.log(`[MockElizaOSClient] reportAgentStatus called for agent ${agentId}:`, status);
        // No return value needed
        return Promise.resolve();
    });

    interpretNaturalLanguageCommand = jest.fn().mockImplementation(async (command: string): Promise<AgentTask> => {
        console.log(`[MockElizaOSClient] interpretNaturalLanguageCommand called with command: "${command}"`);
        // Simulate basic interpretation
        let taskType = 'unknown';
        if (command.toLowerCase().includes('process data')) {
            taskType = 'data_processing_command';
        }
        return {
            id: `task-from-cmd-${Math.random().toString(36).substring(2, 9)}`,
            type: taskType,
            payload: { originalCommand: command }
        };
    });

    query = jest.fn().mockImplementation(async (topic: string, prompt: string, context?: any): Promise<any> => {
        console.log(`[MockElizaOSClient] query called (${topic}): "${prompt}"`, context);
        return { mockedQueryResult: `Data for ${topic}` };
    });

    createAgent = jest.fn().mockImplementation(async (spec: any): Promise<{ id: string; }> => {
        console.log(`[MockElizaOSClient] createAgent called with spec:`, spec);
        const newId = `eliza-created-${spec.type || 'agent'}-${Math.random().toString(36).substring(2, 9)}`;
        return { id: newId };
    });

    destroyAgent = jest.fn().mockImplementation(async (agentId: string): Promise<void> => {
        console.log(`[MockElizaOSClient] destroyAgent called for agent ${agentId}`);
        return Promise.resolve();
    });

    strategicQuery = jest.fn().mockImplementation(async (topic: string, prompt: string, context?: any): Promise<any> => {
        console.log(`[MockElizaOSClient] strategicQuery called (${topic}): "${prompt}"`, context);
        return { mockedDecision: `Strategic decision for ${topic}` };
    });
} 