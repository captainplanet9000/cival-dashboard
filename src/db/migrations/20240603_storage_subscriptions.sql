-- Migration: Storage Subscription Tables
-- Creates tables for tracking storage subscriptions and payment history

-- Create storage_subscriptions table
CREATE TABLE IF NOT EXISTS public.storage_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  allocation_id UUID NOT NULL REFERENCES public.storage_allocation(id) ON DELETE CASCADE,
  vault_account_id UUID NOT NULL REFERENCES public.vault_accounts(id),
  amount_per_period DECIMAL(20, 8) NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage_payment_history table
CREATE TABLE IF NOT EXISTS public.storage_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES public.storage_subscriptions(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.vault_transactions(id),
  amount DECIMAL(20, 8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  payment_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at on storage_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_storage_subscriptions_updated_at') THEN
    CREATE TRIGGER set_storage_subscriptions_updated_at
    BEFORE UPDATE ON public.storage_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create trigger for updated_at on storage_payment_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_storage_payment_history_updated_at') THEN
    CREATE TRIGGER set_storage_payment_history_updated_at
    BEFORE UPDATE ON public.storage_payment_history
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_subscriptions_allocation_id ON public.storage_subscriptions(allocation_id);
CREATE INDEX IF NOT EXISTS idx_storage_subscriptions_vault_account_id ON public.storage_subscriptions(vault_account_id);
CREATE INDEX IF NOT EXISTS idx_storage_subscriptions_next_payment_date ON public.storage_subscriptions(next_payment_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_storage_payment_history_subscription_id ON public.storage_payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_storage_payment_history_transaction_id ON public.storage_payment_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_storage_payment_history_status ON public.storage_payment_history(status);

-- Enable Row Level Security
ALTER TABLE public.storage_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_payment_history ENABLE ROW LEVEL SECURITY;

-- Policies for storage_subscriptions
CREATE POLICY storage_subscriptions_user_policy ON public.storage_subscriptions
  USING (
    vault_account_id IN (
      SELECT va.id FROM public.vault_accounts va
      JOIN public.vault_master vm ON va.master_id = vm.id
      WHERE vm.owner_id = auth.uid()
    )
  );

-- Policies for storage_payment_history
CREATE POLICY storage_payment_history_user_policy ON public.storage_payment_history
  USING (
    subscription_id IN (
      SELECT s.id FROM public.storage_subscriptions s
      JOIN public.vault_accounts va ON s.vault_account_id = va.id
      JOIN public.vault_master vm ON va.master_id = vm.id
      WHERE vm.owner_id = auth.uid()
    )
  );

-- Function to cancel all subscriptions for an allocation
CREATE OR REPLACE FUNCTION public.cancel_allocation_subscriptions(
  p_allocation_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.storage_subscriptions
  SET 
    is_active = false,
    end_date = now()
  WHERE allocation_id = p_allocation_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription renewal metrics
CREATE OR REPLACE FUNCTION public.get_subscription_metrics(
  p_user_id UUID,
  p_period TEXT DEFAULT 'monthly'
)
RETURNS TABLE (
  total_active_subscriptions INTEGER,
  total_monthly_cost DECIMAL(20, 8),
  upcoming_renewals INTEGER,
  active_subscriptions_by_entity JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH active_subs AS (
    SELECT 
      s.*,
      sa.allocated_to_id,
      sa.allocated_to_type
    FROM public.storage_subscriptions s
    JOIN public.storage_allocation sa ON s.allocation_id = sa.id
    JOIN public.vault_accounts va ON s.vault_account_id = va.id
    JOIN public.vault_master vm ON va.master_id = vm.id
    WHERE vm.owner_id = p_user_id
    AND s.is_active = true
    AND s.period = p_period
  ),
  entity_counts AS (
    SELECT 
      allocated_to_type, 
      COUNT(*) as count, 
      SUM(amount_per_period) as total_cost
    FROM active_subs
    GROUP BY allocated_to_type
  )
  SELECT
    COUNT(*)::INTEGER as total_active_subscriptions,
    COALESCE(SUM(amount_per_period), 0) as total_monthly_cost,
    COUNT(*) FILTER (WHERE next_payment_date <= now() + interval '7 days')::INTEGER as upcoming_renewals,
    COALESCE(
      jsonb_object_agg(
        entity_counts.allocated_to_type, 
        jsonb_build_object(
          'count', entity_counts.count,
          'cost', entity_counts.total_cost
        )
      ),
      '{}'::jsonb
    ) as active_subscriptions_by_entity
  FROM active_subs
  LEFT JOIN entity_counts ON true
  GROUP BY entity_counts.allocated_to_type, entity_counts.count, entity_counts.total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 