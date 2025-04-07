// Assuming AutonomousAgent and placeholder interfaces are in this path
import { 
    AutonomousAgent, 
    AgentTask, 
    ExecutionResult, 
    HealthStatus, 
    AgentError, 
    AgentStatus
} from '../../agents/AutonomousAgent';
import { AgentMemory } from '../../memory/AgentMemory';
import { AgentTools } from '../../tools/AgentTools';

// Mock concrete implementation for testing
class MockAgent extends AutonomousAgent {
    public id: string; // Explicitly define id here as a workaround
    shouldSucceed: boolean = true;
    taskOutput: any = {}; // To control output of _performTask
    shouldRecover: boolean = true;
    recoverCalledWith: AgentError | null = null;
    health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    constructor(id: string, memory: AgentMemory, tools: AgentTools) {
        super(id, memory, tools);
        this.id = id; // Assign id explicitly
        this.status = 'idle'; // Ensure starts idle
        this.recoverCalledWith = null;
    }

    // Implement the new abstract method
    protected async _performTask(task: AgentTask): Promise<any> {
        this.log('info', `MockAgent ${this.id} performing task:`, task);
        await new Promise(res => setTimeout(res, 10)); // Simulate async work
        if (this.shouldSucceed) {
            return this.taskOutput || { message: `Task ${task.id} performed` };
        } else {
            throw new Error(`Task ${task.id} failed intentionally`);
        }
    }

    // Keep selfDiagnose as is for now
    async selfDiagnose(): Promise<HealthStatus> {
        this.log('info', `MockAgent ${this.id} diagnosing... Result: ${this.health}`);
        await new Promise(res => setTimeout(res, 5));
        return { status: this.health };
    }

    // Keep recover but track if it was called
    async recover(error: AgentError): Promise<void> {
        this.log('warn', `MockAgent ${this.id} attempting recovery from error:`, error);
        this.recoverCalledWith = error; // Track the error it was called with
        this.setStatus('recovering');
        await new Promise(res => setTimeout(res, 10));
        if (!this.shouldRecover) {
            // Explicitly set status to error if recovery fails *before* throwing
            this.setStatus('error');
            throw new Error("Recovery failed intentionally");
        }
        this.log('info', `MockAgent ${this.id} recovery attempt complete.`);
        // Simulate successful recovery
        this.health = 'healthy'; 
        this.setStatus('idle'); // Important: set back to idle after successful recovery
    }
}

// Mock Memory and Tools for testing
// Corrected mockMemory definition
const mockMemory: AgentMemory = {
    store: jest.fn().mockResolvedValue(undefined),
    retrieve: jest.fn().mockResolvedValue('mock data'),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
};

// Corrected mockTools definition
const mockTools: AgentTools = {
    getTool: jest.fn().mockReturnValue(async () => 'tool result'),
    registerTool: jest.fn(),
    unregisterTool: jest.fn(),
    listTools: jest.fn().mockReturnValue(['mockTool']),
};

// --- Jest Test Suite ---

