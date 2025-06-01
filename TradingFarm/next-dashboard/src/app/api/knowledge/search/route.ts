/**
 * API Route for Semantic Search in Knowledge Base
 */
import { NextRequest, NextResponse } from 'next/server';
import { knowledgeService } from '@/services/knowledge-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, documentIds, limit, similarityThreshold, filterMetadata } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Perform semantic search
    const results = await knowledgeService.semanticSearch({
      query,
      documentIds: Array.isArray(documentIds) ? documentIds : undefined,
      limit: typeof limit === 'number' ? limit : 5,
      similarityThreshold: typeof similarityThreshold === 'number' ? similarityThreshold : 0.7,
      filterMetadata: typeof filterMetadata === 'object' ? filterMetadata : undefined
    });
    
    if (!results.success) {
      return NextResponse.json(
        { success: false, error: results.error || 'Search failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      results: results.results || []
    });
  } catch (error: any) {
    console.error('Unexpected error in search API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
