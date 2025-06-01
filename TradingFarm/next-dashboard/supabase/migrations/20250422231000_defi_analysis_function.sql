-- Migration: DeFi Analysis Function
-- This migration adds a PostgreSQL function for analyzing DeFi protocols and activities

-- Create enum for DeFi protocol categories
DO $$ BEGIN
    CREATE TYPE defi_protocol_category_enum AS ENUM ('lending', 'dex', 'yield', 'derivatives', 'bridges', 'payments', 'insurance', 'staking', 'aggregator', 'other');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for DeFi protocol risk levels
DO $$ BEGIN
    CREATE TYPE defi_risk_level_enum AS ENUM ('low', 'medium', 'high', 'very_high');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create table for storing cached DeFi protocol metadata
CREATE TABLE IF NOT EXISTS public.defi_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category defi_protocol_category_enum NOT NULL,
    risk_level defi_risk_level_enum NOT NULL,
    tvl DECIMAL(24, 8),
    chains TEXT[],
    tokens TEXT[],
    audit_status BOOLEAN,
    audit_links TEXT[],
    website VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for user DeFi position history
CREATE TABLE IF NOT EXISTS public.user_defi_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    protocol_id VARCHAR(100) NOT NULL REFERENCES public.defi_protocols(protocol_id),
    position_type VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    asset_address VARCHAR(255),
    asset_symbol VARCHAR(50),
    amount DECIMAL(24, 8),
    usd_value DECIMAL(24, 8),
    apy DECIMAL(10, 4),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.defi_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_defi_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for defi_protocols (public read, admin write)
CREATE POLICY "Anyone can view DeFi protocols" 
    ON public.defi_protocols FOR SELECT 
    USING (true);

CREATE POLICY "Only admins can modify DeFi protocols" 
    ON public.defi_protocols FOR ALL 
    USING (auth.uid() IN (SELECT id FROM auth.users WHERE role = 'admin'));

-- RLS policies for user_defi_positions
CREATE POLICY "Users can view their own DeFi positions" 
    ON public.user_defi_positions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DeFi positions" 
    ON public.user_defi_positions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DeFi positions" 
    ON public.user_defi_positions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own DeFi positions" 
    ON public.user_defi_positions FOR DELETE 
    USING (auth.uid() = user_id);

