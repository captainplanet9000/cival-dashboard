-- Create specialization_patterns table
CREATE TABLE public.specialization_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialization_id UUID NOT NULL REFERENCES public.worker_specializations(worker_id) ON DELETE CASCADE,
    pattern_name TEXT NOT NULL,
    pattern_description TEXT,
    vector_embedding vector(1536), -- Adjust vector dimensions (e.g., 1536 for OpenAI) as needed
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(specialization_id, pattern_name)
);

-- Add comments
COMMENT ON TABLE public.specialization_patterns IS 'Stores reusable patterns associated with worker specializations.';
COMMENT ON COLUMN public.specialization_patterns.specialization_id IS 'The specialization this pattern is associated with.';
COMMENT ON COLUMN public.specialization_patterns.pattern_name IS 'A unique name for the pattern within the specialization.';
COMMENT ON COLUMN public.specialization_patterns.pattern_description IS 'A description of what the pattern represents.';
COMMENT ON COLUMN public.specialization_patterns.vector_embedding IS 'Vector embedding representing the pattern.';
COMMENT ON COLUMN public.specialization_patterns.metadata IS 'Additional metadata for the pattern.';
COMMENT ON COLUMN public.specialization_patterns.created_at IS 'Timestamp when the pattern was created.';
COMMENT ON COLUMN public.specialization_patterns.updated_at IS 'Timestamp when the pattern was last updated.';

-- Create an index for the vector column (e.g., HNSW or IVFFlat) - Requires pgvector
-- Choose index type based on your data size and query needs.
-- Example using HNSW (good for high-dimensional data and recall):
CREATE INDEX idx_specialization_patterns_vector_hnsw
ON public.specialization_patterns
USING hnsw (vector_embedding vector_l2_ops); -- Use vector_l2_ops for L2 distance, vector_ip_ops for inner product, or vector_cosine_ops for cosine distance

-- Enable Row Level Security
ALTER TABLE public.specialization_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow read access for relevant system roles or authenticated users
CREATE POLICY select_specialization_patterns ON public.specialization_patterns
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role'); -- Adjust based on who needs read access

-- Policy: Allow system roles (e.g., specialization service) to manage patterns
CREATE POLICY manage_specialization_patterns_for_system ON public.specialization_patterns
    FOR ALL
    USING (auth.role() = 'service_role') -- Restrict modification to service roles
    WITH CHECK (auth.role() = 'service_role');

-- Setup automatic timestamp updates
CREATE TRIGGER handle_specialization_patterns_updated_at
BEFORE UPDATE ON public.specialization_patterns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
