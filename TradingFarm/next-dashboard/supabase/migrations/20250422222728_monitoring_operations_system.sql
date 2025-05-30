-- Monitoring & Operations System Migration
-- This migration adds tables for alerts, performance monitoring, and compliance reporting

-- Create types
DO $$ BEGIN
    CREATE TYPE alert_severity_enum AS ENUM ('info', 'warning', 'error', 'critical');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status_enum AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_category_enum AS ENUM ('system', 'trading', 'risk', 'account', 'performance', 'strategy', 'security', 'compliance');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_source_enum AS ENUM ('agent', 'exchange', 'risk_manager', 'strategy', 'system', 'user');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_status_enum AS ENUM ('pass', 'fail', 'warning', 'pending');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status_enum AS ENUM ('completed', 'pending', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status_enum AS ENUM ('valid', 'expired', 'pending');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE exception_severity_enum AS ENUM ('high', 'medium', 'low');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE exception_status_enum AS ENUM ('open', 'resolved', 'ignored');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Alerts System
-- Alerts table for storing system and trading notifications
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity alert_severity_enum NOT NULL DEFAULT 'info',
    category alert_category_enum NOT NULL DEFAULT 'system',
    source alert_source_enum NOT NULL DEFAULT 'system',
    status alert_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    related_entity_id TEXT,
    related_entity_type TEXT,
    action_required BOOLEAN DEFAULT FALSE,
    actions JSONB
);

-- Alert rules table for automated alert generation
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    conditions JSONB NOT NULL DEFAULT '[]',
    severity alert_severity_enum NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    action_required BOOLEAN DEFAULT FALSE,
    category alert_category_enum NOT NULL DEFAULT 'system',
    throttling_period INTEGER, -- in minutes
    cooldown_period INTEGER, -- in minutes
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert notification preferences
CREATE TABLE IF NOT EXISTS public.alert_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email BOOLEAN DEFAULT TRUE,
    push BOOLEAN DEFAULT TRUE,
    sms BOOLEAN DEFAULT FALSE,
    in_app BOOLEAN DEFAULT TRUE,
    min_severity alert_severity_enum DEFAULT 'warning',
    categories alert_category_enum[] DEFAULT '{system, trading, risk, security}'::alert_category_enum[],
    do_not_disturb_start TIME,
    do_not_disturb_end TIME,
    throttling_period INTEGER DEFAULT 60, -- in minutes
    disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance Monitoring
-- Trading accounts table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    exchange VARCHAR(255) NOT NULL,
    account_number VARCHAR(255),
    is_demo BOOLEAN DEFAULT FALSE,
    balance DECIMAL(18, 8) DEFAULT 0,
    equity DECIMAL(18, 8) DEFAULT 0,
    available DECIMAL(18, 8) DEFAULT 0,
    margin_used DECIMAL(18, 8) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'active',
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    equity DECIMAL(18, 8) NOT NULL,
    balance DECIMAL(18, 8) NOT NULL,
    deposits DECIMAL(18, 8) DEFAULT 0,
    withdrawals DECIMAL(18, 8) DEFAULT 0,
    profit_loss DECIMAL(18, 8) DEFAULT 0,
    profit_loss_percent DECIMAL(8, 4) DEFAULT 0,
    open_positions INTEGER DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    loss_count INTEGER DEFAULT 0,
    win_rate DECIMAL(8, 4) DEFAULT 0,
    avg_win DECIMAL(18, 8) DEFAULT 0,
    avg_loss DECIMAL(18, 8) DEFAULT 0,
    profit_factor DECIMAL(8, 4) DEFAULT 0,
    max_drawdown DECIMAL(18, 8) DEFAULT 0,
    max_drawdown_percent DECIMAL(8, 4) DEFAULT 0,
    sharpe_ratio DECIMAL(8, 4) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_id, date)
);

-- 3. Compliance & Reporting
-- Compliance checks table
CREATE TABLE IF NOT EXISTS public.compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    status compliance_status_enum NOT NULL DEFAULT 'pending',
    last_checked TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details TEXT,
    required_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance reports table
