import {
    ElizaManagerAgent,
    // ManagerAgent, // Keep ManagerAgent import below if needed for spyOn
} from '../../agents/ElizaManagerAgent'; // This was likely wrong before, should import ElizaManagerAgent
import { 
    ManagerAgent, // <-- Add ManagerAgent here
    ManagerHealthStatus 
} from '../../agents/ManagerAgent'; // Import ManagerAgent from its own file
import {
    BasicWorkerAgent // <-- Ensure this is imported
} from '../../agents/BasicWorkerAgent';
import {
    AgentTask,
    AgentError,
    AgentStatus,
    HealthStatus as BaseHealthStatus,
    AutonomousAgent
} from '../../agents/AutonomousAgent';
import { AgentMemory } from '../../memory/AgentMemory';
import { AgentTools } from '../../tools/AgentTools';
import { MockElizaOSClient } from '../mocks/MockElizaOSClient'; // Import the mock
import { SupabaseClient } from '@supabase/supabase-js'; 
import { Database } from '@/types/database.types';

// --- Mocks for Manager/Workers (similar to ManagerAgent tests) ---
const mockManagerMemory: AgentMemory = {
    store: jest.fn().mockResolvedValue(undefined),
    retrieve: jest.fn().mockResolvedValue('manager data'),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
};
const mockManagerTools: AgentTools = {
    getTool: jest.fn().mockReturnValue(async () => 'manager tool result'),
    registerTool: jest.fn(),
    unregisterTool: jest.fn(),
    listTools: jest.fn().mockReturnValue(['managerTool']),
};
const mockWorkerMemory: AgentMemory = {
    store: jest.fn().mockResolvedValue(undefined),
    retrieve: jest.fn().mockResolvedValue('worker data'),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
};
const mockWorkerTools: AgentTools = {
    getTool: jest.fn().mockReturnValue(async () => 'worker tool result'),
    registerTool: jest.fn(),
    unregisterTool: jest.fn(),
    listTools: jest.fn().mockReturnValue(['workerTool']),
};
// --- End Mocks ---

// Mock Supabase Client
const mockSupabaseClient = {
    from: jest.fn(() => ({
        select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })) })),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
        upsert: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
        delete: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
    }))
} as unknown as SupabaseClient<Database>; 

