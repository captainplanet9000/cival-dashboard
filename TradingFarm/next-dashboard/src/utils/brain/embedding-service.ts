/**
 * Embedding Service
 * 
 * This service handles the creation of embeddings for text content.
 * It uses OpenAI's embeddings API by default but could be extended
 * to support other embedding providers.
 */

// Constants for embedding configuration
const EMBEDDING_MODEL = 'text-embedding-ada-002'; // OpenAI's embedding model
const EMBEDDING_DIMENSIONS = 1536; // Dimensions for Ada-002 model

/**
 * Create an embedding vector for the given text
 * 
 * @param text The text to generate an embedding for
 * @returns A vector embedding as an array of numbers
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    // Call OpenAI API to generate embedding
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.replace(/\n/g, ' ') // Replace newlines with spaces for better embedding
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.data[0].embedding;
    
  } catch (error) {
    console.error('Error creating embedding:', error);
    
    // Return a zero-filled vector as a fallback
    // This ensures the database operation doesn't fail, though search quality will be impacted
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }
}

/**
 * Search for similar content using vector similarity
 * 
 * @param query The search query text
 * @param limit Maximum number of results to return
 * @param threshold Similarity threshold (0-1)
 * @returns Array of search results
 */
export async function searchSimilarContent(
  query: string,
  limit: number = 5,
  threshold: number = 0.7
) {
  try {
    // First, generate an embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    // Use the Supabase pgvector extension to search for similar content
    const { createBrowserClient } = await import('@/utils/supabase/client');
    const supabase = createBrowserClient();
    
    // Convert the embedding to a Postgres vector format
    const queryVector = `[${queryEmbedding.join(',')}]`;
    
    // Perform the similarity search using vector_cosine_ops
    const { data, error } = await supabase.rpc('search_brain_assets', {
      query_embedding: queryVector,
      similarity_threshold: threshold,
      match_count: limit
    });
    
    if (error) {
      throw new Error(`Search error: ${error.message}`);
    }
    
    return data;
    
  } catch (error) {
    console.error('Error searching for similar content:', error);
    return [];
  }
}

/**
 * Get related assets based on a query
 * 
 * @param query The search query
 * @param limit Maximum number of assets to return
 * @returns Array of related brain assets
 */
export async function getRelatedAssets(query: string, limit: number = 3) {
  try {
    const results = await searchSimilarContent(query, limit);
    
    // Extract unique asset IDs from results
    const assetIds = [...new Set(results.map(r => r.brain_asset_id))];
    
    // Fetch the full asset details
    const { createBrowserClient } = await import('@/utils/supabase/client');
    const supabase = createBrowserClient();
    
    const { data, error } = await supabase
      .from('brain_assets')
      .select('*')
      .in('id', assetIds);
    
    if (error) {
      throw new Error(`Asset retrieval error: ${error.message}`);
    }
    
    return data;
    
  } catch (error) {
    console.error('Error getting related assets:', error);
    return [];
  }
}
