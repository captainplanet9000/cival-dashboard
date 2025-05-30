-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_embeddings table
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a function to handle created_at
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for created_at and updated_at
CREATE TRIGGER set_knowledge_embeddings_created_at
BEFORE INSERT ON knowledge_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_knowledge_embeddings_updated_at
BEFORE UPDATE ON knowledge_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create an index for similarity search
CREATE INDEX knowledge_embeddings_embedding_idx ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add vector embeddings to strategy table
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- Add vector embeddings to trading_executions table
ALTER TABLE trading_executions ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);