-- Create DeFi analysis function
CREATE OR REPLACE FUNCTION public.get_defi_analysis(
    p_user_id UUID DEFAULT NULL,
    p_protocol_ids TEXT[] DEFAULT NULL,
    p_chains TEXT[] DEFAULT NULL,
    p_categories defi_protocol_category_enum[] DEFAULT NULL,
    p_risk_level_max defi_risk_level_enum DEFAULT 'very_high',
    p_include_positions BOOLEAN DEFAULT TRUE,
    p_date_range_start TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
    p_date_range_end TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
    v_protocols JSONB;
    v_positions JSONB;
    v_metrics JSONB;
    v_risk_assessment JSONB;
BEGIN
    -- Set user_id to the authenticated user if not specified
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Check if user has permission to view data
    IF v_user_id IS NULL OR (v_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'admin'
    )) THEN
        RAISE EXCEPTION 'Permission denied: Cannot access DeFi data for this user';
    END IF;

    -- Get filtered protocols
    SELECT jsonb_agg(jsonb_build_object(
        'id', dp.id,
        'protocol_id', dp.protocol_id,
        'name', dp.name,
        'category', dp.category,
        'risk_level', dp.risk_level,
        'tvl', dp.tvl,
        'chains', dp.chains,
        'tokens', dp.tokens,
        'audit_status', dp.audit_status,
        'description', dp.description
    ))
    INTO v_protocols
    FROM public.defi_protocols dp
    WHERE (p_protocol_ids IS NULL OR dp.protocol_id = ANY(p_protocol_ids))
    AND (p_chains IS NULL OR dp.chains && p_chains)
    AND (p_categories IS NULL OR dp.category = ANY(p_categories))
    AND (
        CASE 
            WHEN p_risk_level_max = 'low' THEN dp.risk_level = 'low'
            WHEN p_risk_level_max = 'medium' THEN dp.risk_level IN ('low', 'medium')
            WHEN p_risk_level_max = 'high' THEN dp.risk_level IN ('low', 'medium', 'high')
            ELSE TRUE -- 'very_high' includes all risk levels
        END
    );
    
    -- Initialize empty array if null
    IF v_protocols IS NULL THEN
        v_protocols := '[]'::JSONB;
    END IF;

    -- Get user positions if requested
    IF p_include_positions AND v_user_id IS NOT NULL THEN
        SELECT jsonb_agg(jsonb_build_object(
            'id', udp.id,
            'protocol_id', udp.protocol_id,
            'protocol_name', dp.name,
            'position_type', udp.position_type,
            'chain', udp.chain,
            'asset_symbol', udp.asset_symbol,
            'amount', udp.amount,
            'usd_value', udp.usd_value,
            'apy', udp.apy,
            'start_date', udp.start_date,
            'end_date', udp.end_date,
            'status', udp.status,
            'transaction_hash', udp.transaction_hash,
            'risk_level', dp.risk_level
        ))
        INTO v_positions
        FROM public.user_defi_positions udp
        JOIN public.defi_protocols dp ON udp.protocol_id = dp.protocol_id
        WHERE udp.user_id = v_user_id
        AND (p_protocol_ids IS NULL OR udp.protocol_id = ANY(p_protocol_ids))
        AND (p_chains IS NULL OR udp.chain = ANY(p_chains))
        AND (udp.start_date IS NULL OR udp.start_date <= p_date_range_end)
        AND (udp.end_date IS NULL OR udp.end_date >= p_date_range_start);
        
        -- Initialize empty array if null
        IF v_positions IS NULL THEN
            v_positions := '[]'::JSONB;
        END IF;
    ELSE
        v_positions := '[]'::JSONB;
    END IF;

    -- Calculate DeFi metrics and insights
    WITH position_metrics AS (
        SELECT 
            COUNT(*) AS total_positions,
            COUNT(DISTINCT protocol_id) AS distinct_protocols,
            COUNT(DISTINCT chain) AS distinct_chains,
            SUM(usd_value) AS total_value,
            ARRAY_AGG(DISTINCT position_type) AS position_types
        FROM public.user_defi_positions
        WHERE user_id = v_user_id
        AND (start_date IS NULL OR start_date <= p_date_range_end)
        AND (end_date IS NULL OR end_date >= p_date_range_start)
    )
    SELECT jsonb_build_object(
        'total_positions', COALESCE(pm.total_positions, 0),
        'distinct_protocols', COALESCE(pm.distinct_protocols, 0),
        'distinct_chains', COALESCE(pm.distinct_chains, 0),
        'total_value_usd', COALESCE(pm.total_value, 0),
        'position_types', COALESCE(pm.position_types, '{}'),
        'last_updated', NOW()
    )
    INTO v_metrics
    FROM position_metrics pm;

    -- Risk assessment (a simplified example)
    WITH position_risk AS (
        SELECT 
            COUNT(*) FILTER (WHERE dp.risk_level = 'high' OR dp.risk_level = 'very_high') AS high_risk_positions,
            COUNT(*) AS total_positions,
            SUM(udp.usd_value) FILTER (WHERE dp.risk_level = 'high' OR dp.risk_level = 'very_high') AS high_risk_value,
            SUM(udp.usd_value) AS total_value
        FROM public.user_defi_positions udp
        JOIN public.defi_protocols dp ON udp.protocol_id = dp.protocol_id
        WHERE udp.user_id = v_user_id
        AND (udp.start_date IS NULL OR udp.start_date <= p_date_range_end)
        AND (udp.end_date IS NULL OR udp.end_date >= p_date_range_start)
    )
    SELECT jsonb_build_object(
        'high_risk_percentage', 
            CASE 
                WHEN pr.total_positions > 0 THEN ROUND((pr.high_risk_positions::numeric / pr.total_positions) * 100, 2)
                ELSE 0
            END,
        'high_risk_value_percentage', 
            CASE 
                WHEN pr.total_value > 0 THEN ROUND((pr.high_risk_value / pr.total_value) * 100, 2)
                ELSE 0
            END,
        'risk_score',
            CASE 
                WHEN pr.total_value = 0 THEN 0
                WHEN (pr.high_risk_value / pr.total_value) > 0.5 THEN 'high'
                WHEN (pr.high_risk_value / pr.total_value) > 0.25 THEN 'medium'
                ELSE 'low'
            END,
        'recommendation', 
            CASE 
                WHEN pr.total_value = 0 THEN 'No active DeFi positions found.'
                WHEN (pr.high_risk_value / pr.total_value) > 0.5 THEN 'Consider reducing exposure to high-risk protocols.'
                WHEN (pr.high_risk_value / pr.total_value) > 0.25 THEN 'Portfolio has moderate risk. Consider diversifying.'
                ELSE 'Portfolio has good risk diversification.'
            END
    )
    INTO v_risk_assessment
    FROM position_risk pr;

    -- Combine all results
    v_result := jsonb_build_object(
        'protocols', v_protocols,
        'positions', v_positions,
        'metrics', v_metrics,
        'risk_assessment', COALESCE(v_risk_assessment, '{}'::jsonb),
        'timestamp', NOW()
    );

    RETURN v_result;
