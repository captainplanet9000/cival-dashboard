-- Add configuration column to agents table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'agents'
    AND column_name = 'configuration'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
  END IF;
END
$$;

-- Update example data with configuration values
UPDATE public.agents
SET configuration = jsonb_build_object(
  'description', 'Automated trading agent',
  'strategy_type', 'trend_following',
  'risk_level', 'medium',
  'target_markets', jsonb_build_array('BTC/USD', 'ETH/USD'),
  'performance_metrics', jsonb_build_object(
    'win_rate', 0,
    'profit_loss', 0,
    'total_trades', 0,
    'average_trade_duration', 0
  )
)
WHERE configuration IS NULL OR configuration = '{}'::jsonb;
