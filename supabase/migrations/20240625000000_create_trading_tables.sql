-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.farm_agents(id) ON DELETE SET NULL,
  market VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
  type VARCHAR(20) NOT NULL CHECK (type IN ('market', 'limit', 'stop', 'trailing_stop')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'filled', 'partially_filled', 'canceled', 'rejected', 'expired')),
  quantity DECIMAL(20, 8) NOT NULL,
  filled_quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  price DECIMAL(20, 8),
  stop_price DECIMAL(20, 8),
  trailing_percent DECIMAL(10, 4),
  time_in_force VARCHAR(10) NOT NULL CHECK (time_in_force IN ('gtc', 'ioc', 'fok', 'day')),
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.farm_agents(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  market VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
  price DECIMAL(20, 8) NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  fee DECIMAL(20, 8) NOT NULL,
  fee_currency VARCHAR(10) NOT NULL,
  total DECIMAL(20, 8) NOT NULL,
  profit_loss DECIMAL(20, 8),
  wallet_id UUID REFERENCES public.farm_wallets(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  metadata JSONB,
  executed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create flash_loans table
CREATE TABLE IF NOT EXISTS public.flash_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  amount DECIMAL(20, 8) NOT NULL,
  token VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'active', 'repaid', 'defaulted')),
  interest_rate DECIMAL(10, 6) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  collateral_amount DECIMAL(20, 8),
  collateral_token VARCHAR(20),
  liquidation_threshold DECIMAL(20, 8),
  liquidation_price DECIMAL(20, 8),
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('arbitrage', 'liquidation', 'leverage', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at triggers
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flash_loans_updated_at
  BEFORE UPDATE ON public.flash_loans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_orders_farm_id ON public.orders(farm_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_trades_farm_id ON public.trades(farm_id);
CREATE INDEX idx_trades_executed_at ON public.trades(executed_at);
CREATE INDEX idx_flash_loans_farm_id ON public.flash_loans(farm_id);
CREATE INDEX idx_flash_loans_status ON public.flash_loans(status);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_loans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = orders.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create orders for their farms"
  ON public.orders FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = orders.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their own orders"
  ON public.orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = orders.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own orders"
  ON public.orders FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = orders.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Create RLS policies for trades
CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = trades.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create trades for their farms"
  ON public.trades FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = trades.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Create RLS policies for flash loans
CREATE POLICY "Users can view their own flash loans"
  ON public.flash_loans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = flash_loans.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create flash loans for their farms"
  ON public.flash_loans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = flash_loans.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their own flash loans"
  ON public.flash_loans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = flash_loans.farm_id
    AND farms.owner_id = auth.uid()
  )); 