describe('AutonomousAgent Base Class', () => {
    let agent: MockAgent;

    // Use beforeEach for setup
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
        agent = new MockAgent('agent-test-123', mockMemory, mockTools);
    });

    it('should initialize with correct ID and idle status', () => {
        expect(agent.id).toBe('agent-test-123');
        expect(agent.getStatus()).toBe('idle');
    });

    it('should execute a task successfully when idle', async () => {
        const task: AgentTask = { id: 'task-001', type: 'test', payload: { data: 'sample' } };
        agent.shouldSucceed = true;
        agent.taskOutput = { result: 'success output' };

        const result = await agent.execute(task);

        expect(result.success).toBe(true);
        expect(result.output).toEqual({ result: 'success output' });
        expect(result.error).toBeUndefined();
        expect(agent.getStatus()).toBe('idle');
        expect(agent.recoverCalledWith).toBeNull();
        // Optionally check if _performTask was called if needed, using spyOn
    });

    it('should handle task execution failure followed by successful recovery', async () => {
        const task: AgentTask = { id: 'task-002', type: 'test', payload: {} };
        agent.shouldSucceed = false; // _performTask will throw
        agent.shouldRecover = true;  // recover will succeed
        const expectedErrorMessage = `Task ${task.id} failed intentionally`;

        const result = await agent.execute(task);

        expect(result.success).toBe(false);
        expect(result.error).toBe(`Task ${task.id} failed: ${expectedErrorMessage}`);
        expect(result.output).toBeUndefined();
        expect(agent.getStatus()).toBe('idle'); // Should be idle after successful recovery
        expect(agent.recoverCalledWith).not.toBeNull();
        expect(agent.recoverCalledWith?.code).toBe('EXECUTION_FAILED');
    });

    it('should handle task execution failure followed by recovery failure', async () => {
        const task: AgentTask = { id: 'task-003', type: 'test', payload: {} };
        agent.shouldSucceed = false; // _performTask will throw
        agent.shouldRecover = false; // recover will also throw
        const expectedErrorMessage = `Task ${task.id} failed intentionally`;

        const result = await agent.execute(task);

        expect(result.success).toBe(false);
        expect(result.error).toBe(`Task ${task.id} failed: ${expectedErrorMessage}`);
        expect(agent.getStatus()).toBe('error'); // Should remain in error state
        expect(agent.recoverCalledWith).not.toBeNull();
        expect(agent.recoverCalledWith?.code).toBe('EXECUTION_FAILED');
    });

    it('should prevent task execution if agent is not idle', async () => {
        const task1: AgentTask = { id: 'task-004a', type: 'test', payload: {} };
        const task2: AgentTask = { id: 'task-004b', type: 'test', payload: {} };

        // Manually set status to busy to simulate ongoing task
        (agent as any).setStatus('busy'); // Use type assertion or make setStatus public for testing if preferred

        // Now try executing the second task
        const result = await agent.execute(task2);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Agent is not idle (current status: busy).');
        expect(agent.getStatus()).toBe('busy'); // Status should remain busy
        expect(agent.recoverCalledWith).toBeNull();
    });

    it('should return the correct health status from selfDiagnose', async () => {
        agent.health = 'degraded';
        const status = await agent.selfDiagnose();
        expect(status.status).toBe('degraded');

        agent.health = 'unhealthy';
        const status2 = await agent.selfDiagnose();
        expect(status2.status).toBe('unhealthy');

        agent.health = 'healthy';
        const status3 = await agent.selfDiagnose();
        expect(status3.status).toBe('healthy');
    });

    describe('Recovery Method', () => {
        it('should transition to idle after successful recovery', async () => {
            const error: AgentError = { code: 'TestError', message: 'Something went wrong' };
            agent.health = 'unhealthy';
            agent.shouldRecover = true;

            await agent.recover(error);

            expect(agent.getStatus()).toBe('idle');
            expect(agent.health).toBe('healthy'); // Verify health is reset
        });

        it('should throw an error and remain in error status if recovery fails', async () => {
            const error: AgentError = { code: 'FatalError', message: 'Cannot recover' };
            agent.shouldRecover = false;

            await expect(agent.recover(error)).rejects.toThrow("Recovery failed intentionally");

            // Status should be set to 'error' within the recover method *before* throwing
            expect(agent.getStatus()).toBe('error');
        });
    });

    // Example of testing protected methods like log (if needed)
    // You might need to make `log` public or use spies/mocks depending on testing strategy
    it('should log messages correctly (example)', () => {
        // Use jest.spyOn to watch console.log (or a dedicated logger mock)
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(); // Suppress actual console output during test

        agent['log']('info', 'Test log message'); // Access protected method for testing

        expect(consoleSpy).toHaveBeenCalled();
        // Add more specific checks on the logged message if necessary
        // e.g., expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] Test log message'));

        consoleSpy.mockRestore(); // Clean up spy
    });

    it('should allow getting the current status', () => {
        expect(agent.getStatus()).toBe('idle');
        (agent as any).setStatus('busy');
        expect(agent.getStatus()).toBe('busy');
    });

    it('should send a heartbeat (placeholder test)', async () => {
        // Spy on log to see if heartbeat logs
        const logSpy = jest.spyOn(agent as any, 'log'); // Spy on the protected log method
        await agent.sendHeartbeat();
        expect(logSpy).toHaveBeenCalledWith('info', 'Sending heartbeat...');
        logSpy.mockRestore();
    });

});

// TODO: Add tests for ManagerAgent
// TODO: Add tests for ElizaManagerAgent (requires mocking ElizaOSClient)
// TODO: Restore Jest structure (describe, it, expect) once types are installed 