-- Migration: Knowledge Graph Tables for Trading Farm
-- Description: Creates tables for storing knowledge graph nodes and edges

-- Knowledge Graph Nodes Table
CREATE TABLE IF NOT EXISTS public.knowledge_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Graph Edges Table
CREATE TABLE IF NOT EXISTS public.knowledge_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source UUID NOT NULL REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
  target UUID NOT NULL REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying nodes by agent and type
CREATE INDEX IF NOT EXISTS idx_kg_nodes_agent_type ON public.knowledge_graph_nodes (agent_id, type);

-- Index for querying edges by agent and label
CREATE INDEX IF NOT EXISTS idx_kg_edges_agent_label ON public.knowledge_graph_edges (agent_id, label);

-- Index for source node lookups
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON public.knowledge_graph_edges (source);

-- Index for target node lookups
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON public.knowledge_graph_edges (target);

-- Trigger to update timestamp on node updates
CREATE OR REPLACE FUNCTION update_kg_node_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kg_node_timestamp
BEFORE UPDATE ON public.knowledge_graph_nodes
FOR EACH ROW
EXECUTE FUNCTION update_kg_node_timestamp();

-- Trigger to update timestamp on edge updates
CREATE OR REPLACE FUNCTION update_kg_edge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kg_edge_timestamp
BEFORE UPDATE ON public.knowledge_graph_edges
FOR EACH ROW
EXECUTE FUNCTION update_kg_edge_timestamp();

-- Enable Row Level Security
ALTER TABLE public.knowledge_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph_edges ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge graph nodes
CREATE POLICY "Users can view their own agent's knowledge graph nodes"
  ON public.knowledge_graph_nodes
  FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Users can insert knowledge graph nodes for their own agents"
  ON public.knowledge_graph_nodes
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can update their own agent's knowledge graph nodes"
  ON public.knowledge_graph_nodes
  FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Users can delete their own agent's knowledge graph nodes"
  ON public.knowledge_graph_nodes
  FOR DELETE
  USING (auth.uid() = agent_id);

-- Create policies for knowledge graph edges
CREATE POLICY "Users can view their own agent's knowledge graph edges"
  ON public.knowledge_graph_edges
  FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Users can insert knowledge graph edges for their own agents"
  ON public.knowledge_graph_edges
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can update their own agent's knowledge graph edges"
  ON public.knowledge_graph_edges
  FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Users can delete their own agent's knowledge graph edges"
  ON public.knowledge_graph_edges
  FOR DELETE
  USING (auth.uid() = agent_id); 