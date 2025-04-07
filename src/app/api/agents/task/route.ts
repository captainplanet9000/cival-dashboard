import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase/server';
import { ElizaManagerAgent } from '@/agents/ElizaManagerAgent';
import { BasicWorkerAgent } from '@/agents/BasicWorkerAgent';
import { MockElizaOSClient } from '../../agents/mocks/MockElizaOSClient';
import { SupabaseAgentMemory } from '../../memory/SupabaseAgentMemory';
import { AgentTools } from '../../tools/AgentTools';
import { AgentTask, AgentTool } from '../../types/agentTypes';
import { Database } from '@/types/database.types';
import { CalculatorTool } from '../../tools/CalculatorTool';

let managerAgentSingleton: ElizaManagerAgent | null = null;
const MANAGER_AGENT_ID = 'api-eliza-manager-001';

async function getManagerAgentInstance(): Promise<ElizaManagerAgent> {
    if (!managerAgentSingleton) {
        console.log('Initializing Eliza Manager Agent singleton...');
        const cookieStore = cookies();
        const supabase = createServerClient(cookieStore);

        const { data: agentData, error: agentError } = await supabase
            .from('agents')
            .upsert({
                id: MANAGER_AGENT_ID,
                agent_type: 'eliza_manager',
                status: 'initializing',
                created_at: new Date().toISOString(),
                last_heartbeat_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (agentError) {
            console.error('Error upserting manager agent:', agentError);
            throw new Error(`Failed to ensure manager agent record: ${agentError.message}`);
        }
        if (!agentData) {
            throw new Error('Failed to retrieve manager agent data after upsert.');
        }

        console.log('Manager agent record ensured/created:', agentData.id);

        const memory = new SupabaseAgentMemory(supabase, MANAGER_AGENT_ID);
        
        const tools = new AgentTools();
        tools.registerTool(new CalculatorTool());
        console.log('Available tools:', tools.listTools().map((t: AgentTool) => t.definition.name));

        const elizaClient = new MockElizaOSClient();

        managerAgentSingleton = new ElizaManagerAgent(
            MANAGER_AGENT_ID,
            memory,
            tools,
            elizaClient,
            supabase
        );

        console.log('Eliza Manager Agent singleton initialized successfully.');
        
        // TODO: Add basic worker agents for testing/initial setup if needed
        // const worker1 = new BasicWorkerAgent('worker-001', new InMemoryAgentMemory(), new AgentTools());
        // managerAgentSingleton.addWorker(worker1);
    }
    return managerAgentSingleton;
}

export async function POST(request: Request) {
    try {
        const { command, context } = await request.json();

        if (!command) {
            return NextResponse.json({ error: 'Missing command in request body' }, { status: 400 });
        }

        const manager = await getManagerAgentInstance();
        
        // Process the command using the manager agent
        // The manager might interpret the command, create a task, and assign it
        // For now, let's assume a simple direct execution or interpretation
        console.log(`Received command for manager ${manager.id}:`, command);

        const result = await manager.processNaturalLanguageCommand(command, context);
        console.log('Command processing result:', result);

        return NextResponse.json({ 
            message: result.success ? 'Command processed' : 'Command failed',
            taskId: result.taskId, 
            result: result.output,
            error: result.error
        });

    } catch (error: any) {
        console.error('Error processing agent task request:', error);
        // Ensure manager status is updated on error if possible
        if (managerAgentSingleton) {
            try {
                 await managerAgentSingleton.setStatus('error');
                 // Optionally log the error to agent memory or database
            } catch (statusError) {
                console.error('Failed to update manager status on error:', statusError);
            }
        }
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
} 