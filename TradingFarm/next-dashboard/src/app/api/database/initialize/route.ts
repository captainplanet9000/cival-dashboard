/**
 * Server-side API route to safely initialize the database connections
 * Uses environment variables for secure API key handling
 */
import { NextResponse } from 'next/server';
import tradingFarmDb from '@/utils/database';

// Load API keys from environment variables
// In production, these would be set in the deployment environment
process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_4KdNTG_wMLhtKCjuUfk2H8bL6kZvLocJH1Xdrnia5mokuxSzDiMFt4HgASf4pHtuva8F9';
process.env.NEON_CONNECTION_STRING = process.env.NEON_CONNECTION_STRING || 'postgres://default:napi_s70cf7v9o45i1fui1ywaauxwogngmyfgh4oru2vx90e9vexy10b1grf9dg5jl98g@ep-dawn-lab-02356201.us-east-2.aws.neon.tech/neondb?sslmode=require';

export async function GET() {
  try {
    // Initialize database connections
    await tradingFarmDb.initialize();
    
    // Set up initial data for testing/development
    await setupInitialData();
    
    return NextResponse.json({
      success: true,
      message: 'Trading Farm database infrastructure initialized successfully'
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize database',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper function to set up initial test data
async function setupInitialData() {
  // Create sample farms if none exist
  const farms = await tradingFarmDb.getFarms();
  
  if (farms.length === 0) {
    console.log('Setting up initial farm data...');
    
    // Create sample farms
    const alphaFarm = await tradingFarmDb.createFarm({
      name: 'Alpha Farm',
      status: 'active',
      boss_man_model: 'gpt-4-turbo'
    });
    
    const betaFarm = await tradingFarmDb.createFarm({
      name: 'Beta Farm',
      status: 'active',
      boss_man_model: 'gpt-4o'
    });
    
    const gammaFarm = await tradingFarmDb.createFarm({
      name: 'Gamma Farm',
      status: 'maintenance',
      boss_man_model: 'claude-3-opus'
    });
    
    // Add sample strategy knowledge documents
    await tradingFarmDb.addStrategyDocument({
      id: 'strat-doc-1',
      title: 'DCA Strategy Implementation',
      content: 'Dollar-cost averaging (DCA) is an investment strategy where a fixed amount is invested at regular intervals, regardless of price. This reduces the impact of volatility.',
      category: 'strategy',
      source: 'internal',
      created_at: new Date().toISOString(),
      farm_id: alphaFarm.id
    });
    
    await tradingFarmDb.addStrategyDocument({
      id: 'strat-doc-2',
      title: 'Grid Trading Patterns',
      content: 'Grid trading involves placing buy and sell orders at regular intervals above and below the current market price. This strategy works well in range-bound markets.',
      category: 'strategy',
      source: 'research',
      created_at: new Date().toISOString(),
      farm_id: betaFarm.id
    });
    
    // Add sample ElizaOS commands
    await tradingFarmDb.addElizaCommand({
      id: 'cmd-1',
      command: 'Create new farm',
      intent: 'farm_creation',
      parameters: {
        name: { type: 'string', required: true },
        boss_man_model: { type: 'string', required: true, options: ['gpt-4-turbo', 'gpt-4o', 'claude-3-opus'] }
      },
      example_phrases: [
        'Create a new farm called Alpha',
        'Set up a trading farm with GPT-4',
        'I need a new farm for my strategy'
      ],
      created_at: new Date().toISOString()
    });
    
    await tradingFarmDb.addElizaCommand({
      id: 'cmd-2',
      command: 'Run performance analysis',
      intent: 'performance_analysis',
      parameters: {
        farm_id: { type: 'string', required: true },
        timeframe: { type: 'string', required: false, default: '1w' }
      },
      example_phrases: [
        'Analyze the performance of Alpha Farm',
        'How is my Beta Farm doing?',
        'Run a performance check on all farms'
      ],
      created_at: new Date().toISOString()
    });
    
    // Log some sample message bus activity
    await tradingFarmDb.logMessageBusActivity(
      alphaFarm.id,
      betaFarm.id,
      'strategy_sync',
      'Syncing DCA parameters from Alpha Farm to Beta Farm'
    );
    
    await tradingFarmDb.logMessageBusActivity(
      betaFarm.id,
      gammaFarm.id,
      'market_alert',
      'High volatility detected in BTC/USD pair - adjusting grid trading parameters'
    );
    
    console.log('Initial data setup complete');
  }
}
