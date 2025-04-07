import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { ElizaManagerAgent } from '@/agents/ElizaManagerAgent';
import { ElizaWorkerAgent } from '@/agents/ElizaWorkerAgent';
import { AgentMemory } from '@/memory/AgentMemory';
import { InMemoryAgentMemory } from '@/memory/InMemoryAgentMemory';
import { AgentTools, ToolRegistry } from '@/tools/AgentTools';
import { AgentTask } from '@/types/agentTypes';
import { Database } from '@/types/database.types';
import { ElizaOSClient } from '@/agents/ElizaManagerAgent';
import { MockElizaOSClient } from '@/lib/elizaos/MockElizaOSClient';
import { RealElizaOSClient } from '@/lib/elizaos/RealElizaOSClient';

let managerAgentSingleton: ElizaManagerAgent | null = null;

async function getManagerAgent(): Promise<ElizaManagerAgent> {
    if (managerAgentSingleton) {
        return managerAgentSingleton;
    }

    console.log("Initializing ElizaManagerAgent singleton...");

    const supabase = createServerClient();

    const elizaApiUrl = process.env.ELIZA_OS_API_URL;
    const elizaApiKey = process.env.ELIZA_OS_API_KEY;
    const useMockEliza = process.env.USE_MOCK_ELIZA_OS === 'true';

    const agentMemory: AgentMemory = new InMemoryAgentMemory();
    const agentTools: AgentTools = new ToolRegistry();

    let elizaClient: ElizaOSClient;
    if (useMockEliza) {
        console.log("API Route: Using MockElizaOSClient.");
        elizaClient = new MockElizaOSClient();
    } else {
        if (!elizaApiUrl || !elizaApiKey) {
            console.error("API Route Error: Real ElizaOS Client requires ELIZA_OS_API_URL and ELIZA_OS_API_KEY.");
            throw new Error("ElizaOS API configuration missing in environment variables.");
        }
        console.log("API Route: Using RealElizaOSClient.");
        elizaClient = new RealElizaOSClient({ apiUrl: elizaApiUrl, apiKey: elizaApiKey });
    }

    managerAgentSingleton = new ElizaManagerAgent(
        process.env.MANAGER_AGENT_ID || 'eliza-manager-prod-001',
        agentMemory,
        agentTools,
        elizaClient,
        supabase
    );

    const workerCount = parseInt(process.env.WORKER_AGENT_COUNT || '2', 10);
    console.log(`Initializing ${workerCount} worker agents...`);
    for (let i = 1; i <= workerCount; i++) {
        const workerId = process.env[`WORKER_AGENT_${i}_ID`] || `eliza-worker-prod-00${i}`;
        const workerMemory = new InMemoryAgentMemory();
        const worker = new ElizaWorkerAgent(
            workerId,
            workerMemory,
            agentTools,
            supabase
        );
        managerAgentSingleton.addWorker(worker);
        console.log(`Added worker: ${workerId}`);
    }

    console.log(`ElizaManagerAgent singleton ${managerAgentSingleton.id} initialized with ${workerCount} workers.`);
    return managerAgentSingleton;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const command = body.command;
        const context = body.context || {};

        if (!command || typeof command !== 'string') {
            return NextResponse.json({ success: false, error: 'Missing or invalid "command" field in request body.' }, { status: 400 });
        }

        const manager = await getManagerAgent();

        console.log(`API Route: Processing command: "${command}"`);
        const result = await manager.processNaturalLanguageCommand(command, context);
        console.log(`API Route: Command processing result:`, result);

        if (result.success) {
            return NextResponse.json({ success: true, output: result.output, taskId: result.taskId });
        } else {
            return NextResponse.json({ success: false, error: result.error || 'Agent failed to process command.', taskId: result.taskId }, { status: 500 });
        }

    } catch (error: any) {
        console.error("API Route Error:", error);
        if (error.message.includes("ElizaOS API configuration missing")) {
             return NextResponse.json({ success: false, error: error.message }, { status: 503 }); 
        }
        return NextResponse.json({ success: false, error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
} 