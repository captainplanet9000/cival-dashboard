/**
 * API Routes for Strategy Document Management
 * Provides data for the knowledge base visualization
 */
import { NextRequest, NextResponse } from 'next/server';
import neonFarmClient from '@/utils/database/neon-farm-client';

export async function GET(request: NextRequest) {
  try {
    // Get strategy documents summary
    const documentsSummary = await neonFarmClient.getStrategyDocumentsSummary();
    
    return NextResponse.json(documentsSummary);
  } catch (error) {
    console.error('Error fetching strategy documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy documents' },
      { status: 500 }
    );
  }
}
