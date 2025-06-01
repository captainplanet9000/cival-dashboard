-- Migration: Agent and Farm Storage Integration
-- Creates tables for agent and farm storage and their relationship with the vault system

-- Create agent_storage table
CREATE TABLE IF NOT EXISTS public.agent_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  agent_id UUID NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'autonomous',
  capacity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  used_space DECIMAL(20, 8) NOT NULL DEFAULT 0,
  vault_account_id UUID REFERENCES public.vault_accounts(id),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create farm_storage table
CREATE TABLE IF NOT EXISTS public.farm_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  farm_id UUID NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'centralized',
  capacity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  used_space DECIMAL(20, 8) NOT NULL DEFAULT 0,
  reserved_space DECIMAL(20, 8) NOT NULL DEFAULT 0,
  vault_account_id UUID REFERENCES public.vault_accounts(id),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage_allocation table (tracks allocations of storage to agents or specific purposes)
CREATE TABLE IF NOT EXISTS public.storage_allocation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_id UUID NOT NULL,
  storage_type TEXT NOT NULL, -- 'agent_storage' or 'farm_storage'
  allocated_to_id UUID NOT NULL,
  allocated_to_type TEXT NOT NULL, -- 'agent', 'farm', 'strategy', etc.
  amount DECIMAL(20, 8) NOT NULL,
  purpose TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage_transaction table
CREATE TABLE IF NOT EXISTS public.storage_transaction (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL,
  source_type TEXT NOT NULL, -- 'agent_storage', 'farm_storage', 'external'
  destination_id UUID NOT NULL,
  destination_type TEXT NOT NULL, -- 'agent_storage', 'farm_storage', 'external'
  amount DECIMAL(20, 8) NOT NULL,
  transaction_type TEXT NOT NULL, -- 'allocation', 'deallocation', 'transfer', etc.
  status TEXT NOT NULL DEFAULT 'completed',
  description TEXT,
  vault_transaction_id UUID REFERENCES public.vault_transactions(id),
  metadata JSONB,
  initiated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table if not exists
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create farms table if not exists
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage_audit_log table
CREATE TABLE IF NOT EXISTS public.storage_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  storage_id UUID,
  storage_type TEXT,
  transaction_id UUID,
  user_id UUID,
  details JSONB,
  severity TEXT NOT NULL DEFAULT 'info',
  ip_address TEXT,
  user_agent TEXT
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_storage_updated_at') THEN
    CREATE TRIGGER set_agent_storage_updated_at
    BEFORE UPDATE ON public.agent_storage
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_farm_storage_updated_at') THEN
    CREATE TRIGGER set_farm_storage_updated_at
    BEFORE UPDATE ON public.farm_storage
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_storage_allocation_updated_at') THEN
    CREATE TRIGGER set_storage_allocation_updated_at
    BEFORE UPDATE ON public.storage_allocation
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_storage_transaction_updated_at') THEN
    CREATE TRIGGER set_storage_transaction_updated_at
    BEFORE UPDATE ON public.storage_transaction
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agents_updated_at') THEN
    CREATE TRIGGER set_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_farms_updated_at') THEN
    CREATE TRIGGER set_farms_updated_at
    BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_storage_agent_id ON public.agent_storage(agent_id);
CREATE INDEX IF NOT EXISTS idx_farm_storage_farm_id ON public.farm_storage(farm_id);
CREATE INDEX IF NOT EXISTS idx_storage_allocation_storage_id ON public.storage_allocation(storage_id, storage_type);
CREATE INDEX IF NOT EXISTS idx_storage_allocation_allocated_to ON public.storage_allocation(allocated_to_id, allocated_to_type);
CREATE INDEX IF NOT EXISTS idx_storage_transaction_source ON public.storage_transaction(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_storage_transaction_destination ON public.storage_transaction(destination_id, destination_type);
CREATE INDEX IF NOT EXISTS idx_storage_audit_log_storage ON public.storage_audit_log(storage_id, storage_type);
CREATE INDEX IF NOT EXISTS idx_storage_audit_log_transaction ON public.storage_audit_log(transaction_id);

-- Row-level security policies
ALTER TABLE public.agent_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Policy for agent_storage: users can view and modify their own agents' storage
CREATE POLICY agent_storage_user_policy ON public.agent_storage
  USING (agent_id IN (SELECT id FROM public.agents WHERE owner_id = auth.uid()));

-- Policy for farm_storage: users can view and modify their own farms' storage
CREATE POLICY farm_storage_user_policy ON public.farm_storage
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

-- Policy for storage_allocation: users can view and modify allocations for their agents/farms
CREATE POLICY storage_allocation_user_policy ON public.storage_allocation
  USING (
    (storage_type = 'agent_storage' AND storage_id IN (SELECT id FROM public.agent_storage WHERE agent_id IN (SELECT id FROM public.agents WHERE owner_id = auth.uid())))
    OR
    (storage_type = 'farm_storage' AND storage_id IN (SELECT id FROM public.farm_storage WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())))
  );

-- Policy for storage_transaction: users can view and create transactions for their storage
CREATE POLICY storage_transaction_user_policy ON public.storage_transaction
  USING (
    (source_type = 'agent_storage' AND source_id IN (SELECT id FROM public.agent_storage WHERE agent_id IN (SELECT id FROM public.agents WHERE owner_id = auth.uid())))
    OR
    (source_type = 'farm_storage' AND source_id IN (SELECT id FROM public.farm_storage WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())))
    OR
    (destination_type = 'agent_storage' AND destination_id IN (SELECT id FROM public.agent_storage WHERE agent_id IN (SELECT id FROM public.agents WHERE owner_id = auth.uid())))
    OR
    (destination_type = 'farm_storage' AND destination_id IN (SELECT id FROM public.farm_storage WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())))
  );