CREATE TABLE IF NOT EXISTS public.compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status report_status_enum NOT NULL DEFAULT 'pending',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    download_url TEXT,
    period VARCHAR(100) NOT NULL,
    size VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Regulatory documents table
CREATE TABLE IF NOT EXISTS public.regulatory_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status document_status_enum NOT NULL DEFAULT 'pending',
    download_url TEXT,
    size VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trade exceptions table
CREATE TABLE IF NOT EXISTS public.trade_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(100) NOT NULL,
    severity exception_severity_enum NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    status exception_status_enum NOT NULL DEFAULT 'open',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_exceptions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Alerts policies
CREATE POLICY "Users can view their own alerts" 
    ON public.alerts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts" 
    ON public.alerts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" 
    ON public.alerts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" 
    ON public.alerts FOR DELETE 
    USING (auth.uid() = user_id);

-- Alert rules policies
CREATE POLICY "Users can view their own alert rules" 
    ON public.alert_rules FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert rules" 
    ON public.alert_rules FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert rules" 
    ON public.alert_rules FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert rules" 
    ON public.alert_rules FOR DELETE 
    USING (auth.uid() = user_id);

-- Alert notification preferences policies
CREATE POLICY "Users can view their own notification preferences" 
    ON public.alert_notification_preferences FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences" 
    ON public.alert_notification_preferences FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
    ON public.alert_notification_preferences FOR UPDATE 
    USING (auth.uid() = user_id);

-- Trading accounts policies
CREATE POLICY "Users can view their own trading accounts" 
    ON public.trading_accounts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading accounts" 
    ON public.trading_accounts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading accounts" 
    ON public.trading_accounts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading accounts" 
    ON public.trading_accounts FOR DELETE 
    USING (auth.uid() = user_id);

-- Performance metrics policies
CREATE POLICY "Users can view their own performance metrics" 
    ON public.performance_metrics FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own performance metrics" 
    ON public.performance_metrics FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance metrics" 
    ON public.performance_metrics FOR UPDATE 
    USING (auth.uid() = user_id);

-- Compliance checks policies
CREATE POLICY "Users can view their own compliance checks" 
    ON public.compliance_checks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own compliance checks" 
    ON public.compliance_checks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance checks" 
    ON public.compliance_checks FOR UPDATE 
    USING (auth.uid() = user_id);

-- Compliance reports policies
CREATE POLICY "Users can view their own compliance reports" 
    ON public.compliance_reports FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own compliance reports" 
    ON public.compliance_reports FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance reports" 
    ON public.compliance_reports FOR UPDATE 
    USING (auth.uid() = user_id);

-- Regulatory documents policies
CREATE POLICY "Users can view their own regulatory documents" 
    ON public.regulatory_documents FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own regulatory documents" 
    ON public.regulatory_documents FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own regulatory documents" 
    ON public.regulatory_documents FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own regulatory documents" 
    ON public.regulatory_documents FOR DELETE 
    USING (auth.uid() = user_id);

-- Trade exceptions policies
CREATE POLICY "Users can view their own trade exceptions" 
    ON public.trade_exceptions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trade exceptions" 
    ON public.trade_exceptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade exceptions" 
    ON public.trade_exceptions FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create trigger functions
-- Create the timestamp handling functions if they don't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Run compliance checks function
CREATE OR REPLACE FUNCTION public.run_compliance_checks()
RETURNS TABLE (id UUID, status compliance_status_enum) AS $$
DECLARE
  v_user_id UUID;
  v_result RECORD;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- For each check, run the appropriate validation
  FOR v_result IN (
    SELECT c.id, c.category FROM public.compliance_checks c WHERE c.user_id = v_user_id
  ) LOOP
    -- Update check status based on category and validation logic
    -- This is a placeholder for actual validation logic
    UPDATE public.compliance_checks 
    SET 
      status = CASE 
        WHEN random() > 0.8 THEN 'fail'::compliance_status_enum
        WHEN random() > 0.5 THEN 'warning'::compliance_status_enum
        ELSE 'pass'::compliance_status_enum
      END,
      last_checked = NOW(),
      updated_at = NOW()
    WHERE id = v_result.id
    RETURNING id, status INTO id, status;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Generate compliance report function
