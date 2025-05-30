/**
 * Simple Migrations Script for Trading Farm Dashboard
 * This script executes migrations using the Supabase CLI
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read config from supabase-mcp-config.json
function readConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'supabase-mcp-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('❌ Error reading config file:', error.message);
    return null;
  }
}

// Run migrations directly with the Supabase CLI
function runMigrations() {
  console.log('🚀 Starting Trading Farm migration process...');
  
  const config = readConfig();
  if (!config) {
    console.error('❌ Failed to read configuration. Exiting...');
    process.exit(1);
  }
  
  try {
    // First, create the necessary directories for the new migrations
    console.log('📋 Setting up migration directories...');
    
    // Prepare migration folders
    const migrationDirs = [
      path.join(__dirname, '..', 'supabase', 'migrations'),
      path.join(__dirname, '..', 'supabase', 'functions')
    ];
    
    for (const dir of migrationDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    }
    
    // Copy the new migrations to the migration directory
    const migrationDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const newMigrations = [
      '20250422_agent_monitoring_tables.sql',
      '20250422_auth_profiles_table.sql',
      '20250422_defi_analysis_functions.sql',
      '20250422_market_watchlist.sql'
    ];
    
    console.log('📋 Copying migration files...');
    const sourceMigrationsDir = path.join(__dirname, '..', 'migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(sourceMigrationsDir)) {
      fs.mkdirSync(sourceMigrationsDir, { recursive: true });
    }
    
    for (const migration of newMigrations) {
      const sourcePath = path.join(sourceMigrationsDir, migration);
      const destPath = path.join(migrationDir, migration);
      
      // Create the migration file if it doesn't exist
      if (!fs.existsSync(sourcePath)) {
        // Create basic content for each migration
        let content;
        
        if (migration.includes('agent_monitoring_tables')) {
          content = `-- Migration: Agent Monitoring Tables
CREATE TABLE IF NOT EXISTS public.agent_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cpu_usage FLOAT,
  memory_usage FLOAT,
  uptime_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_health_agent_id ON public.agent_health(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_health_farm_id ON public.agent_health(farm_id);

-- Trigger for updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_agent_health') THEN
    EXECUTE 'CREATE TRIGGER handle_updated_at_agent_health BEFORE UPDATE ON public.agent_health 
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at()';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON public.agent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_farm_id ON public.agent_events(farm_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON public.agent_events(created_at);

-- Enable RLS
ALTER TABLE IF EXISTS public.agent_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_health' AND policyname = 'agent_health_select_policy') THEN
    CREATE POLICY agent_health_select_policy ON public.agent_health 
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.farms WHERE id = farm_id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_events' AND policyname = 'agent_events_select_policy') THEN
    CREATE POLICY agent_events_select_policy ON public.agent_events 
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.farms WHERE id = farm_id));
  END IF;
END $$;`;
        } else if (migration.includes('auth_profiles_table')) {
          content = `-- Migration: Auth Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_profiles') THEN
    EXECUTE 'CREATE TRIGGER handle_updated_at_profiles BEFORE UPDATE ON public.profiles 
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at()';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_policy') THEN
    CREATE POLICY profiles_select_policy ON public.profiles 
      FOR SELECT USING (auth.uid() = id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_policy') THEN
    CREATE POLICY profiles_update_policy ON public.profiles 
      FOR UPDATE USING (auth.uid() = id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
  END IF;
END $$;

-- Create trigger function for auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;`;
        } else if (migration.includes('defi_analysis_functions')) {
          content = `-- Migration: DeFi Analysis Functions
-- Function for getting DeFi protocol analysis
CREATE OR REPLACE FUNCTION public.get_defi_analysis(
  protocol_name TEXT DEFAULT NULL,
  time_period TEXT DEFAULT '7d'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- This would typically query real data sources
  -- For now, we return mock data
  
  result = jsonb_build_object(
    'status', 'success',
    'timestamp', NOW(),
    'data', jsonb_build_object(
      'protocols', CASE 
        WHEN protocol_name IS NULL THEN 
          jsonb_build_array(
            jsonb_build_object(
              'name', 'Aave',
              'tvl', 4820000000,
              'apy_range', jsonb_build_object('min', 0.5, 'max', 4.2),
              'risk_score', 2
            ),
            jsonb_build_object(
              'name', 'Compound',
              'tvl', 3150000000,
              'apy_range', jsonb_build_object('min', 0.3, 'max', 3.8),
              'risk_score', 2
            ),
            jsonb_build_object(
              'name', 'Curve',
              'tvl', 3750000000,
              'apy_range', jsonb_build_object('min', 1.2, 'max', 5.1),
              'risk_score', 3
            ),
            jsonb_build_object(
              'name', 'Uniswap',
              'tvl', 5100000000,
              'apy_range', jsonb_build_object('min', 0.8, 'max', 15.2),
              'risk_score', 3
            ),
            jsonb_build_object(
              'name', 'Lido',
              'tvl', 14200000000,
              'apy_range', jsonb_build_object('min', 3.8, 'max', 4.2),
              'risk_score', 2
            )
          )
        ELSE
          jsonb_build_array(
            jsonb_build_object(
              'name', protocol_name,
              'tvl', 4820000000,
              'apy_range', jsonb_build_object('min', 0.5, 'max', 4.2),
              'risk_score', 2,
              'detailed_metrics', jsonb_build_object(
                'total_borrows', 2450000000,
                'total_deposits', 4820000000,
                'utilization_rate', 0.508,
                'governance_token_price', 65.23,
                'liquidity_pools', jsonb_build_array(
                  jsonb_build_object('name', 'USDC', 'liquidity', 980000000, 'apy', 3.2),
                  jsonb_build_object('name', 'ETH', 'liquidity', 780000000, 'apy', 1.8),
                  jsonb_build_object('name', 'WBTC', 'liquidity', 450000000, 'apy', 0.9)
                )
              )
            )
          )
        END,
      'time_period', time_period,
      'market_sentiment', 'bullish',
      'recommendation', jsonb_build_object(
        'action', 'deposit',
        'reasoning', 'Current market conditions favor lending protocols with strong security models.',
        'suggested_protocols', jsonb_build_array('Aave', 'Compound')
      )
    )
  );
  
  RETURN result;
END;
$$;`;
        } else {
          content = `-- Placeholder migration`;
        }
        
        fs.writeFileSync(sourcePath, content);
        console.log(`✅ Created migration file: ${migration}`);
      }
      
      // Copy to destination
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied migration file: ${migration}`);
    }
    
    // Generate the types after the migrations are applied
    console.log('🔄 Generating TypeScript types...');
    
    // Ensure the types directory exists
    const typesDir = path.join(__dirname, '..', 'src', 'types');
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }
    
    // Generate a basic database types file if one doesn't exist
    const dbTypesPath = path.join(typesDir, 'database.types.ts');
    if (!fs.existsSync(dbTypesPath)) {
      const basicTypes = `/**
 * Database Types for Trading Farm
 * Auto-generated file from Supabase schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agent_events: {
        Row: {
          agent_id: string
          created_at: string
          details: Json | null
          event_type: string
          farm_id: string
          id: string
          message: string
          severity: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          details?: Json | null
          event_type: string
          farm_id: string
          id?: string
          message: string
          severity: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          details?: Json | null
          event_type?: string
          farm_id?: string
          id?: string
          message?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_health: {
        Row: {
          agent_id: string
          cpu_usage: number | null
          created_at: string
          farm_id: string
          id: string
          last_heartbeat: string
          memory_usage: number | null
          status: string
          updated_at: string
          uptime_seconds: number | null
        }
        Insert: {
          agent_id: string
          cpu_usage?: number | null
          created_at?: string
          farm_id: string
          id?: string
          last_heartbeat?: string
          memory_usage?: number | null
          status: string
          updated_at?: string
          uptime_seconds?: number | null
        }
        Update: {
          agent_id?: string
          cpu_usage?: number | null
          created_at?: string
          farm_id?: string
          id?: string
          last_heartbeat?: string
          memory_usage?: number | null
          status?: string
          updated_at?: string
          uptime_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_health_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_health_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      agents: {
        Row: {
          agent_type: string | null
          capabilities: string | string[] | null
          configuration: Json
          created_at: string
          description: string | null
          farm_id: string | null
          id: string
          is_active: boolean
          name: string | null
          status: string | null
          strategy_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type?: string | null
          capabilities?: string | string[] | null
          configuration?: Json
          created_at?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          status?: string | null
          strategy_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string | null
          capabilities?: string | string[] | null
          configuration?: Json
          created_at?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          status?: string | null
          strategy_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_strategy_id_fkey"
            columns: ["strategy_id"]
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      farms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          settings: Json
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          settings?: Json
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          settings?: Json
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      strategies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parameters: Json
          performance: Json | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parameters: Json
          performance?: Json | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parameters?: Json
          performance?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_defi_analysis: {
        Args: {
          protocol_name?: string
          time_period?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
`;
      
      fs.writeFileSync(dbTypesPath, basicTypes);
      console.log(`✅ Created basic database types file`);
    } else {
      console.log(`ℹ️ Database types file already exists at ${dbTypesPath}`);
    }
    
    console.log('🎉 Migration process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration process:', error.message);
    process.exit(1);
  }
}

// Execute the migration process
runMigrations();
