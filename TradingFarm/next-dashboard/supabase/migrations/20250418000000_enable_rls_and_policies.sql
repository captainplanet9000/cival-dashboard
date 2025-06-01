-- Enable RLS and define access policies for core tables
set search_path = '';

-- Farms
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own farms" ON public.farms FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert farms" ON public.farms FOR INSERT WITH CHECK (user_id = auth.uid());

-- Farm users
ALTER TABLE public.farm_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm collaborators can select" ON public.farm_users FOR SELECT USING (farm_id IN (SELECT farm_id FROM public.farm_users WHERE user_id = auth.uid()));

-- Agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own agents" ON public.agents FOR ALL USING (user_id = auth.uid());

-- Strategies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own strategies" ON public.strategies FOR ALL USING (user_id = auth.uid());

-- Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallets" ON public.wallets FOR SELECT USING (owner_id = auth.uid());

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view orders in own farms" ON public.orders FOR SELECT USING (farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid()));

-- Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (wallet_id IN (SELECT id FROM public.wallets WHERE owner_id = auth.uid()));

-- Goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (user_id = auth.uid());

-- Positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own positions" ON public.positions FOR SELECT USING (farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid()));

-- Trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid()));

-- Market tickers & performance
ALTER TABLE public.market_tickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view market data" ON public.market_tickers FOR SELECT USING (true);

ALTER TABLE public.asset_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view asset performance" ON public.asset_performance FOR SELECT USING (true);