CREATE OR REPLACE FUNCTION public.generate_compliance_report(
  p_report_type TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) 
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_report_id UUID;
  v_period TEXT;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Create period string
  v_period := to_char(p_start_date, 'YYYY-MM-DD') || ' to ' || to_char(p_end_date, 'YYYY-MM-DD');
  
  -- Insert new report record
  INSERT INTO public.compliance_reports (
    user_id,
    name,
    type,
    status,
    generated_at,
    period
  ) VALUES (
    v_user_id,
    p_report_type || ' Report - ' || v_period,
    p_report_type,
    'pending'::report_status_enum,
    NOW(),
    v_period
  ) RETURNING id INTO v_report_id;
  
  -- Simulate report generation (would be async in real implementation)
  PERFORM pg_sleep(2); -- Simulate work
  
  -- Update report status when complete
  UPDATE public.compliance_reports
  SET 
    status = 'completed'::report_status_enum,
    download_url = '/api/reports/' || v_report_id,
    size = CASE 
      WHEN random() > 0.7 THEN '1.2 MB'
      WHEN random() > 0.3 THEN '856 KB'
      ELSE '425 KB'
    END,
    updated_at = NOW()
  WHERE id = v_report_id;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Timestamp triggers
-- Create insert trigger for created_at on all tables
DROP TRIGGER IF EXISTS alerts_created_at ON public.alerts;
CREATE TRIGGER alerts_created_at BEFORE INSERT ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS alert_rules_created_at ON public.alert_rules;
CREATE TRIGGER alert_rules_created_at BEFORE INSERT ON public.alert_rules FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS alert_notification_preferences_created_at ON public.alert_notification_preferences;
CREATE TRIGGER alert_notification_preferences_created_at BEFORE INSERT ON public.alert_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS trading_accounts_created_at ON public.trading_accounts;
CREATE TRIGGER trading_accounts_created_at BEFORE INSERT ON public.trading_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS performance_metrics_created_at ON public.performance_metrics;
CREATE TRIGGER performance_metrics_created_at BEFORE INSERT ON public.performance_metrics FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS compliance_checks_created_at ON public.compliance_checks;
CREATE TRIGGER compliance_checks_created_at BEFORE INSERT ON public.compliance_checks FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS compliance_reports_created_at ON public.compliance_reports;
CREATE TRIGGER compliance_reports_created_at BEFORE INSERT ON public.compliance_reports FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS regulatory_documents_created_at ON public.regulatory_documents;
CREATE TRIGGER regulatory_documents_created_at BEFORE INSERT ON public.regulatory_documents FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS trade_exceptions_created_at ON public.trade_exceptions;
CREATE TRIGGER trade_exceptions_created_at BEFORE INSERT ON public.trade_exceptions FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

-- Create update trigger for updated_at on all tables
DROP TRIGGER IF EXISTS alerts_updated_at ON public.alerts;
CREATE TRIGGER alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS alert_rules_updated_at ON public.alert_rules;
CREATE TRIGGER alert_rules_updated_at BEFORE UPDATE ON public.alert_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS alert_notification_preferences_updated_at ON public.alert_notification_preferences;
CREATE TRIGGER alert_notification_preferences_updated_at BEFORE UPDATE ON public.alert_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trading_accounts_updated_at ON public.trading_accounts;
CREATE TRIGGER trading_accounts_updated_at BEFORE UPDATE ON public.trading_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS performance_metrics_updated_at ON public.performance_metrics;
CREATE TRIGGER performance_metrics_updated_at BEFORE UPDATE ON public.performance_metrics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS compliance_checks_updated_at ON public.compliance_checks;
CREATE TRIGGER compliance_checks_updated_at BEFORE UPDATE ON public.compliance_checks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS compliance_reports_updated_at ON public.compliance_reports;
CREATE TRIGGER compliance_reports_updated_at BEFORE UPDATE ON public.compliance_reports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS regulatory_documents_updated_at ON public.regulatory_documents;
CREATE TRIGGER regulatory_documents_updated_at BEFORE UPDATE ON public.regulatory_documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trade_exceptions_updated_at ON public.trade_exceptions;
CREATE TRIGGER trade_exceptions_updated_at BEFORE UPDATE ON public.trade_exceptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();