END;
$$;

-- Create timestamp triggers
DROP TRIGGER IF EXISTS defi_protocols_created_at ON public.defi_protocols;
CREATE TRIGGER defi_protocols_created_at BEFORE INSERT ON public.defi_protocols FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS defi_protocols_updated_at ON public.defi_protocols;
CREATE TRIGGER defi_protocols_updated_at BEFORE UPDATE ON public.defi_protocols FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS user_defi_positions_created_at ON public.user_defi_positions;
CREATE TRIGGER user_defi_positions_created_at BEFORE INSERT ON public.user_defi_positions FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS user_defi_positions_updated_at ON public.user_defi_positions;
CREATE TRIGGER user_defi_positions_updated_at BEFORE UPDATE ON public.user_defi_positions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample protocol data for development
INSERT INTO public.defi_protocols (protocol_id, name, description, category, risk_level, tvl, chains, tokens, audit_status, audit_links, website)
VALUES
    ('aave-v3', 'Aave V3', 'Leading DeFi lending protocol with multiple markets and assets', 'lending', 'low', 5000000000, ARRAY['ethereum', 'polygon', 'avalanche', 'optimism', 'arbitrum'], ARRAY['aave', 'usdc', 'eth', 'dai'], TRUE, ARRAY['https://github.com/aave/aave-v3-core/blob/master/audits/'], 'https://aave.com'),
    ('uniswap-v3', 'Uniswap V3', 'Leading automated market maker with concentrated liquidity', 'dex', 'low', 3500000000, ARRAY['ethereum', 'polygon', 'optimism', 'arbitrum'], ARRAY['uni', 'eth'], TRUE, ARRAY['https://github.com/Uniswap/v3-core/tree/main/audits'], 'https://uniswap.org'),
    ('curve', 'Curve Finance', 'Specialized AMM for stablecoins and similar assets', 'dex', 'low', 3000000000, ARRAY['ethereum', 'polygon', 'avalanche', 'fantom'], ARRAY['crv', 'usdc', 'usdt', 'dai'], TRUE, ARRAY['https://curve.fi/audits'], 'https://curve.fi'),
    ('yearn', 'Yearn Finance', 'Yield aggregator that automatically moves funds between DeFi protocols', 'yield', 'medium', 1000000000, ARRAY['ethereum', 'arbitrum'], ARRAY['yfi', 'eth', 'dai'], TRUE, ARRAY['https://docs.yearn.finance/resources/audits'], 'https://yearn.finance'),
    ('gmx', 'GMX', 'Decentralized perpetual exchange with low fees', 'derivatives', 'medium', 800000000, ARRAY['arbitrum', 'avalanche'], ARRAY['gmx', 'eth', 'avax'], TRUE, ARRAY['https://gmxio.gitbook.io/gmx/security/audits'], 'https://gmx.io'),
    ('lido', 'Lido', 'Liquid staking protocol for multiple chains', 'staking', 'low', 15000000000, ARRAY['ethereum', 'solana', 'polygon'], ARRAY['ldo', 'steth'], TRUE, ARRAY['https://github.com/lidofinance/audits'], 'https://lido.fi'),
    ('pancakeswap', 'PancakeSwap', 'Multi-chain DEX and yield platform', 'dex', 'low', 2000000000, ARRAY['bnb-chain', 'ethereum', 'aptos'], ARRAY['cake'], TRUE, ARRAY['https://docs.pancakeswap.finance/help/faq#audits'], 'https://pancakeswap.finance')
ON CONFLICT (protocol_id) DO NOTHING;
