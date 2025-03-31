/**
 * Setup Script for Trading Farm Dashboard + ElizaOS Integration
 * 
 * This script performs the initial setup to connect the Trading Farm Dashboard
 * with the ElizaOS backend, setting up database connections, initializing services,
 * and registering event handlers.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database.types';
import integration from './init';

// Config
const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-supabase-project.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  elizaOS: {
    serverUrl: process.env.ELIZAOS_SERVER_URL || 'ws://localhost:8765',
  },
  paths: {
    migrations: path.join(__dirname, 'migrations'),
    dashboard: path.join(__dirname, '..', 'trading-farm-dashboard')
  }
};

/**
 * Main setup function
 */
async function setup() {
  console.log('=== Trading Farm Dashboard + ElizaOS Integration Setup ===');
  
  try {
    // 1. Validate environment setup
    validateEnvironment();
    
    // 2. Create Supabase client
    const supabase = createClient<Database>(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. Run database migrations
    await runMigrations(supabase);
    
    // 4. Seed initial data
    await seedInitialData(supabase);
    
    // 5. Initialize the integration with ElizaOS
    const integrated = await integration.initialize();
    
    if (!integrated) {
      throw new Error('Failed to initialize integration with ElizaOS');
    }
    
    console.log('=== Integration setup completed successfully ===');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

/**
 * Validate that the environment is properly set up
 */
function validateEnvironment() {
  console.log('Validating environment...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'ELIZAOS_SERVER_URL'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using default values for missing variables - not recommended for production.');
  }
  
  // Check if directories exist
  if (!fs.existsSync(config.paths.dashboard)) {
    throw new Error(`Dashboard directory not found at ${config.paths.dashboard}`);
  }
  
  if (!fs.existsSync(config.paths.migrations)) {
    throw new Error(`Migrations directory not found at ${config.paths.migrations}`);
  }
  
  console.log('Environment validation complete.');
}

/**
 * Run all SQL migrations
 */
async function runMigrations(supabase: any) {
  console.log('Running database migrations...');
  
  // Get list of migration files sorted by name
  const migrationFiles = fs.readdirSync(config.paths.migrations)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (migrationFiles.length === 0) {
    console.log('No migration files found.');
    return;
  }
  
  console.log(`Found ${migrationFiles.length} migration files.`);
  
  // Run each migration
  for (const migrationFile of migrationFiles) {
    const filePath = path.join(config.paths.migrations, migrationFile);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Applying migration: ${migrationFile}...`);
    
    try {
      // Split by semicolons to handle multiple SQL statements
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        const { error } = await supabase.rpc('pg_advisory_lock', { key: 1 });
        if (error) throw error;
        
        const { error: queryError } = await supabase.query(statement + ';');
        
        const { error: unlockError } = await supabase.rpc('pg_advisory_unlock', { key: 1 });
        if (unlockError) throw unlockError;
        
        if (queryError) throw queryError;
      }
      
      console.log(`Migration ${migrationFile} applied successfully.`);
    } catch (error) {
      console.error(`Error applying migration ${migrationFile}:`, error);
      throw error;
    }
  }
  
  console.log('All migrations completed successfully.');
}

/**
 * Seed initial data in the database
 */
async function seedInitialData(supabase: any) {
  console.log('Seeding initial data...');
  
  // Check if master wallet exists
  const { data: masterWallets, error } = await supabase
    .from('master_wallets')
    .select('*');
  
  if (error) {
    throw error;
  }
  
  // Create master wallet if none exists
  if (masterWallets.length === 0) {
    console.log('Creating master wallet...');
    
    const { error: insertError } = await supabase
      .from('master_wallets')
      .insert({
        name: 'Trading Farm Master Vault',
        total_balance: 1000000.00,
        allocated_to_farms: 0,
        reserve_funds: 1000000.00,
        high_risk_exposure: 0,
        security_score: 95,
        status: 'active'
      });
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('Master wallet created successfully.');
  } else {
    console.log('Master wallet already exists, skipping creation.');
  }
  
  // Create initial strategy if none exists
  const { data: strategies, error: strategyError } = await supabase
    .from('strategies')
    .select('*');
  
  if (strategyError) {
    throw strategyError;
  }
  
  if (strategies.length === 0) {
    console.log('Creating initial trading strategies...');
    
    const initialStrategies = [
      {
        name: 'Conservative Growth',
        description: 'Low-risk strategy focused on stable growth with minimal volatility',
        risk_level: 'low',
        parameters: {
          max_position_size: 0.05,
          stop_loss_percentage: 0.01,
          take_profit_percentage: 0.02,
          max_open_positions: 5
        },
        status: 'active'
      },
      {
        name: 'Balanced Alpha',
        description: 'Medium-risk strategy balancing growth and stability',
        risk_level: 'medium',
        parameters: {
          max_position_size: 0.1,
          stop_loss_percentage: 0.02,
          take_profit_percentage: 0.04,
          max_open_positions: 10
        },
        status: 'active'
      },
      {
        name: 'High-Growth Alpha',
        description: 'High-risk strategy focused on maximum growth potential',
        risk_level: 'high',
        parameters: {
          max_position_size: 0.2,
          stop_loss_percentage: 0.05,
          take_profit_percentage: 0.1,
          max_open_positions: 15
        },
        status: 'active'
      }
    ];
    
    const { error: insertError } = await supabase
      .from('strategies')
      .insert(initialStrategies);
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('Initial trading strategies created successfully.');
  } else {
    console.log('Trading strategies already exist, skipping creation.');
  }
  
  console.log('Initial data seeding completed.');
}

// Run setup if called directly
if (require.main === module) {
  setup().catch(console.error);
}

export default setup;
