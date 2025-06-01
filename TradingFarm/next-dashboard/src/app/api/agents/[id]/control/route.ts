import { NextResponse } from 'next/server';
import { ElizaOSAgentService } from '@/services/elizaos-agent-service';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { action } = await request.json();
    const service = new ElizaOSAgentService();
    const agent = await service.controlAgent(params.id, action);
    return NextResponse.json({ agent });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
