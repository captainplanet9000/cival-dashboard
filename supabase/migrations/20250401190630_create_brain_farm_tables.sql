-- Create the pgvector extension for vector embeddings if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Brain tables for farm knowledge management
CREATE TABLE IF NOT EXISTS brain_documents (
  id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT REFERENCES farms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'pdf', 'tradingview', 'text', etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for brain commands and interactions
CREATE TABLE IF NOT EXISTS brain_commands (
  id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT REFERENCES farms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  response TEXT,
  category TEXT NOT NULL, -- 'command', 'query', 'analysis', 'alert'
  source TEXT NOT NULL, -- 'knowledge-base', 'market-data', 'strategy', 'system'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for agent memory records
CREATE TABLE IF NOT EXISTS agent_memory (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- 'conversation', 'document', 'knowledge', 'state'
  content TEXT NOT NULL,
  importance REAL DEFAULT 0.5, -- For memory priority
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for agent communication logs
CREATE TABLE IF NOT EXISTS agent_communications (
  id BIGSERIAL PRIMARY KEY,
  sender_agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
  receiver_agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'request', 'response', 'event', 'alert'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS brain_documents_embedding_idx 
ON brain_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx 
ON agent_memory 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE brain_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own farm brain documents"
ON brain_documents FOR SELECT
USING (
  farm_id IN (
    SELECT id FROM farms WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own farm brain documents"
ON brain_documents FOR INSERT
WITH CHECK (
  farm_id IN (
    SELECT id FROM farms WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own farm brain documents"
ON brain_documents FOR UPDATE
USING (
  farm_id IN (
    SELECT id FROM farms WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  farm_id IN (
    SELECT id FROM farms WHERE user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brain_documents_updated_at
BEFORE UPDATE ON brain_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER agent_memory_updated_at
BEFORE UPDATE ON agent_memory
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
