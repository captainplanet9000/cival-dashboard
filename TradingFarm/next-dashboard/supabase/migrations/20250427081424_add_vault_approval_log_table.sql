-- 1. Create the vault_approval_log table
CREATE TABLE public.vault_approval_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_transaction_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- 2. Foreign keys (assuming vault_transactions and users tables exist)
ALTER TABLE public.vault_approval_log
    ADD CONSTRAINT fk_vault_transaction FOREIGN KEY (vault_transaction_id) REFERENCES public.vault_transactions(id) ON DELETE CASCADE;
ALTER TABLE public.vault_approval_log
    ADD CONSTRAINT fk_approver FOREIGN KEY (approver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Triggers for created_at and updated_at
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = COALESCE(NEW.created_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_created_at_vault_approval_log ON public.vault_approval_log;
CREATE TRIGGER set_created_at_vault_approval_log
    BEFORE INSERT ON public.vault_approval_log
    FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS set_updated_at_vault_approval_log ON public.vault_approval_log;
CREATE TRIGGER set_updated_at_vault_approval_log
    BEFORE UPDATE ON public.vault_approval_log
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.vault_approval_log ENABLE ROW LEVEL SECURITY;

-- 5. Add basic RLS policy: allow approver to view and update their records
CREATE POLICY "Approver can view their approvals" ON public.vault_approval_log
    FOR SELECT USING (auth.uid() = approver_id);

CREATE POLICY "Approver can update their approvals" ON public.vault_approval_log
    FOR UPDATE USING (auth.uid() = approver_id);

-- 6. Allow inserts by any authenticated user (customize as needed)
CREATE POLICY "Authenticated can insert approval log" ON public.vault_approval_log
    FOR INSERT WITH CHECK (auth.uid() = approver_id);

-- 7. (Optional) Allow delete by admin or owner (customize as needed)
-- CREATE POLICY "Approver can delete their approvals" ON public.vault_approval_log
--     FOR DELETE USING (auth.uid() = approver_id);
