# Trading Farm Database Schema Documentation

## Overview

This document provides a comprehensive overview of the Trading Farm database schema implemented in Supabase. The database follows normalized design principles with appropriate indexes and relationships to ensure performance and data integrity.

## Table of Contents

1. [User Management](#user-management)
2. [Strategy Management](#strategy-management)
3. [Order Management](#order-management)
4. [Position Management](#position-management)
5. [Exchange Connections](#exchange-connections)
6. [Risk Management](#risk-management)
7. [Performance Metrics](#performance-metrics)
8. [Migrations and Updates](#migrations-and-updates)
9. [Security Policies](#security-policies)

## User Management

### users (managed by Supabase Auth)

This table is automatically managed by Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, auto-generated |
| email | text | User's email address |
| created_at | timestamp | Account creation timestamp |
| last_sign_in_at | timestamp | Last login timestamp |
| ... | ... | Other auth-related fields |

### user_profiles

Stores additional user information not handled by the auth system.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key, references users.id | FK, NOT NULL |
| full_name | text | User's full name | |
| avatar_url | text | URL to user's avatar | |
| trading_experience | text | Level of trading experience | CHECK ('beginner', 'intermediate', 'advanced', 'expert') |
| preferences | jsonb | User preferences as JSON | |
| roles | text[] | User roles for authorization | NOT NULL, DEFAULT '{user}' |
| permissions | text[] | User permissions for authorization | |
| two_factor_enabled | boolean | Whether 2FA is enabled | NOT NULL, DEFAULT false |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    trading_experience TEXT CHECK (trading_experience IN ('beginner', 'intermediate', 'advanced', 'expert')),
    preferences JSONB,
    roles TEXT[] NOT NULL DEFAULT '{user}',
    permissions TEXT[] DEFAULT '{}',
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

### user_preferences

Stores user-specific settings for the dashboard.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | References users.id | FK, NOT NULL |
| theme | text | UI theme preference | DEFAULT 'system' |
| layout | jsonb | Dashboard layout configuration | |
| notification_settings | jsonb | Notification preferences | |
| default_exchange | uuid | Default exchange connection | FK |
| chart_settings | jsonb | Chart display preferences | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    theme TEXT DEFAULT 'system',
    layout JSONB,
    notification_settings JSONB,
    default_exchange UUID REFERENCES public.exchange_connections(id),
    chart_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

## Strategy Management

### trading_strategies

Stores trading strategy configurations.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | Owner of the strategy | FK, NOT NULL |
| name | text | Strategy name | NOT NULL |
| description | text | Strategy description | |
| type | text | Strategy type | CHECK ('indicator', 'grid', 'dca', 'custom') |
| parameters | jsonb | Strategy parameters | NOT NULL |
| trading_pairs | text[] | Trading pairs to use | |
| status | text | Strategy status | CHECK ('active', 'inactive', 'backtesting') |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.trading_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('indicator', 'grid', 'dca', 'custom')),
    parameters JSONB NOT NULL,
    trading_pairs TEXT[],
    status TEXT CHECK (status IN ('active', 'inactive', 'backtesting')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_trading_strategies_user_id ON public.trading_strategies(user_id);
CREATE INDEX idx_trading_strategies_status ON public.trading_strategies(status);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.trading_strategies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

### strategy_backtests

Stores the results of strategy backtests.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| strategy_id | uuid | Strategy that was tested | FK, NOT NULL |
| user_id | uuid | User who ran the backtest | FK, NOT NULL |
| start_date | timestamp | Backtest start date | NOT NULL |
| end_date | timestamp | Backtest end date | NOT NULL |
| initial_capital | numeric | Starting capital | NOT NULL |
| final_capital | numeric | Ending capital | NOT NULL |
| total_trades | integer | Number of trades executed | NOT NULL |
| win_rate | numeric | Percentage of profitable trades | NOT NULL |
| profit_factor | numeric | Gross profit / gross loss | |
| sharpe_ratio | numeric | Risk-adjusted return | |
| max_drawdown | numeric | Maximum drawdown percentage | |
| trades | jsonb | Detailed trade records | |
| parameters | jsonb | Strategy parameters used | NOT NULL |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.strategy_backtests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES public.trading_strategies(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    initial_capital NUMERIC NOT NULL,
    final_capital NUMERIC NOT NULL,
    total_trades INTEGER NOT NULL,
    win_rate NUMERIC NOT NULL,
    profit_factor NUMERIC,
    sharpe_ratio NUMERIC,
    max_drawdown NUMERIC,
    trades JSONB,
    parameters JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_strategy_backtests_strategy_id ON public.strategy_backtests(strategy_id);
CREATE INDEX idx_strategy_backtests_user_id ON public.strategy_backtests(user_id);
```

## Order Management

### orders

Stores all trading orders.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who placed the order | FK, NOT NULL |
| exchange_credential_id | uuid | Exchange connection used | FK, NOT NULL |
| exchange_order_id | text | Order ID from exchange | |
| symbol | text | Trading pair | NOT NULL |
| order_type | text | Type of order | CHECK ('market', 'limit', 'stop', 'stop_limit') |
| side | text | Buy or sell | CHECK ('buy', 'sell') |
| amount | numeric | Order size | NOT NULL |
| price | numeric | Order price (for limit orders) | |
| stop_price | numeric | Trigger price (for stop orders) | |
| status | text | Order status | CHECK ('pending', 'filled', 'partially_filled', 'canceled', 'rejected') |
| filled_amount | numeric | Amount that has been filled | DEFAULT 0 |
| average_fill_price | numeric | Average execution price | |
| strategy_id | uuid | Strategy that created the order | FK |
| parent_order_id | uuid | Parent order (for OCO orders) | FK |
| metadata | jsonb | Additional order metadata | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    exchange_credential_id UUID REFERENCES public.exchange_connections(id) NOT NULL,
    exchange_order_id TEXT,
    symbol TEXT NOT NULL,
    order_type TEXT CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
    side TEXT CHECK (side IN ('buy', 'sell')),
    amount NUMERIC NOT NULL,
    price NUMERIC,
    stop_price NUMERIC,
    status TEXT CHECK (status IN ('pending', 'filled', 'partially_filled', 'canceled', 'rejected')),
    filled_amount NUMERIC DEFAULT 0,
    average_fill_price NUMERIC,
    strategy_id UUID REFERENCES public.trading_strategies(id),
    parent_order_id UUID REFERENCES public.orders(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_exchange_credential_id ON public.orders(exchange_credential_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_symbol ON public.orders(symbol);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

## Position Management

### positions

Stores open and closed trading positions.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who owns the position | FK, NOT NULL |
| exchange_credential_id | uuid | Exchange connection | FK, NOT NULL |
| symbol | text | Trading pair | NOT NULL |
| side | text | Long or short | CHECK ('long', 'short') |
| entry_price | numeric | Average entry price | NOT NULL |
| amount | numeric | Position size | NOT NULL |
| current_price | numeric | Current market price | |
| unrealized_pnl | numeric | Unrealized profit/loss | |
| status | text | Position status | CHECK ('open', 'closed') |
| open_date | timestamp | Opening timestamp | NOT NULL |
| close_date | timestamp | Closing timestamp | |
| exit_price | numeric | Average exit price | |
| realized_pnl | numeric | Realized profit/loss | |
| strategy_id | uuid | Strategy that opened position | FK |
| fees | numeric | Total fees paid | DEFAULT 0 |
| take_profit_price | numeric | Take profit target | |
| stop_loss_price | numeric | Stop loss level | |
| metadata | jsonb | Additional position data | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    exchange_credential_id UUID REFERENCES public.exchange_connections(id) NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT CHECK (side IN ('long', 'short')),
    entry_price NUMERIC NOT NULL,
    amount NUMERIC NOT NULL,
    current_price NUMERIC,
    unrealized_pnl NUMERIC,
    status TEXT CHECK (status IN ('open', 'closed')),
    open_date TIMESTAMP WITH TIME ZONE NOT NULL,
    close_date TIMESTAMP WITH TIME ZONE,
    exit_price NUMERIC,
    realized_pnl NUMERIC,
    strategy_id UUID REFERENCES public.trading_strategies(id),
    fees NUMERIC DEFAULT 0,
    take_profit_price NUMERIC,
    stop_loss_price NUMERIC,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_positions_user_id ON public.positions(user_id);
CREATE INDEX idx_positions_exchange_credential_id ON public.positions(exchange_credential_id);
CREATE INDEX idx_positions_status ON public.positions(status);
CREATE INDEX idx_positions_symbol ON public.positions(symbol);
CREATE INDEX idx_positions_open_date ON public.positions(open_date);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

### trade_history

Stores a record of all completed trades.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who made the trade | FK, NOT NULL |
| position_id | uuid | Related position | FK |
| order_id | uuid | Related order | FK |
| exchange_credential_id | uuid | Exchange connection | FK, NOT NULL |
| symbol | text | Trading pair | NOT NULL |
| side | text | Buy or sell | CHECK ('buy', 'sell') |
| entry_price | numeric | Entry price | NOT NULL |
| exit_price | numeric | Exit price | |
| amount | numeric | Trade size | NOT NULL |
| pnl | numeric | Profit/loss | |
| fees | numeric | Fees paid | |
| timestamp | timestamp | Trade timestamp | NOT NULL |
| strategy_id | uuid | Related strategy | FK |
| holding_time_hours | numeric | Position holding time | |
| exit_reason | text | Reason for exit | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.trade_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    position_id UUID REFERENCES public.positions(id),
    order_id UUID REFERENCES public.orders(id),
    exchange_credential_id UUID REFERENCES public.exchange_connections(id) NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT CHECK (side IN ('buy', 'sell')),
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    amount NUMERIC NOT NULL,
    pnl NUMERIC,
    fees NUMERIC,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    strategy_id UUID REFERENCES public.trading_strategies(id),
    holding_time_hours NUMERIC,
    exit_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_trade_history_user_id ON public.trade_history(user_id);
CREATE INDEX idx_trade_history_symbol ON public.trade_history(symbol);
CREATE INDEX idx_trade_history_timestamp ON public.trade_history(timestamp);
CREATE INDEX idx_trade_history_strategy_id ON public.trade_history(strategy_id);
```

## Exchange Connections

### exchange_connections

Stores API connections to crypto exchanges.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who owns connection | FK, NOT NULL |
| exchange | text | Exchange name | NOT NULL |
| label | text | User-defined label | |
| api_key | text | Encrypted API key | NOT NULL |
| api_secret | text | Encrypted API secret | NOT NULL |
| additional_params | jsonb | Extra parameters | |
| status | text | Connection status | CHECK ('active', 'inactive', 'error') |
| last_connection | timestamp | Last successful connection | |
| permissions | jsonb | API key permissions | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.exchange_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    exchange TEXT NOT NULL,
    label TEXT,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    additional_params JSONB,
    status TEXT CHECK (status IN ('active', 'inactive', 'error')),
    last_connection TIMESTAMP WITH TIME ZONE,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exchange_connections_user_id ON public.exchange_connections(user_id);
CREATE INDEX idx_exchange_connections_exchange ON public.exchange_connections(exchange);
CREATE INDEX idx_exchange_connections_status ON public.exchange_connections(status);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.exchange_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

## Risk Management

### risk_profiles

Stores risk management settings.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who owns profile | FK, NOT NULL |
| name | text | Profile name | NOT NULL |
| description | text | Profile description | |
| max_position_size | numeric | Maximum position size (%) | NOT NULL |
| max_open_positions | integer | Max concurrent positions | NOT NULL |
| max_daily_loss | numeric | Maximum daily loss (%) | NOT NULL |
| max_drawdown | numeric | Maximum drawdown (%) | NOT NULL |
| per_trade_risk | numeric | Risk per trade (%) | NOT NULL |
| position_sizing_method | text | How to size positions | CHECK ('fixed', 'percent', 'risk', 'kelly') |
| is_default | boolean | Is this the default profile | DEFAULT false |
| applied_strategies | uuid[] | Strategies using this profile | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.risk_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    max_position_size NUMERIC NOT NULL,
    max_open_positions INTEGER NOT NULL,
    max_daily_loss NUMERIC NOT NULL,
    max_drawdown NUMERIC NOT NULL,
    per_trade_risk NUMERIC NOT NULL,
    position_sizing_method TEXT CHECK (position_sizing_method IN ('fixed', 'percent', 'risk', 'kelly')),
    is_default BOOLEAN DEFAULT false,
    applied_strategies UUID[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_risk_profiles_user_id ON public.risk_profiles(user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.risk_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

## Performance Metrics

### performance_metrics

Stores aggregated performance metrics.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who owns metrics | FK, NOT NULL |
| period | text | Time period | CHECK ('daily', 'weekly', 'monthly', 'all_time') |
| date | date | Date of metrics | |
| total_pnl | numeric | Total profit/loss | |
| win_rate | numeric | Percentage of winning trades | |
| average_trade | numeric | Average P&L per trade | |
| sharpe_ratio | numeric | Risk-adjusted return | |
| max_drawdown | numeric | Maximum drawdown (%) | |
| best_trade | numeric | Largest profit | |
| worst_trade | numeric | Largest loss | |
| total_trades | integer | Number of trades | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    period TEXT CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    date DATE,
    total_pnl NUMERIC,
    win_rate NUMERIC,
    average_trade NUMERIC,
    sharpe_ratio NUMERIC,
    max_drawdown NUMERIC,
    best_trade NUMERIC,
    worst_trade NUMERIC,
    total_trades INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, period, date)
);

-- Indexes
CREATE INDEX idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_period ON public.performance_metrics(period);
CREATE INDEX idx_performance_metrics_date ON public.performance_metrics(date);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.performance_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

### portfolio_value_history

Stores historical portfolio values over time.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who owns portfolio | FK, NOT NULL |
| timestamp | timestamp | Timestamp of snapshot | NOT NULL |
| value | numeric | Portfolio value | NOT NULL |
| btc_value | numeric | Value in BTC terms | |
| deposits | numeric | Deposits during period | DEFAULT 0 |
| withdrawals | numeric | Withdrawals during period | DEFAULT 0 |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.portfolio_value_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    value NUMERIC NOT NULL,
    btc_value NUMERIC,
    deposits NUMERIC DEFAULT 0,
    withdrawals NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, timestamp)
);

-- Indexes
CREATE INDEX idx_portfolio_value_history_user_id ON public.portfolio_value_history(user_id);
CREATE INDEX idx_portfolio_value_history_timestamp ON public.portfolio_value_history(timestamp);
```

### strategy_performance

Stores performance metrics by strategy.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| strategy_id | uuid | Strategy being measured | FK, NOT NULL |
| user_id | uuid | User who owns strategy | FK, NOT NULL |
| name | text | Strategy name | NOT NULL |
| period | text | Time period | CHECK ('daily', 'weekly', 'monthly', 'all_time') |
| date | date | Date of metrics | |
| total_pnl | numeric | Total profit/loss | |
| win_rate | numeric | Percentage of winning trades | |
| trades | integer | Number of trades | |
| avg_holding_time | numeric | Average holding time (hours) | |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.strategy_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES public.trading_strategies(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    period TEXT CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    date DATE,
    total_pnl NUMERIC,
    win_rate NUMERIC,
    trades INTEGER,
    avg_holding_time NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (strategy_id, period, date)
);

-- Indexes
CREATE INDEX idx_strategy_performance_strategy_id ON public.strategy_performance(strategy_id);
CREATE INDEX idx_strategy_performance_user_id ON public.strategy_performance(user_id);
CREATE INDEX idx_strategy_performance_period ON public.strategy_performance(period);
CREATE INDEX idx_strategy_performance_date ON public.strategy_performance(date);
```

### asset_allocation

Stores current asset allocation.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | uuid | Primary key | PK, NOT NULL |
| user_id | uuid | User who owns assets | FK, NOT NULL |
| asset | text | Asset name | NOT NULL |
| value | numeric | Current USD value | NOT NULL |
| percentage | numeric | Percentage of portfolio | NOT NULL |
| amount | numeric | Amount of asset | NOT NULL |
| created_at | timestamp | Row creation timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Row update timestamp | NOT NULL, DEFAULT now() |

```sql
CREATE TABLE public.asset_allocation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    asset TEXT NOT NULL,
    value NUMERIC NOT NULL,
    percentage NUMERIC NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, asset)
);

-- Indexes
CREATE INDEX idx_asset_allocation_user_id ON public.asset_allocation(user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.asset_allocation
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
```

## Migrations and Updates

Database migrations are managed through Supabase's migration system. Migration files are stored in `/supabase/migrations/`.

To create a new migration, run:

```bash
npx supabase migration new <migration-name>
```

To apply migrations:

```bash
npx supabase migration up
```

To generate TypeScript types from the database schema:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

## Security Policies

Row Level Security (RLS) policies are implemented for all tables to restrict access to authorized users:

```sql
-- Enable RLS on all tables
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END
$$;

-- Example policy for trading_strategies table
CREATE POLICY "Users can view their own strategies"
    ON public.trading_strategies
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies"
    ON public.trading_strategies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
    ON public.trading_strategies
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
    ON public.trading_strategies
    FOR DELETE
    USING (auth.uid() = user_id);
```

Similar policies are implemented for all tables to ensure users can only access their own data.

## Timestamp Management

Automatic timestamp management is implemented via triggers for all tables with `created_at` and `updated_at` columns:

```sql
-- Function for handling created_at timestamp
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for handling updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations')
    LOOP
        -- Check if the table has created_at column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t.tablename 
            AND column_name = 'created_at'
        ) THEN
            EXECUTE format('
                DROP TRIGGER IF EXISTS set_created_at ON public.%I;
                CREATE TRIGGER set_created_at
                BEFORE INSERT ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_created_at();
            ', t.tablename, t.tablename);
        END IF;
        
        -- Check if the table has updated_at column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = t.tablename 
            AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('
                DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
                CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_updated_at();
            ', t.tablename, t.tablename);
        END IF;
    END LOOP;
END
$$;
```