describe('ElizaManagerAgent', () => {
    let elizaManager: ElizaManagerAgent;
    let worker1: BasicWorkerAgent;
    let worker2: BasicWorkerAgent;
    let mockElizaClient: MockElizaOSClient;
    const managerId = 'eliza-mgr-test-001';
    const workerId1 = 'eliza-worker-w1';
    const workerId2 = 'eliza-worker-w2';

    beforeEach(() => {
        // Reset mocks
        Object.values(mockManagerMemory).forEach(mockFn => (mockFn as jest.Mock).mockClear());
        Object.values(mockManagerTools).forEach(mockFn => (mockFn as jest.Mock).mockClear());
        Object.values(mockWorkerMemory).forEach(mockFn => (mockFn as jest.Mock).mockClear());
        Object.values(mockWorkerTools).forEach(mockFn => (mockFn as jest.Mock).mockClear());
        (mockSupabaseClient.from as jest.Mock).mockClear(); 
        
        mockElizaClient = new MockElizaOSClient(); // Create fresh mock client
        
        // Create instances
        elizaManager = new ElizaManagerAgent(
            managerId, 
            mockManagerMemory, 
            mockManagerTools, 
            mockElizaClient, 
            mockSupabaseClient // Add client
        );
        worker1 = new BasicWorkerAgent(
            workerId1, 
            mockWorkerMemory, 
            mockWorkerTools, 
            mockSupabaseClient // Add client
        );
        worker2 = new BasicWorkerAgent(
            workerId2, 
            mockWorkerMemory, 
            mockWorkerTools, 
            mockSupabaseClient // Add client
        );

        // Ensure agents start idle and add workers
        (elizaManager as any).setStatus('idle');
        (worker1 as any).setStatus('idle');
        (worker2 as any).setStatus('idle');
        elizaManager.addWorker(worker1);
        elizaManager.addWorker(worker2);
    });

    it('should initialize correctly with ElizaOSClient', () => {
        expect(elizaManager.id).toBe(managerId);
        expect(elizaManager.getStatus()).toBe('idle');
        expect((elizaManager as any).elizaClient).toBe(mockElizaClient);
    });

    describe('_performTask (Eliza Delegation)', () => {
        it('should get recommendations from Eliza and delegate to the first available recommended worker', async () => {
            const task: AgentTask = { id: 'eliza-task-1', type: 'eliza_delegate', payload: { data: 'info' } };
            // Mock Eliza recommendation - recommends worker2 first, then worker1
            mockElizaClient.getWorkerRecommendations.mockResolvedValue([workerId2, workerId1]);
            
            const worker1ExecuteSpy = jest.spyOn(worker1, 'execute');
            const worker2ExecuteSpy = jest.spyOn(worker2, 'execute');

            const result = await elizaManager.execute(task);

            expect(result.success).toBe(true);
            expect(result.output).toEqual({ message: 'Task completed by BasicWorkerAgent' });
            expect(mockElizaClient.getWorkerRecommendations).toHaveBeenCalledWith({ taskType: task.type, payload: task.payload });
            expect(worker1ExecuteSpy).not.toHaveBeenCalled();
            expect(worker2ExecuteSpy).toHaveBeenCalledWith(task); // worker2 was recommended first and was idle
            expect(elizaManager.getStatus()).toBe('idle');

            worker1ExecuteSpy.mockRestore();
            worker2ExecuteSpy.mockRestore();
        });

        it('should delegate to the second recommended worker if the first is busy', async () => {
             const task: AgentTask = { id: 'eliza-task-2', type: 'eliza_delegate', payload: {} };
             // Mock Eliza recommendation - recommends worker1 first, then worker2
             mockElizaClient.getWorkerRecommendations.mockResolvedValue([workerId1, workerId2]);
             (worker1 as any).setStatus('busy'); // Make worker1 busy
             
             const worker1ExecuteSpy = jest.spyOn(worker1, 'execute');
             const worker2ExecuteSpy = jest.spyOn(worker2, 'execute');

             const result = await elizaManager.execute(task);

             expect(result.success).toBe(true);
             expect(result.output).toEqual({ message: 'Task completed by BasicWorkerAgent' });
             expect(mockElizaClient.getWorkerRecommendations).toHaveBeenCalled();
             expect(worker1ExecuteSpy).not.toHaveBeenCalled(); // worker1 was busy
             expect(worker2ExecuteSpy).toHaveBeenCalledWith(task); // worker2 was recommended second and idle
             expect(elizaManager.getStatus()).toBe('idle');

             worker1ExecuteSpy.mockRestore();
             worker2ExecuteSpy.mockRestore();
        });

        it('should fall back to any idle worker if no recommended workers are available', async () => {
            const task: AgentTask = { id: 'eliza-task-3', type: 'fallback', payload: {} };
            // Mock Eliza recommendation - recommends a non-existent or busy worker
            mockElizaClient.getWorkerRecommendations.mockResolvedValue(['busy-worker-id']);
            // Keep worker1 and worker2 idle for fallback
             (worker1 as any).setStatus('idle'); 
             (worker2 as any).setStatus('idle'); 
            
            const worker1ExecuteSpy = jest.spyOn(worker1, 'execute');
            const worker2ExecuteSpy = jest.spyOn(worker2, 'execute');
            const logSpy = jest.spyOn(elizaManager as any, 'log');

            const result = await elizaManager.execute(task);

            expect(result.success).toBe(true);
            expect(mockElizaClient.getWorkerRecommendations).toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalledWith('warn', 'No recommended ElizaOS worker available. Falling back to any idle worker.');
            // Should delegate to the first one found in the map iteration (worker1)
            expect(worker1ExecuteSpy).toHaveBeenCalledWith(task); 
            expect(worker2ExecuteSpy).not.toHaveBeenCalled();
            expect(elizaManager.getStatus()).toBe('idle');

            worker1ExecuteSpy.mockRestore();
            worker2ExecuteSpy.mockRestore();
            logSpy.mockRestore();
        });

        it('should throw error if no recommended or fallback workers are available', async () => {
            const task: AgentTask = { id: 'eliza-task-4', type: 'no_workers', payload: {} };
            mockElizaClient.getWorkerRecommendations.mockResolvedValue(['busy-worker-id']);
            (worker1 as any).setStatus('busy'); 
            (worker2 as any).setStatus('busy'); // Both workers busy
            
            await expect(elizaManager.execute(task)).rejects.toThrow(
                `ElizaManager ${managerId}: No suitable or available worker found for task ${task.id}.`
            );
            expect(elizaManager.getStatus()).toBe('error');
        });
    });

    describe('selfDiagnose (Eliza Reporting)', () => {
        it('should perform base diagnosis and report manager status to ElizaOS', async () => {
            // worker1 and worker2 are healthy by default
            const health = await elizaManager.selfDiagnose();

            expect(health.status).toBe('healthy');
            expect(mockElizaClient.reportAgentStatus).toHaveBeenCalledTimes(1 + 2); // Manager + 2 workers
            // Check manager status report
            expect(mockElizaClient.reportAgentStatus).toHaveBeenCalledWith(
                managerId,
                expect.objectContaining({ status: 'healthy' })
            );
            // Check worker status reports
             expect(mockElizaClient.reportAgentStatus).toHaveBeenCalledWith(
                 workerId1,
                 expect.objectContaining({ status: 'healthy' })
             );
             expect(mockElizaClient.reportAgentStatus).toHaveBeenCalledWith(
                 workerId2,
                 expect.objectContaining({ status: 'healthy' })
             );
        });

        it('should report degraded status to ElizaOS if a worker is unhealthy', async () => {
             const diagnoseSpy = jest.spyOn(worker1, 'selfDiagnose').mockResolvedValue({ status: 'unhealthy' });
            
             const health = await elizaManager.selfDiagnose();

             expect(health.status).toBe('degraded');
             expect(mockElizaClient.reportAgentStatus).toHaveBeenCalledWith(
                 managerId, // Report manager's overall status
                 expect.objectContaining({ status: 'degraded' })
             );
              expect(mockElizaClient.reportAgentStatus).toHaveBeenCalledWith(
                 workerId1, // Report unhealthy worker status
                 expect.objectContaining({ status: 'unhealthy' })
             );
              expect(mockElizaClient.reportAgentStatus).toHaveBeenCalledWith(
                 workerId2, // Report healthy worker status
                 expect.objectContaining({ status: 'healthy' })
             );
             diagnoseSpy.mockRestore();
        });

        it('should still return health status even if reporting to ElizaOS fails', async () => {
             mockElizaClient.reportAgentStatus.mockRejectedValue(new Error('Eliza connection failed'));
             const logSpy = jest.spyOn(elizaManager as any, 'log');

             const health = await elizaManager.selfDiagnose();

             expect(health.status).toBe('healthy'); // Manager/worker health itself is okay
             expect(logSpy).toHaveBeenCalledWith('error', expect.stringContaining('Failed to report status to ElizaOS'));
             logSpy.mockRestore();
        });
    });

    describe('recover (Eliza Integration)', () => {
        it('should call super.recover and attempt worker recovery', async () => {
            const error: AgentError = { code: 'ELIZA_POOL_ERROR', message: 'Issue detected' };
            const diagnoseSpy = jest.spyOn(worker1, 'selfDiagnose').mockResolvedValue({ status: 'unhealthy' });
            const recoverSpy = jest.spyOn(worker1, 'recover').mockResolvedValue(undefined); // Worker recovers
            const superRecoverSpy = jest.spyOn(ManagerAgent.prototype, 'recover'); // Spy on the base class method

            (elizaManager as any).setStatus('error');
            await elizaManager.recover(error);

            // Check if base class recover was called (which handles worker recovery)
            expect(superRecoverSpy).toHaveBeenCalledWith(error);
            // Since base recover worked (and worker1 recover worked), status should be idle
            expect(elizaManager.getStatus()).toBe('idle'); 
            // Check if Eliza reporting/suggestion TODOs are logged (optional)
            // expect(logSpy).toHaveBeenCalledWith('warn', 'TODO: Integrate ElizaOS error reporting...');

            diagnoseSpy.mockRestore();
            recoverSpy.mockRestore();
            superRecoverSpy.mockRestore();
        });
    });

    describe('processNaturalLanguageCommand', () => {
        it('should interpret command via Eliza and execute the resulting task', async () => {
            const command = 'Process the latest dataset';
            const generatedTask: AgentTask = { 
                id: 'task-from-eliza-1', 
                type: 'data_processing_command', 
                payload: { originalCommand: command } 
            };
            mockElizaClient.interpretNaturalLanguageCommand.mockResolvedValue(generatedTask);
            // Mock worker recommendation and execution for the generated task
            mockElizaClient.getWorkerRecommendations.mockResolvedValue([workerId1]);
            const workerExecuteSpy = jest.spyOn(worker1, 'execute');

            const result = await elizaManager.processNaturalLanguageCommand(command);

            expect(mockElizaClient.interpretNaturalLanguageCommand).toHaveBeenCalledWith(command);
            // Verify that execute was called, which in turn called _performTask
            expect(mockElizaClient.getWorkerRecommendations).toHaveBeenCalledWith({
                taskType: generatedTask.type,
                payload: generatedTask.payload
            });
            expect(workerExecuteSpy).toHaveBeenCalledWith(generatedTask);
            expect(result.success).toBe(true);
            expect(result.output).toEqual({ message: 'Task completed by BasicWorkerAgent' });
            expect(elizaManager.getStatus()).toBe('idle');

            workerExecuteSpy.mockRestore();
        });

        it('should return failure if command interpretation fails', async () => {
            const command = 'Do something impossible';
            const interpretationError = new Error('Unknown command');
            mockElizaClient.interpretNaturalLanguageCommand.mockRejectedValue(interpretationError);
            const executeSpy = jest.spyOn(elizaManager, 'execute');

            const result = await elizaManager.processNaturalLanguageCommand(command);

            expect(mockElizaClient.interpretNaturalLanguageCommand).toHaveBeenCalledWith(command);
            expect(executeSpy).not.toHaveBeenCalled(); // Should fail before execution
            expect(result.success).toBe(false);
            expect(result.error).toBe(`Command processing failed: ${interpretationError.message}`);
            expect(elizaManager.getStatus()).toBe('idle'); // Should remain idle if interpretation fails pre-execution

            executeSpy.mockRestore();
        });
    });
}); 