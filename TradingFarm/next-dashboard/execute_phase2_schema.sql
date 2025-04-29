-- Direct SQL Execution for Phase-2 Trading Schema
-- For direct execution without migration system

begin;

--────────────────────────────────────────
-- 1. agents
--────────────────────────────────────────
create table if not exists public.agents (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  farm_id         uuid,
  name            text not null,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.agents enable row level security;

create policy "Users can view their agents" on public.agents for select using (user_id = auth.uid());
create policy "Users can insert their agents" on public.agents for insert with check (user_id = auth.uid());
create policy "Users can update their agents" on public.agents for update using (user_id = auth.uid());
create policy "Users can delete their agents" on public.agents for delete using (user_id = auth.uid());

-- Check if triggers exist first to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_agents_created_at') THEN
    EXECUTE 'create trigger handle_agents_created_at before insert on public.agents for each row execute function public.handle_created_at()';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_agents_updated_at') THEN
    EXECUTE 'create trigger handle_agents_updated_at before update on public.agents for each row execute function public.handle_updated_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 2. live_orders
--────────────────────────────────────────
create table if not exists public.live_orders (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  agent_id        bigint references public.agents(id) on delete cascade,
  exchange        text not null,
  symbol          text not null,
  side            text check (side in ('buy','sell')) not null,
  type            text check (type in ('market','limit','stop','stop_limit')) not null,
  price           numeric,
  quantity        numeric not null,
  status          text default 'pending', -- pending | filled | cancelled | rejected | partial
  executed_qty    numeric default 0,
  tx_id           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.live_orders enable row level security;
create policy "Users can view their orders" on public.live_orders for select using (user_id = auth.uid());
create policy "Users can insert their orders" on public.live_orders for insert with check (user_id = auth.uid());
create policy "Users can update their orders" on public.live_orders for update using (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_live_orders_created_at') THEN
    EXECUTE 'create trigger handle_live_orders_created_at before insert on public.live_orders for each row execute function public.handle_created_at()';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_live_orders_updated_at') THEN
    EXECUTE 'create trigger handle_live_orders_updated_at before update on public.live_orders for each row execute function public.handle_updated_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 3. positions
--────────────────────────────────────────
create table if not exists public.positions (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  agent_id        bigint references public.agents(id) on delete cascade,
  symbol          text not null,
  quantity        numeric not null,
  avg_price       numeric not null,
  unrealised_pnl  numeric default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.positions enable row level security;
create policy "Users can view their positions" on public.positions for select using (user_id = auth.uid());
create policy "Users can insert their positions" on public.positions for insert with check (user_id = auth.uid());
create policy "Users can update their positions" on public.positions for update using (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_positions_created_at') THEN
    EXECUTE 'create trigger handle_positions_created_at before insert on public.positions for each row execute function public.handle_created_at()';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_positions_updated_at') THEN
    EXECUTE 'create trigger handle_positions_updated_at before update on public.positions for each row execute function public.handle_updated_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 4. trades_performance
--────────────────────────────────────────
create table if not exists public.trades_performance (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  agent_id        bigint references public.agents(id) on delete cascade,
  period          text not null, -- e.g., daily, weekly, monthly
  pnl             numeric not null,
  win_rate        numeric,
  sharpe_ratio    numeric,
  drawdown        numeric,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.trades_performance enable row level security;
create policy "Users can view performance" on public.trades_performance for select using (user_id = auth.uid());
create policy "Users can insert performance" on public.trades_performance for insert with check (user_id = auth.uid());
create policy "Users can update performance" on public.trades_performance for update using (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trades_perf_created_at') THEN
    EXECUTE 'create trigger handle_trades_perf_created_at before insert on public.trades_performance for each row execute function public.handle_created_at()';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trades_perf_updated_at') THEN
    EXECUTE 'create trigger handle_trades_perf_updated_at before update on public.trades_performance for each row execute function public.handle_updated_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 5. risk_config
--────────────────────────────────────────
create table if not exists public.risk_config (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  agent_id        bigint references public.agents(id) on delete cascade,
  max_position_pct numeric not null default 0.05,
  max_daily_loss    numeric not null default 0.02,
  circuit_breaker   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.risk_config enable row level security;
create policy "Users can view risk config" on public.risk_config for select using (user_id = auth.uid());
create policy "Users can insert risk config" on public.risk_config for insert with check (user_id = auth.uid());
create policy "Users can update risk config" on public.risk_config for update using (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_risk_config_created_at') THEN
    EXECUTE 'create trigger handle_risk_config_created_at before insert on public.risk_config for each row execute function public.handle_created_at()';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_risk_config_updated_at') THEN
    EXECUTE 'create trigger handle_risk_config_updated_at before update on public.risk_config for each row execute function public.handle_updated_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 6. strategy_params
--────────────────────────────────────────
create table if not exists public.strategy_params (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  agent_id        bigint references public.agents(id) on delete cascade,
  param_key       text not null,
  param_value     text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.strategy_params enable row level security;
create policy "Users can view strategy params" on public.strategy_params for select using (user_id = auth.uid());
create policy "Users can insert strategy params" on public.strategy_params for insert with check (user_id = auth.uid());
create policy "Users can update strategy params" on public.strategy_params for update using (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_strategy_params_created_at') THEN
    EXECUTE 'create trigger handle_strategy_params_created_at before insert on public.strategy_params for each row execute function public.handle_created_at()';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_strategy_params_updated_at') THEN
    EXECUTE 'create trigger handle_strategy_params_updated_at before update on public.strategy_params for each row execute function public.handle_updated_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 7. agent_health
--────────────────────────────────────────
create table if not exists public.agent_health (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  agent_id        bigint references public.agents(id) on delete cascade,
  status          text not null,
  latency_ms      integer,
  last_heartbeat  timestamptz,
  details         jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.agent_health enable row level security;
create policy "Users can view agent health" on public.agent_health for select using (user_id = auth.uid());
create policy "Users can insert agent health" on public.agent_health for insert with check (user_id = auth.uid());
create policy "Users can update agent health" on public.agent_health for update using (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_agent_health_created_at') THEN
    EXECUTE 'create trigger handle_agent_health_created_at before insert on public.agent_health for each row execute function public.handle_created_at()';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_agent_health_updated_at') THEN
    EXECUTE 'create trigger handle_agent_health_updated_at before update on public.agent_health for each row execute function public.handle_updated_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 8. agent_events
--────────────────────────────────────────
create table if not exists public.agent_events (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  agent_id        bigint references public.agents(id) on delete cascade,
  event_type      text not null,
  event_payload   jsonb,
  created_at      timestamptz not null default now()
);

alter table public.agent_events enable row level security;
create policy "Users can view agent events" on public.agent_events for select using (user_id = auth.uid());
create policy "Users can insert agent events" on public.agent_events for insert with check (user_id = auth.uid());

-- created_at trigger only (immutable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_agent_events_created_at') THEN
    EXECUTE 'create trigger handle_agent_events_created_at before insert on public.agent_events for each row execute function public.handle_created_at()';
  END IF;
END
$$;

--────────────────────────────────────────
-- 9. RPC Functions
--────────────────────────────────────────

-- place_live_order -----------------------------------------------------
create or replace function public.place_live_order(
    _agent_id bigint,
    _exchange text,
    _symbol text,
    _side text,
    _type text,
    _price numeric,
    _quantity numeric
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
    _new_order_id bigint;
begin
  insert into public.live_orders (
    user_id, agent_id, exchange, symbol, side, type, price, quantity, status
  ) values (
    auth.uid(), _agent_id, _exchange, _symbol, _side, _type, _price, _quantity, 'pending'
  ) returning id into _new_order_id;
  return _new_order_id;
end;
$$;

-- get_defi_analysis -----------------------------------------------------
create or replace function public.get_defi_analysis(
    _protocol text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- placeholder implementation – returns empty json object.
  return jsonb_build_object('message','defi analysis not yet implemented');
end;
$$;

-- For type-generation
COMMENT ON TABLE public.agents IS '@primaryKey id';
COMMENT ON TABLE public.live_orders IS '@primaryKey id';
COMMENT ON TABLE public.positions IS '@primaryKey id';
COMMENT ON TABLE public.trades_performance IS '@primaryKey id';
COMMENT ON TABLE public.risk_config IS '@primaryKey id';
COMMENT ON TABLE public.strategy_params IS '@primaryKey id';
COMMENT ON TABLE public.agent_health IS '@primaryKey id';
COMMENT ON TABLE public.agent_events IS '@primaryKey id';

commit;
