-- Create specialization_patterns table
CREATE TABLE public.specialization_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Use the vector type from the extensions schema
    vector_embedding extensions.vector(1536), -- Adjust vector dimensions (e.g., 1536 for OpenAI) as needed
    specialization_details JSONB NOT NULL,
    success_metrics JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.specialization_patterns IS 'Stores patterns of successful worker specializations, including vector embeddings for similarity search.';
COMMENT ON COLUMN public.specialization_patterns.vector_embedding IS 'Vector representation of the pattern for similarity searches.';
COMMENT ON COLUMN public.specialization_patterns.specialization_details IS 'Details of the specialization applied in this pattern.';
COMMENT ON COLUMN public.specialization_patterns.success_metrics IS 'Metrics indicating the success achieved with this pattern.';
COMMENT ON COLUMN public.specialization_patterns.usage_count IS 'How many times this pattern has been successfully applied.';
COMMENT ON COLUMN public.specialization_patterns.created_at IS 'Timestamp when the pattern was first recorded.';
COMMENT ON COLUMN public.specialization_patterns.updated_at IS 'Timestamp when the pattern was last updated.';

-- Create an index for the vector column (e.g., HNSW or IVFFlat) - Requires pgvector
-- Choose index type based on your data size and query needs.
-- Example using HNSW (good for high-dimensional data and recall):
CREATE INDEX idx_specialization_patterns_vector_hnsw
ON public.specialization_patterns
USING hnsw (vector_embedding extensions.vector_l2_ops); -- Use vector_l2_ops for L2 distance, vector_ip_ops for inner product, or vector_cosine_ops for cosine distance

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
