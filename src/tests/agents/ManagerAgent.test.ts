import {
    ManagerAgent,
    ManagerHealthStatus
} from '../../agents/ManagerAgent';
import {
    BasicWorkerAgent // Use BasicWorkerAgent as a concrete worker for testing
} from '../../agents/BasicWorkerAgent';
import {
    AgentTask,
    AgentError,
    AgentStatus,
    HealthStatus as BaseHealthStatus, // Use alias
    AutonomousAgent
} from '../../agents/AutonomousAgent';
import { AgentMemory } from '../../memory/AgentMemory';
import { AgentTools } from '../../tools/AgentTools';
import { SupabaseClient } from '@supabase/supabase-js'; 
import { Database } from '@/types/database.types';

// Mock Memory and Tools for the Manager Agent
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

// Mocks for the Worker Agents (can share or be separate)
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

// Mock Supabase Client (can be shared across test files or defined per file)
const mockSupabaseClient = {
    from: jest.fn(() => ({
        select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) })) })),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
        upsert: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
        delete: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
    }))
} as unknown as SupabaseClient<Database>; 

describe('ManagerAgent', () => {
    let manager: ManagerAgent;
    let worker1: BasicWorkerAgent;
    let worker2: BasicWorkerAgent;
    const managerId = 'manager-test-001';
    const workerId1 = 'worker-test-w1';
    const workerId2 = 'worker-test-w2';

    beforeEach(() => {
        // Reset Manager mocks
        Object.values(mockManagerMemory).forEach(mockFn => (mockFn as jest.Mock).mockClear());
        Object.values(mockManagerTools).forEach(mockFn => (mockFn as jest.Mock).mockClear());
        
        // Reset Worker mocks (important if workers interact with them)
        Object.values(mockWorkerMemory).forEach(mockFn => (mockFn as jest.Mock).mockClear());
        Object.values(mockWorkerTools).forEach(mockFn => (mockFn as jest.Mock).mockClear());

        // Reset Supabase client mock
        (mockSupabaseClient.from as jest.Mock).mockClear(); 

        // Create new instances
        manager = new ManagerAgent(
            managerId, 
            mockManagerMemory, 
            mockManagerTools, 
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

        // Ensure agents start idle
        (manager as any).setStatus('idle');
        (worker1 as any).setStatus('idle');
        (worker2 as any).setStatus('idle');
    });

    it('should initialize correctly', () => {
        expect(manager.id).toBe(managerId);
        expect(manager.getStatus()).toBe('idle');
        expect(manager.getWorker(workerId1)).toBeUndefined(); // No workers initially
    });

    describe('Worker Management', () => {
        it('should add workers to the pool', () => {
            manager.addWorker(worker1);
            manager.addWorker(worker2);
            expect(manager.getWorker(workerId1)).toBe(worker1);
            expect(manager.getWorker(workerId2)).toBe(worker2);
        });

        it('should not add the same worker twice', () => {
            const logSpy = jest.spyOn(manager as any, 'log');
            manager.addWorker(worker1);
            manager.addWorker(worker1); // Add again
            expect(logSpy).toHaveBeenCalledWith('warn', `Worker with ID ${workerId1} already exists in the pool.`);
            // Check workerPool size if possible/needed, or rely on getWorker
            expect(manager.getWorker(workerId1)).toBe(worker1);
            logSpy.mockRestore();
        });

        it('should remove workers from the pool', () => {
            manager.addWorker(worker1);
            manager.addWorker(worker2);
            expect(manager.getWorker(workerId1)).toBe(worker1);
            manager.removeWorker(workerId1);
            expect(manager.getWorker(workerId1)).toBeUndefined();
            expect(manager.getWorker(workerId2)).toBe(worker2); // Ensure other worker remains
        });

        it('should handle removing a non-existent worker gracefully', () => {
            const logSpy = jest.spyOn(manager as any, 'log');
            manager.removeWorker('non-existent-worker');
            expect(logSpy).toHaveBeenCalledWith('warn', 'Worker with ID non-existent-worker not found in the pool.');
            logSpy.mockRestore();
        });
    });

    describe('_performTask (Delegation)', () => {
        beforeEach(() => {
            // Add workers for delegation tests
            manager.addWorker(worker1);
            manager.addWorker(worker2);
        });

        it('should delegate a task to the first available idle worker', async () => {
            const task: AgentTask = { id: 'mgr-task-1', type: 'delegate', payload: { value: 'test' } };
            const worker1ExecuteSpy = jest.spyOn(worker1, 'execute');
            const worker2ExecuteSpy = jest.spyOn(worker2, 'execute');

            const result = await manager.execute(task);

            expect(result.success).toBe(true);
            // BasicWorker returns a specific message
            expect(result.output).toEqual({ message: 'Task completed by BasicWorkerAgent' });
            expect(worker1ExecuteSpy).toHaveBeenCalledWith(task);
            expect(worker2ExecuteSpy).not.toHaveBeenCalled();
            expect(manager.getStatus()).toBe('idle');

            worker1ExecuteSpy.mockRestore();
            worker2ExecuteSpy.mockRestore();
        });

        it('should delegate to the second worker if the first is busy', async () => {
            const task: AgentTask = { id: 'mgr-task-2', type: 'delegate', payload: {} };
            (worker1 as any).setStatus('busy'); // Make worker1 busy
            const worker1ExecuteSpy = jest.spyOn(worker1, 'execute');
            const worker2ExecuteSpy = jest.spyOn(worker2, 'execute');

            const result = await manager.execute(task);

            expect(result.success).toBe(true);
            expect(result.output).toEqual({ message: 'Task completed by BasicWorkerAgent' });
            expect(worker1ExecuteSpy).not.toHaveBeenCalled();
            expect(worker2ExecuteSpy).toHaveBeenCalledWith(task);
            expect(manager.getStatus()).toBe('idle');

            worker1ExecuteSpy.mockRestore();
            worker2ExecuteSpy.mockRestore();
        });

        it('should throw an error if no workers are available (idle)', async () => {
            const task: AgentTask = { id: 'mgr-task-3', type: 'delegate', payload: {} };
            (worker1 as any).setStatus('busy');
            (worker2 as any).setStatus('busy');
            const worker1ExecuteSpy = jest.spyOn(worker1, 'execute');
            const worker2ExecuteSpy = jest.spyOn(worker2, 'execute');

            await expect(manager.execute(task)).rejects.toThrow(
                `Manager ${managerId}: No suitable or available worker found for task ${task.id}.`
            );

            expect(worker1ExecuteSpy).not.toHaveBeenCalled();
            expect(worker2ExecuteSpy).not.toHaveBeenCalled();
            // Manager should be in error state after failing to delegate
            expect(manager.getStatus()).toBe('error');

            worker1ExecuteSpy.mockRestore();
            worker2ExecuteSpy.mockRestore();
        });

        it('should handle and propagate errors if worker execution fails', async () => {
            const task: AgentTask = { id: 'mgr-task-4', type: 'delegate', payload: {} };
            // Mock worker1's execute to return failure
            const worker1ExecuteSpy = jest.spyOn(worker1, 'execute').mockResolvedValue({
                success: false,
                error: 'Worker task failed intentionally'
            });
            const worker2ExecuteSpy = jest.spyOn(worker2, 'execute');

            await expect(manager.execute(task)).rejects.toThrow(
                `Worker ${workerId1} failed task ${task.id}: Worker task failed intentionally`
            );

            expect(worker1ExecuteSpy).toHaveBeenCalledWith(task);
            expect(worker2ExecuteSpy).not.toHaveBeenCalled();
            expect(manager.getStatus()).toBe('error');

            worker1ExecuteSpy.mockRestore();
            worker2ExecuteSpy.mockRestore();
        });
    });

    describe('selfDiagnose', () => {
        it('should report healthy if manager is ok and has no workers', async () => {
            const health = await manager.selfDiagnose();
            expect(health.status).toBe('healthy');
            expect(health.workerStatuses).toEqual({});
        });

        it('should report healthy if manager and all workers are healthy', async () => {
            manager.addWorker(worker1);
            manager.addWorker(worker2);
            // BasicWorkerAgent always reports healthy
            const health = await manager.selfDiagnose();
            expect(health.status).toBe('healthy');
            expect(health.workerStatuses?.[workerId1]?.status).toBe('healthy');
            expect(health.workerStatuses?.[workerId2]?.status).toBe('healthy');
        });

        it('should report degraded if one worker is unhealthy', async () => {
            manager.addWorker(worker1);
            manager.addWorker(worker2);
            // Mock worker2's diagnosis
            const diagnoseSpy = jest.spyOn(worker2, 'selfDiagnose').mockResolvedValue({ status: 'unhealthy', details: 'Simulated failure' });
            
            const health = await manager.selfDiagnose();
            expect(health.status).toBe('degraded');
            expect(health.workerStatuses?.[workerId1]?.status).toBe('healthy');
            expect(health.workerStatuses?.[workerId2]?.status).toBe('unhealthy');
            expect(health.details).toContain('Unhealthy workers: 1');

            diagnoseSpy.mockRestore();
        });

        it('should report unhealthy if all workers are unhealthy', async () => {
            manager.addWorker(worker1);
            manager.addWorker(worker2);
            const diagnoseSpy1 = jest.spyOn(worker1, 'selfDiagnose').mockResolvedValue({ status: 'unhealthy' });
            const diagnoseSpy2 = jest.spyOn(worker2, 'selfDiagnose').mockResolvedValue({ status: 'unhealthy' });

            const health = await manager.selfDiagnose();
            expect(health.status).toBe('unhealthy');
            expect(health.details).toContain(`Workers checked: 2. Unhealthy workers: 2`);

            diagnoseSpy1.mockRestore();
            diagnoseSpy2.mockRestore();
        });

        it('should report degraded if worker diagnosis fails', async () => {
            manager.addWorker(worker1);
            const diagnoseSpy = jest.spyOn(worker1, 'selfDiagnose').mockRejectedValue(new Error('Diagnosis network error'));

            const health = await manager.selfDiagnose();
            expect(health.status).toBe('degraded'); // Or unhealthy depending on policy
            expect(health.workerStatuses?.[workerId1]?.status).toBe('unhealthy');
            expect(health.workerStatuses?.[workerId1]?.details).toContain('Diagnosis failed: Diagnosis network error');

            diagnoseSpy.mockRestore();
        });
    });

    describe('recover', () => {
        it('should attempt to recover unhealthy workers and return to idle if successful', async () => {
            manager.addWorker(worker1);
            manager.addWorker(worker2);
            const error: AgentError = { code: 'POOL_ERROR', message: 'Worker pool issue detected' };

            // Mock diagnoses and recovery
            const diagnoseSpy1 = jest.spyOn(worker1, 'selfDiagnose').mockResolvedValue({ status: 'unhealthy' });
            const diagnoseSpy2 = jest.spyOn(worker2, 'selfDiagnose').mockResolvedValue({ status: 'healthy' });
            const recoverSpy1 = jest.spyOn(worker1, 'recover').mockResolvedValue(undefined); // Worker 1 recovers successfully
            const recoverSpy2 = jest.spyOn(worker2, 'recover');

            (manager as any).setStatus('error'); // Start in error state
            await manager.recover(error);

            expect(recoverSpy1).toHaveBeenCalled();
            expect(recoverSpy2).not.toHaveBeenCalled();
            expect(manager.getStatus()).toBe('idle');

            diagnoseSpy1.mockRestore();
            diagnoseSpy2.mockRestore();
            recoverSpy1.mockRestore();
            recoverSpy2.mockRestore();
        });

        it('should remain in error state if worker recovery fails', async () => {
             manager.addWorker(worker1);
             const error: AgentError = { code: 'POOL_ERROR', message: 'Worker pool issue detected' };

             const diagnoseSpy = jest.spyOn(worker1, 'selfDiagnose').mockResolvedValue({ status: 'unhealthy' });
             const recoverSpy = jest.spyOn(worker1, 'recover').mockRejectedValue(new Error('Worker failed to recover'));

             (manager as any).setStatus('error');
             // Need to catch the error thrown by the manager's recover process itself
             await expect(manager.recover(error)).rejects.toThrow('Worker failed to recover');
             
             expect(recoverSpy).toHaveBeenCalled();
             // Manager should end up in error state if the recovery *process* (including worker recovery) fails
             expect(manager.getStatus()).toBe('error'); 

             diagnoseSpy.mockRestore();
             recoverSpy.mockRestore();
        });
        
         it('should handle errors during the diagnosis phase of recovery', async () => {
            manager.addWorker(worker1);
            const error: AgentError = { code: 'INITIAL_ERROR', message: 'Something failed' };

            // Mock selfDiagnose to throw during recovery
            const diagnoseSpy = jest.spyOn(manager, 'selfDiagnose').mockRejectedValue(new Error('Diagnosis failed during recovery'));
            const recoverSpy = jest.spyOn(worker1, 'recover');

            (manager as any).setStatus('error');
            await expect(manager.recover(error)).rejects.toThrow('Diagnosis failed during recovery');

            expect(recoverSpy).not.toHaveBeenCalled(); // Worker recovery shouldn't be reached
            expect(manager.getStatus()).toBe('error'); // Should stay/end in error

            diagnoseSpy.mockRestore();
            recoverSpy.mockRestore();
        });
    });
}); 