-- supabase/migrations/YYYYMMDDHHMMSS_enable_vector_pgcrypto_extensions.sql

-- Enable pgvector extension for vector similarity search (used by MemGPT with Postgres)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for functions like uuid_generate_v4(), if not already enabled
-- Supabase often enables this by default, but good to ensure for some DB functions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Note: MemGPT will manage its own specific tables for memory storage
-- (e.g., memgpt_agent_recall_memory, memgpt_agent_archival_memory)
-- when configured to use PostgreSQL for persistence.
-- No need to manually create an 'agent_memories' table for PyMemGPT itself.
-- If a custom memory storage solution *alongside* or *instead of* MemGPT's internal
-- storage was required, then a custom table would be needed. For this task,
-- we rely on MemGPT's native Postgres persistence.
-- The trigger_set_timestamp function was already created in the previous migration.
-- If it's needed by MemGPT's own tables, MemGPT's setup would handle it or use its own.
-- If we were creating a custom table that needed it, we'd add the trigger here.
-- Since we are not creating a custom table for MemGPT, no trigger setup here.
