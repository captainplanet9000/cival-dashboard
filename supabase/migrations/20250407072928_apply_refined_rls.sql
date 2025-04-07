-- Reinstating correct RLS policies after temporary simplification

-- == Policies from ...042326_farm_agent_integration.sql ==

-- RLS for agents (Using helper function)
DROP POLICY IF EXISTS "Users can view agents in their farms" ON public.agents;
CREATE POLICY "Users can view agents in their farms"
  ON public.agents FOR SELECT
  USING (public.is_farm_owner(agents.farm_id));

DROP POLICY IF EXISTS "Users can insert agents for their farms" ON public.agents;
CREATE POLICY "Users can insert agents for their farms"
  ON public.agents FOR INSERT;

DROP POLICY IF EXISTS "Users can update agents in their farms" ON public.agents;
CREATE POLICY "Users can update agents in their farms"
  ON public.agents FOR UPDATE
  USING (public.is_farm_owner(agents.farm_id));

DROP POLICY IF EXISTS "Users can delete agents in their farms" ON public.agents;
CREATE POLICY "Users can delete agents in their farms"
  ON public.agents FOR DELETE
  USING (public.is_farm_owner(agents.farm_id));

-- == Policies from ...042327_vault_system.sql ==

-- RLS policies for vaults (Using helper function)
DROP POLICY IF EXISTS "Users can view vaults in their farms" ON public.vaults;
CREATE POLICY "Users can view vaults in their farms" 
ON public.vaults FOR SELECT 
USING (public.is_farm_owner(vaults.farm_id));

DROP POLICY IF EXISTS "Users can insert vaults in their farms" ON public.vaults;
CREATE POLICY "Users can insert vaults in their farms" 
ON public.vaults FOR INSERT;

DROP POLICY IF EXISTS "Users can update vaults in their farms" ON public.vaults;
CREATE POLICY "Users can update vaults in their farms" 
ON public.vaults FOR UPDATE
USING (public.is_farm_owner(vaults.farm_id));

DROP POLICY IF EXISTS "Users can delete vaults in their farms" ON public.vaults;
CREATE POLICY "Users can delete vaults in their farms" 
ON public.vaults FOR DELETE
USING (public.is_farm_owner(vaults.farm_id));

-- RLS policies for vault_balances (Using helper function indirectly)
DROP POLICY IF EXISTS "Users can view vault_balances in their farms" ON public.vault_balances;
CREATE POLICY "Users can view vault_balances in their farms" 
ON public.vault_balances FOR SELECT 
USING (vault_id IN (SELECT v.id FROM public.vaults v WHERE public.is_farm_owner(v.farm_id)));

DROP POLICY IF EXISTS "Users can insert vault_balances in their farms" ON public.vault_balances;
CREATE POLICY "Users can insert vault_balances in their farms" 
ON public.vault_balances FOR INSERT;

DROP POLICY IF EXISTS "Users can update vault_balances in their farms" ON public.vault_balances;
CREATE POLICY "Users can update vault_balances in their farms" 
ON public.vault_balances FOR UPDATE
USING (vault_id IN (SELECT v.id FROM public.vaults v WHERE public.is_farm_owner(v.farm_id)));

-- RLS policies for linked_accounts (Using helper function)
DROP POLICY IF EXISTS "Users can view linked_accounts in their farms" ON public.linked_accounts;
CREATE POLICY "Users can view linked_accounts in their farms" 
ON public.linked_accounts FOR SELECT 
USING (public.is_farm_owner(linked_accounts.farm_id));

DROP POLICY IF EXISTS "Users can insert linked_accounts in their farms" ON public.linked_accounts;
CREATE POLICY "Users can insert linked_accounts in their farms" 
ON public.linked_accounts FOR INSERT;

DROP POLICY IF EXISTS "Users can update linked_accounts in their farms" ON public.linked_accounts;
CREATE POLICY "Users can update linked_accounts in their farms" 
ON public.linked_accounts FOR UPDATE
USING (public.is_farm_owner(linked_accounts.farm_id));

DROP POLICY IF EXISTS "Users can delete linked_accounts in their farms" ON public.linked_accounts;
CREATE POLICY "Users can delete linked_accounts in their farms"
ON public.linked_accounts FOR DELETE
USING (public.is_farm_owner(linked_accounts.farm_id));

-- RLS policies for transaction_logs (Using helper function)
DROP POLICY IF EXISTS "Users can view transaction_logs in their farms" ON public.transaction_logs;
CREATE POLICY "Users can view transaction_logs in their farms" 
ON public.transaction_logs FOR SELECT 
USING (public.is_farm_owner(transaction_logs.farm_id));

DROP POLICY IF EXISTS "Users can insert transaction_logs in their farms" ON public.transaction_logs;
CREATE POLICY "Users can insert transaction_logs in their farms" 
ON public.transaction_logs FOR INSERT;

DROP POLICY IF EXISTS "Allow service role full access to transaction logs" ON public.transaction_logs;
CREATE POLICY "Allow service role full access to transaction logs" 
ON public.transaction_logs FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- == Policies from ...042328_brain_knowledge_management.sql ==

