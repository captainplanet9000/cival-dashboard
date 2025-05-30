import { SupabaseClientFactory, getSupabaseClient } from './lib/supabase-client';

/**
 * Script to create trading_strategies table and related tables
 */
async function createTradingStrategiesTable() {
  // Initialize the Supabase client
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
  SupabaseClientFactory.initialize(apiKey);
  const client = getSupabaseClient();
  
  console.log('Creating trading_strategies table and related tables...');

  try {
    // Create trading_strategies table
    const { error: createStrategyError } = await client
      .from('trading_strategies')
      .insert({
        name: 'Test Strategy',
        description: 'Test description',
        strategy_type: 'momentum',
        parameters: { timeframe: '1h' },
        is_active: true,
        performance_metrics: { win_rate: 0 },
        backtest_results: {}
      })
      .select('*')
      .limit(1);
    
    if (createStrategyError) {
      console.log('Need to create trading_strategies table...');
      
      // Create the table
      await client.rpc('create_trading_strategies_table');
    } else {
      console.log('✅ trading_strategies table already exists');
    }
    
    // Create farm_strategies table for many-to-many relationship
    const { error: createFarmStrategyError } = await client
      .from('farm_strategies')
      .insert({
        farm_id: 1,
        strategy_id: 1,
        allocation: 0.5,
        config: {}
      })
      .select('*')
      .limit(1);
    
    if (createFarmStrategyError) {
      console.log('Need to create farm_strategies table...');
      
      // Create the table
      await client.rpc('create_farm_strategies_table');
    } else {
      console.log('✅ farm_strategies table already exists');
    }
    
    // Create the stored procedures if they don't exist
    const createTradingStrategiesTableSql = `
      CREATE OR REPLACE FUNCTION create_trading_strategies_table() 
      RETURNS void AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS trading_strategies (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          strategy_type VARCHAR(50) NOT NULL,
          parameters JSONB NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT true,
          performance_metrics JSONB NOT NULL DEFAULT '{}',
          backtest_results JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Create updated_at trigger
        CREATE OR REPLACE FUNCTION update_trading_strategies_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS update_trading_strategies_updated_at ON trading_strategies;
        
        -- Create trigger
        CREATE TRIGGER update_trading_strategies_updated_at
        BEFORE UPDATE ON trading_strategies
        FOR EACH ROW
        EXECUTE FUNCTION update_trading_strategies_updated_at();
      END;
      $$ LANGUAGE plpgsql;
    `;

    const createFarmStrategiesTableSql = `
      CREATE OR REPLACE FUNCTION create_farm_strategies_table() 
      RETURNS void AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS farm_strategies (
          id BIGSERIAL PRIMARY KEY,
          farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
          strategy_id BIGINT NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
          allocation DECIMAL(5,2) NOT NULL DEFAULT 0.0,
          config JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(farm_id, strategy_id)
        );
        
        -- Create updated_at trigger
        CREATE OR REPLACE FUNCTION update_farm_strategies_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS update_farm_strategies_updated_at ON farm_strategies;
        
        -- Create trigger
        CREATE TRIGGER update_farm_strategies_updated_at
        BEFORE UPDATE ON farm_strategies
        FOR EACH ROW
        EXECUTE FUNCTION update_farm_strategies_updated_at();
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Try to create the functions directly
    try {
      console.log('Creating stored procedures...');
      await client.rpc('execute_sql', { sql: createTradingStrategiesTableSql });
      await client.rpc('execute_sql', { sql: createFarmStrategiesTableSql });
    } catch (error) {
      console.log('Error creating stored procedures, using direct queries...');
      
      // Try direct table creation if functions fail
      const directCreateTradingStrategiesSql = `
        CREATE TABLE IF NOT EXISTS trading_strategies (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          strategy_type VARCHAR(50) NOT NULL,
          parameters JSONB NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT true,
          performance_metrics JSONB NOT NULL DEFAULT '{}',
          backtest_results JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `;
      
      const directCreateFarmStrategiesSql = `
        CREATE TABLE IF NOT EXISTS farm_strategies (
          id BIGSERIAL PRIMARY KEY,
          farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
          strategy_id BIGINT NOT NULL REFERENCES trading_strategies(id) ON DELETE CASCADE,
          allocation DECIMAL(5,2) NOT NULL DEFAULT 0.0,
          config JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          UNIQUE(farm_id, strategy_id)
        );
      `;
      
      try {
        // Use direct queries
        console.log('Executing direct SQL...');
        
        // First, query an existing table to see if our connection works
        const { data, error } = await client.from('farms').select('*').limit(1);
        
        if (error) {
          console.error('Connection error:', error);
        } else {
          console.log('Connection successful, creating tables...');
          
          // Try creating tables directly using supabase functions
          const { error: directError1 } = await client.rpc('execute_sql', { sql: directCreateTradingStrategiesSql });
          if (directError1) console.error('Error creating trading_strategies table:', directError1);
          
          const { error: directError2 } = await client.rpc('execute_sql', { sql: directCreateFarmStrategiesSql });
          if (directError2) console.error('Error creating farm_strategies table:', directError2);
        }
      } catch (directError) {
        console.error('Error creating tables directly:', directError);
        
        // Last resort - use an insert with RLS handling
        console.log('Attempting direct insert...');
        
        // Try to create a minimal record just to create the table through RLS
        await client.from('trading_strategies').insert({
          name: 'Test Strategy',
          description: 'Test description',
          strategy_type: 'momentum',
          parameters: {},
          is_active: true,
          performance_metrics: {},
          backtest_results: {}
        });
        
        await client.from('farm_strategies').insert({
          farm_id: 1, 
          strategy_id: 1,
          allocation: 0.5,
          config: {}
        });
      }
    }
    
    // Verify tables exist
    console.log('\nVerifying tables...');
    const { data: farmData, error: farmError } = await client.from('farms').select('*').limit(1);
    const { data: strategyData, error: strategyError } = await client.from('trading_strategies').select('*').limit(1);
    const { data: farmStrategyData, error: farmStrategyError } = await client.from('farm_strategies').select('*').limit(1);
    
    console.log('farms table:', farmError ? 'Error' : 'OK');
    console.log('trading_strategies table:', strategyError ? 'Error: ' + strategyError.message : 'OK');
    console.log('farm_strategies table:', farmStrategyError ? 'Error: ' + farmStrategyError.message : 'OK');
    
    console.log('\nMigration completed!');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Run the migration
createTradingStrategiesTable().catch(console.error);
