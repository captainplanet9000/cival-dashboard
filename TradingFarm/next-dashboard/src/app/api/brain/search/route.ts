import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define required request body type
interface SearchRequestBody {
  query: string;
  limit?: number;
  threshold?: number;
  assetTypes?: string[];
}

// Define response type for clarity
interface SearchResult {
  brain_asset_id: number;
  chunk_index: number;
  chunk_text: string;
  similarity: number;
  asset?: {
    id: number;
    title: string;
    asset_type: string;
    description: string | null;
    filename: string;
    storage_path: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body: SearchRequestBody = await req.json();
    
    // Validate the required parameters
    if (!body.query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Get default values or use provided values
    const limit = body.limit || 5;
    const threshold = body.threshold || 0.7;
    const assetTypes = body.assetTypes || [];

    // Create Supabase client
    const supabase = await createServerClient();
    
    // Generate embeddings for the query using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: body.query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Build the Supabase query for semantic search
    let query = supabase
      .rpc('match_brain_asset_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      })
      .select(`
        brain_asset_id,
        chunk_index,
        chunk_text,
        similarity,
        asset:brain_assets(
          id,
          title,
          asset_type,
          description,
          filename,
          storage_path
        )
      `)
      .order('similarity', { ascending: false });
    
    // Add asset type filter if provided
    if (assetTypes.length > 0) {
      query = query.filter('asset.asset_type', 'in', `(${assetTypes.join(',')})`);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error searching brain assets:', error);
      return NextResponse.json(
        { error: 'Failed to search brain assets' },
        { status: 500 }
      );
    }
    
    // Return the search results
    return NextResponse.json(data as SearchResult[]);
    
  } catch (error) {
    console.error('Error in brain search API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Optional: Add a GET method for basic search testing
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('query');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }
  
  // Create a request body from search parameters
  const body: SearchRequestBody = {
    query,
    limit: Number(searchParams.get('limit')) || 5,
    threshold: Number(searchParams.get('threshold')) || 0.7,
  };
  
  // Create a new request with the body
  const jsonRequest = new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: req.headers,
  });
  
  // Reuse the POST handler
  return POST(jsonRequest);
}