-- RLS policies for brains (Using helper function)
DROP POLICY IF EXISTS "Users can view brains in their farms" ON public.brains;
CREATE POLICY "Users can view brains in their farms" 
ON public.brains FOR SELECT 
USING (public.is_farm_owner(brains.farm_id));

DROP POLICY IF EXISTS "Users can insert brains in their farms" ON public.brains;
CREATE POLICY "Users can insert brains in their farms" 
ON public.brains FOR INSERT;

DROP POLICY IF EXISTS "Users can update brains in their farms" ON public.brains;
CREATE POLICY "Users can update brains in their farms" 
ON public.brains FOR UPDATE
USING (public.is_farm_owner(brains.farm_id));

DROP POLICY IF EXISTS "Users can delete brains in their farms" ON public.brains;
CREATE POLICY "Users can delete brains in their farms" 
ON public.brains FOR DELETE
USING (public.is_farm_owner(brains.farm_id));

-- RLS policies for brain_documents (Using helper function indirectly)
DROP POLICY IF EXISTS "Users can view brain_documents in their farms" ON public.brain_documents;
CREATE POLICY "Users can view brain_documents in their farms" 
ON public.brain_documents FOR SELECT 
USING (brain_id IN (SELECT b.id FROM public.brains b WHERE public.is_farm_owner(b.farm_id)));

DROP POLICY IF EXISTS "Users can insert brain_documents in their farms" ON public.brain_documents;
CREATE POLICY "Users can insert brain_documents in their farms" 
ON public.brain_documents FOR INSERT;

DROP POLICY IF EXISTS "Users can update brain_documents in their farms" ON public.brain_documents;
CREATE POLICY "Users can update brain_documents in their farms" 
ON public.brain_documents FOR UPDATE
USING (brain_id IN (SELECT b.id FROM public.brains b WHERE public.is_farm_owner(b.farm_id)));

DROP POLICY IF EXISTS "Users can delete brain_documents in their farms" ON public.brain_documents;
CREATE POLICY "Users can delete brain_documents in their farms" 
ON public.brain_documents FOR DELETE
USING (brain_id IN (SELECT b.id FROM public.brains b WHERE public.is_farm_owner(b.farm_id)));

-- RLS policies for document_chunks (Using helper function indirectly)
DROP POLICY IF EXISTS "Users can view document_chunks in their farms" ON public.document_chunks;
CREATE POLICY "Users can view document_chunks in their farms" 
ON public.document_chunks FOR SELECT 
USING (document_id IN (SELECT bd.id FROM public.brain_documents bd JOIN public.brains b ON bd.brain_id = b.id WHERE public.is_farm_owner(b.farm_id)));

DROP POLICY IF EXISTS "Users can insert document_chunks in their farms" ON public.document_chunks;
CREATE POLICY "Users can insert document_chunks in their farms" 
ON public.document_chunks FOR INSERT;

DROP POLICY IF EXISTS "Users can update document_chunks in their farms" ON public.document_chunks;
CREATE POLICY "Users can update document_chunks in their farms" 
ON public.document_chunks FOR UPDATE
USING (document_id IN (SELECT bd.id FROM public.brain_documents bd JOIN public.brains b ON bd.brain_id = b.id WHERE public.is_farm_owner(b.farm_id)));

DROP POLICY IF EXISTS "Users can delete document_chunks in their farms" ON public.document_chunks;
CREATE POLICY "Users can delete document_chunks in their farms" 
ON public.document_chunks FOR DELETE
USING (document_id IN (SELECT bd.id FROM public.brain_documents bd JOIN public.brains b ON bd.brain_id = b.id WHERE public.is_farm_owner(b.farm_id)));

-- == Policies from ...035733_create_agent_capabilities_table.sql ==
-- Note: These depend on manager_agents and worker_agents tables existing and potentially farm_members.

DROP POLICY IF EXISTS select_agent_capabilities_for_farm ON public.agent_capabilities;
CREATE POLICY select_agent_capabilities_for_farm ON public.agent_capabilities
    FOR SELECT
    USING (
        -- Check if agent is a worker agent associated with the user's farm members
        agent_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            WHERE public.is_farm_owner(ma.farm_id)
        )
        OR
        -- Check if agent is a manager agent associated with the user's farm members
        agent_id IN (
            SELECT ma.id FROM public.manager_agents ma
            WHERE public.is_farm_owner(ma.farm_id)
        )
    );

DROP POLICY IF EXISTS manage_agent_capabilities_for_system ON public.agent_capabilities;
CREATE POLICY manage_agent_capabilities_for_system ON public.agent_capabilities
    FOR ALL
    USING (
        -- Check if user owns the farm the worker agent belongs to
        agent_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            WHERE public.is_farm_owner(ma.farm_id)
        )
        OR
        -- Check if user owns the farm the manager agent belongs to
        agent_id IN (
            SELECT ma.id FROM public.manager_agents ma
            WHERE public.is_farm_owner(ma.farm_id)
        )
    );

-- == Policies from ...045424_autonomy_config_setup.sql ==
-- Removed as autonomy_config table does not have farm_id
-- The original policies from the table creation migration will be used instead.
