import {
    BasicWorkerAgent
} from '../../agents/BasicWorkerAgent';
import {
    AgentTask,
    AgentError,
    AgentStatus,
    HealthStatus,
    AutonomousAgent // Keep this if needed for base types, maybe AgentError/Status/HealthStatus live here?
} from '../../agents/AutonomousAgent'; // Import base types
import { AgentMemory } from '../../memory/AgentMemory'; // <-- Add correct import
import { AgentTools } from '../../tools/AgentTools';     // <-- Add correct import

// Mock Memory and Tools interfaces for testing BasicWorkerAgent
const mockMemory: AgentMemory = {
    store: jest.fn().mockResolvedValue(undefined),
    retrieve: jest.fn().mockResolvedValue('mock data'),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
};

const mockTools: AgentTools = {
    getTool: jest.fn().mockReturnValue(async () => 'tool result'),
    registerTool: jest.fn(),
    unregisterTool: jest.fn(),
    listTools: jest.fn().mockReturnValue(['mockTool']),
};

describe('BasicWorkerAgent', () => {
    let workerAgent: BasicWorkerAgent;
    const testAgentId = 'worker-test-001';

    beforeEach(() => {
        // Reset mocks before each test
        (mockMemory.store as jest.Mock).mockClear();
        (mockMemory.retrieve as jest.Mock).mockClear();
        (mockMemory.remove as jest.Mock).mockClear();
        (mockMemory.clear as jest.Mock).mockClear();
        (mockTools.getTool as jest.Mock).mockClear();
        (mockTools.registerTool as jest.Mock).mockClear();
        (mockTools.unregisterTool as jest.Mock).mockClear();
        (mockTools.listTools as jest.Mock).mockClear();

        // Create a new agent instance
        workerAgent = new BasicWorkerAgent(testAgentId, mockMemory, mockTools);
        // Ensure agent starts idle for tests relying on execute
        (workerAgent as any).setStatus('idle'); 
    });

    it('should initialize with the correct ID and idle status', () => {
        expect(workerAgent.id).toBe(testAgentId);
        expect(workerAgent.getStatus()).toBe('idle');
    });

    describe('_performTask', () => {
        it('should execute a task, log, store result in memory, and return success message', async () => {
            const task: AgentTask = { id: 'basic-task-1', type: 'simple_work', payload: { value: 123 } };
            const logSpy = jest.spyOn(workerAgent as any, 'log');

            // We need to call the protected _performTask directly for this specific test,
            // or rely on the public execute method wrapper.
            // Let's test via the public execute method.
            const result = await workerAgent.execute(task);

            expect(result.success).toBe(true);
            expect(result.output).toEqual({ message: 'Task completed by BasicWorkerAgent' });
            expect(result.error).toBeUndefined();
            expect(workerAgent.getStatus()).toBe('idle');

            // Verify logging
            expect(logSpy).toHaveBeenCalledWith('info', `Performing task: ${task.type}`, task.payload);
            expect(logSpy).toHaveBeenCalledWith('info', `Task ${task.id} completed successfully.`);
            
            // Verify memory interaction
            expect(mockMemory.store).toHaveBeenCalledTimes(1);
            expect(mockMemory.store).toHaveBeenCalledWith(
                `task_${task.id}_result`,
                expect.objectContaining({ completedAt: expect.any(String) })
            );

            logSpy.mockRestore();
        });
        
        // Note: BasicWorkerAgent's _performTask doesn't currently have failure conditions,
        // so we primarily test the success path and interactions.
    });

    describe('selfDiagnose', () => {
        it('should return a healthy status', async () => {
            const logSpy = jest.spyOn(workerAgent as any, 'log');
            const health = await workerAgent.selfDiagnose();

            expect(health).toEqual({ status: 'healthy' });
            expect(logSpy).toHaveBeenCalledWith('info', 'Performing self-diagnosis...');
            logSpy.mockRestore();
        });
    });

    describe('recover', () => {
        it('should log the error, simulate recovery, and set status back to idle', async () => {
            const error: AgentError = { code: 'TEST_ERROR', message: 'Something went slightly wrong' };
            const logSpy = jest.spyOn(workerAgent as any, 'log');

            // Set status to error first to simulate needing recovery
            (workerAgent as any).setStatus('error');
            expect(workerAgent.getStatus()).toBe('error');

            await workerAgent.recover(error);

            // Verify status transitions
            expect(workerAgent.getStatus()).toBe('idle');

            // Verify logging
            expect(logSpy).toHaveBeenCalledWith('warn', `Attempting recovery from error: ${error.message}`, error);
            expect(logSpy).toHaveBeenCalledWith('info', 'Recovery attempt finished. Setting status to idle.');
            
            // Check the status was set to recovering during the process
            // This requires more intricate spying or inspecting internal state if possible,
            // but checking the final state and logs is often sufficient.
            // We know setStatus was called with 'recovering' because it's logged.
            expect(logSpy).toHaveBeenCalledWith('info', 'Status changed from error to recovering'); 
            expect(logSpy).toHaveBeenCalledWith('info', 'Status changed from recovering to idle'); 

            logSpy.mockRestore();
        });
    });
}); 