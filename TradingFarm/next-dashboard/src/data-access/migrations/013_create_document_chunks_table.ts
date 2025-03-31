import { SupabaseClientFactory, getSupabaseClient } from '../../lib/supabase-client';

/**
 * Migration to create document_chunks table with pgvector extension for FARMDOCS storage
 */
async function createDocumentChunksTable() {
  console.log('Creating document_chunks table with pgvector extension...');
  
  // Initialize the Supabase client
  const client = getSupabaseClient();
  
  try {
    // Step 1: Enable pgvector extension if not already enabled
    console.log('\n----- Enabling pgvector extension -----');
    const enablePgVectorSQL = `
      CREATE EXTENSION IF NOT EXISTS vector;
    `;
    
    // Step 2: Create document_chunks table
    console.log('\n----- Creating document_chunks table -----');
    const createDocumentChunksSQL = `
      CREATE TABLE IF NOT EXISTS public.document_chunks (
        id UUID PRIMARY KEY,
        document_id UUID NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
      
      -- Create GIN index on metadata for faster JSON querying
      CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata ON public.document_chunks USING GIN (metadata);
      
      -- Create vector index for similarity search (ivfflat is better for larger datasets)
      CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks 
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `;
    
    // Step 3: Create search function for similarity search
    console.log('\n----- Creating search function -----');
    const createSearchFunctionSQL = `
      CREATE OR REPLACE FUNCTION search_document_chunks(
        query_embedding vector(1536),
        match_threshold float DEFAULT 0.7,
        match_count int DEFAULT 5
      )
      RETURNS TABLE (
        id UUID,
        document_id UUID,
        content TEXT,
        metadata JSONB,
        similarity float
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          document_chunks.id,
          document_chunks.document_id,
          document_chunks.content,
          document_chunks.metadata,
          1 - (document_chunks.embedding <=> query_embedding) AS similarity
        FROM document_chunks
        WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
        ORDER BY similarity DESC
        LIMIT match_count;
      END;
      $$;
    `;
    
    // Execute SQL statements
    const { error: error1 } = await client.rpc('execute_sql', { sql: enablePgVectorSQL });
    if (error1) {
      console.error('Error enabling pgvector extension:', error1);
    } else {
      console.log('Successfully enabled pgvector extension');
    }
    
    const { error: error2 } = await client.rpc('execute_sql', { sql: createDocumentChunksSQL });
    if (error2) {
      console.error('Error creating document_chunks table:', error2);
    } else {
      console.log('Successfully created document_chunks table');
    }
    
    const { error: error3 } = await client.rpc('execute_sql', { sql: createSearchFunctionSQL });
    if (error3) {
      console.error('Error creating search function:', error3);
    } else {
      console.log('Successfully created search function');
    }
    
    console.log('\n----- Migration completed successfully -----');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
createDocumentChunksTable()
  .then(() => {
    console.log('Document chunks table setup completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running migration:', error);
    process.exit(1);
  });

export default createDocumentChunksTable; 