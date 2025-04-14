-- Migration for ElizaOS Knowledge Management System
-- Creates tables for knowledge documents, chunks, and permissions

-- Create tables for knowledge management
CREATE TABLE public.elizaos_knowledge_documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    content text NOT NULL,
    document_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    source text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    farm_id int REFERENCES public.farms(id) ON DELETE CASCADE,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create table for document chunks and embeddings
CREATE TABLE public.elizaos_knowledge_chunks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES public.elizaos_knowledge_documents(id) ON DELETE CASCADE,
    content text NOT NULL,
    chunk_index int NOT NULL,
    embedding vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (document_id, chunk_index)
);

-- Create table for document permissions
CREATE TABLE public.elizaos_knowledge_permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES public.elizaos_knowledge_documents(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id uuid REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
    farm_id int REFERENCES public.farms(id) ON DELETE CASCADE,
    permission_level text NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_permission_entity_required CHECK (
        (user_id IS NOT NULL)::integer +
        (agent_id IS NOT NULL)::integer +
        (farm_id IS NOT NULL)::integer = 1
    )
);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_documents_farm_id ON public.elizaos_knowledge_documents(farm_id);
CREATE INDEX idx_knowledge_documents_created_by ON public.elizaos_knowledge_documents(created_by);
CREATE INDEX idx_knowledge_documents_is_public ON public.elizaos_knowledge_documents(is_public);
CREATE INDEX idx_knowledge_chunks_document_id ON public.elizaos_knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_permissions_document_id ON public.elizaos_knowledge_permissions(document_id);
CREATE INDEX idx_knowledge_permissions_user_id ON public.elizaos_knowledge_permissions(user_id);
CREATE INDEX idx_knowledge_permissions_agent_id ON public.elizaos_knowledge_permissions(agent_id);
CREATE INDEX idx_knowledge_permissions_farm_id ON public.elizaos_knowledge_permissions(farm_id);

-- Add vector index for embeddings (requires pgvector extension)
CREATE INDEX idx_knowledge_chunks_embedding ON public.elizaos_knowledge_chunks USING ivfflat (embedding vector_cosine_ops);

-- Create trigger function for handling timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for elizaos_knowledge_documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_elizaos_knowledge_documents_updated_at'
    ) THEN
        CREATE TRIGGER set_elizaos_knowledge_documents_updated_at
        BEFORE UPDATE ON public.elizaos_knowledge_documents
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- Create trigger for elizaos_knowledge_chunks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_elizaos_knowledge_chunks_updated_at'
    ) THEN
        CREATE TRIGGER set_elizaos_knowledge_chunks_updated_at
        BEFORE UPDATE ON public.elizaos_knowledge_chunks
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- Create trigger for elizaos_knowledge_permissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_elizaos_knowledge_permissions_updated_at'
    ) THEN
        CREATE TRIGGER set_elizaos_knowledge_permissions_updated_at
        BEFORE UPDATE ON public.elizaos_knowledge_permissions
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE public.elizaos_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elizaos_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elizaos_knowledge_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge documents
CREATE POLICY "Users can view their own documents"
    ON public.elizaos_knowledge_documents
    FOR SELECT
    USING (
        auth.uid() = created_by OR 
        is_public = true OR
        farm_id IN (
            SELECT farm_id FROM public.farm_members 
            WHERE user_id = auth.uid()
        ) OR
        id IN (
            SELECT document_id FROM public.elizaos_knowledge_permissions
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own documents"
    ON public.elizaos_knowledge_documents
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own documents"
    ON public.elizaos_knowledge_documents
    FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own documents"
    ON public.elizaos_knowledge_documents
    FOR DELETE
    USING (auth.uid() = created_by);

-- RLS Policies for knowledge chunks
CREATE POLICY "Users can view chunks of accessible documents"
    ON public.elizaos_knowledge_chunks
    FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE 
                created_by = auth.uid() OR
                is_public = true OR
                farm_id IN (
                    SELECT farm_id FROM public.farm_members 
                    WHERE user_id = auth.uid()
                ) OR
                id IN (
                    SELECT document_id FROM public.elizaos_knowledge_permissions
                    WHERE user_id = auth.uid()
                )
        )
    );

CREATE POLICY "Users can insert chunks for their own documents"
    ON public.elizaos_knowledge_chunks
    FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update chunks for their own documents"
    ON public.elizaos_knowledge_chunks
    FOR UPDATE
    USING (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete chunks for their own documents"
    ON public.elizaos_knowledge_chunks
    FOR DELETE
    USING (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE created_by = auth.uid()
        )
    );

-- RLS Policies for knowledge permissions
CREATE POLICY "Users can view permissions for their own documents"
    ON public.elizaos_knowledge_permissions
    FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE created_by = auth.uid()
        ) OR
        user_id = auth.uid()
    );

CREATE POLICY "Users can insert permissions for their own documents"
    ON public.elizaos_knowledge_permissions
    FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update permissions for their own documents"
    ON public.elizaos_knowledge_permissions
    FOR UPDATE
    USING (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete permissions for their own documents"
    ON public.elizaos_knowledge_permissions
    FOR DELETE
    USING (
        document_id IN (
            SELECT id FROM public.elizaos_knowledge_documents
            WHERE created_by = auth.uid()
        )
    );
