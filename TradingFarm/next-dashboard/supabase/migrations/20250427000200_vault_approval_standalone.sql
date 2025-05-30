-- Create the vault_approval_log table
CREATE TABLE IF NOT EXISTS public.vault_approval_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_transaction_id uuid NOT NULL,
    approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Triggers for created_at and updated_at
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.vault_approval_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy: allow approver to view and update their records
CREATE POLICY "Approver can view their approvals" ON public.vault_approval_log
    FOR SELECT USING (auth.uid() = approver_id);

CREATE POLICY "Approver can update their approvals" ON public.vault_approval_log
    FOR UPDATE USING (auth.uid() = approver_id);

-- Allow inserts by any authenticated user (customize as needed)
CREATE POLICY "Authenticated can insert approval log" ON public.vault_approval_log
    FOR INSERT WITH CHECK (auth.uid() = approver_id);
