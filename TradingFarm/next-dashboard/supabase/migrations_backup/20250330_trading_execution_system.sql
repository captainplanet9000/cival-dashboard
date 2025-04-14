-- Create types for order statuses and types
CREATE TYPE public.order_status AS ENUM (
  'pending', 'filled', 'partially_filled', 'canceled', 'rejected', 'expired'
);

CREATE TYPE public.order_type AS ENUM (
  'market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'oco', 'take_profit', 'iceberg'
);

-- Trading strategies table
CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  performance_metrics JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own strategies" ON public.strategies
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  type order_type NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  filled_quantity NUMERIC DEFAULT 0,
  average_price NUMERIC,
  fees NUMERIC DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  extra_params JSONB DEFAULT '{}',
  external_id TEXT
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Trades table
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fees NUMERIC DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  pnl NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own trades" ON public.trades
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Strategy backtest results
CREATE TABLE public.backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  initial_capital NUMERIC NOT NULL,
  final_capital NUMERIC NOT NULL,
  max_drawdown NUMERIC,
  win_rate NUMERIC,
  profit_factor NUMERIC,
  total_trades INTEGER,
  sharpe_ratio NUMERIC,
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own backtest results" ON public.backtest_results
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.backtest_results
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Risk profiles table
CREATE TABLE public.risk_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  max_position_size NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  daily_loss_limit NUMERIC NOT NULL,
  max_trades_per_day INTEGER,
  max_exposure NUMERIC,
  parameters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own risk profiles" ON public.risk_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Execution quality reports table
CREATE TABLE public.execution_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  slippage_percent NUMERIC,
  execution_speed NUMERIC,
  fill_quality NUMERIC,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.execution_quality ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own execution quality reports" ON public.execution_quality
  FOR ALL USING (auth.uid() = user_id);