-- Policy for storage_audit_log: users can only view logs for their storage
CREATE POLICY storage_audit_log_user_policy ON public.storage_audit_log
  USING (
    (storage_type = 'agent_storage' AND storage_id IN (SELECT id FROM public.agent_storage WHERE agent_id IN (SELECT id FROM public.agents WHERE owner_id = auth.uid())))
    OR
    (storage_type = 'farm_storage' AND storage_id IN (SELECT id FROM public.farm_storage WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())))
  );

-- Policy for agents: users can view and modify their own agents
CREATE POLICY agents_user_policy ON public.agents
  USING (owner_id = auth.uid());

-- Policy for farms: users can view and modify their own farms
CREATE POLICY farms_user_policy ON public.farms
  USING (owner_id = auth.uid());

-- Functions for storage operations

-- Function to update storage capacity
CREATE OR REPLACE FUNCTION public.update_storage_capacity(
  p_storage_id UUID,
  p_storage_type TEXT,
  p_new_capacity DECIMAL(20, 8)
)
RETURNS VOID AS $$
BEGIN
  IF p_storage_type = 'agent_storage' THEN
    UPDATE public.agent_storage
    SET capacity = p_new_capacity
    WHERE id = p_storage_id;
  ELSIF p_storage_type = 'farm_storage' THEN
    UPDATE public.farm_storage
    SET capacity = p_new_capacity
    WHERE id = p_storage_id;
  ELSE
    RAISE EXCEPTION 'Invalid storage type: %', p_storage_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a storage allocation
CREATE OR REPLACE FUNCTION public.create_storage_allocation(
  p_storage_id UUID,
  p_storage_type TEXT,
  p_allocated_to_id UUID,
  p_allocated_to_type TEXT,
  p_amount DECIMAL(20, 8),
  p_purpose TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_available_space DECIMAL(20, 8);
  v_new_allocation_id UUID;
BEGIN
  -- Check available space
  IF p_storage_type = 'agent_storage' THEN
    SELECT capacity - used_space INTO v_available_space
    FROM public.agent_storage
    WHERE id = p_storage_id;
  ELSIF p_storage_type = 'farm_storage' THEN
    SELECT capacity - used_space - reserved_space INTO v_available_space
    FROM public.farm_storage
    WHERE id = p_storage_id;
  ELSE
    RAISE EXCEPTION 'Invalid storage type: %', p_storage_type;
  END IF;
  
  -- Verify sufficient space
  IF v_available_space < p_amount THEN
    RAISE EXCEPTION 'Insufficient storage space. Available: %, Requested: %', v_available_space, p_amount;
  END IF;
  
  -- Create allocation
  INSERT INTO public.storage_allocation(
    storage_id,
    storage_type,
    allocated_to_id,
    allocated_to_type,
    amount,
    purpose,
    start_date,
    end_date,
    metadata
  ) VALUES (
    p_storage_id,
    p_storage_type,
    p_allocated_to_id,
    p_allocated_to_type,
    p_amount,
    p_purpose,
    p_start_date,
    p_end_date,
    p_metadata
  ) RETURNING id INTO v_new_allocation_id;
  
  -- Update used space
  IF p_storage_type = 'agent_storage' THEN
    UPDATE public.agent_storage
    SET used_space = used_space + p_amount
    WHERE id = p_storage_id;
  ELSIF p_storage_type = 'farm_storage' THEN
    UPDATE public.farm_storage
    SET used_space = used_space + p_amount
    WHERE id = p_storage_id;
  END IF;
  
  RETURN v_new_allocation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update the status of a storage allocation
CREATE OR REPLACE FUNCTION public.update_storage_allocation_status(
  p_allocation_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  v_storage_id UUID;
  v_storage_type TEXT;
  v_amount DECIMAL(20, 8);
  v_current_is_active BOOLEAN;
BEGIN
  -- Get allocation details
  SELECT 
    storage_id, 
    storage_type, 
    amount, 
    is_active 
  INTO 
    v_storage_id, 
    v_storage_type, 
    v_amount, 
    v_current_is_active
  FROM public.storage_allocation
  WHERE id = p_allocation_id;
  
  -- Only proceed if the status is changing
  IF v_current_is_active IS DISTINCT FROM p_is_active THEN
    -- Update allocation status
    UPDATE public.storage_allocation
    SET 
      is_active = p_is_active,
      end_date = CASE WHEN p_is_active = false THEN now() ELSE end_date END
    WHERE id = p_allocation_id;
    
    -- Update storage usage
    IF p_is_active = false THEN
      -- Deactivating: free up space
      IF v_storage_type = 'agent_storage' THEN
        UPDATE public.agent_storage
        SET used_space = greatest(0, used_space - v_amount)
        WHERE id = v_storage_id;
      ELSIF v_storage_type = 'farm_storage' THEN
        UPDATE public.farm_storage
        SET used_space = greatest(0, used_space - v_amount)
        WHERE id = v_storage_id;
      END IF;
    ELSE
      -- Activating: allocate space
      IF v_storage_type = 'agent_storage' THEN
        UPDATE public.agent_storage
        SET used_space = used_space + v_amount
        WHERE id = v_storage_id;
      ELSIF v_storage_type = 'farm_storage' THEN
        UPDATE public.farm_storage
        SET used_space = used_space + v_amount
        WHERE id = v_storage_id;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 