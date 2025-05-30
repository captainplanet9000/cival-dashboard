// Remove direct Supabase client import
// import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { AgentApi, CreateBasicWorkerDto } from '@/lib/api/agents'; // Import AgentApi
import { AgentSpecs } from '@/types/database-json.types';

// Placeholder for potential auth/validation logic
// const validateRequest = async (request: Request) => { ... };

export async function POST(request: Request) {
  try {
    // await validateRequest(request); // Optional: Add validation/auth

    const body = await request.json();

    // Validate required input (specs are mandatory)
    if (!body.specs) {
      return NextResponse.json({ error: 'Agent specs are required' }, { status: 400 });
    }

    // TODO: Add more robust validation for the specs object structure if needed
    const createDto: CreateBasicWorkerDto = {
      manager_id: body.manager_id || null,
      initial_status: body.initial_status,
      specs: body.specs as AgentSpecs // Assume input matches the interface for now
    };

    // Call the API layer method
    const newAgent = await AgentApi.createBasicWorkerAgent(createDto);

    return NextResponse.json(newAgent);

  } catch (error: any) {
    console.error('[BasicCreateAgent API Route] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
} 