import { SupabaseClientFactory, getSupabaseClient } from './lib/supabase-client';

/**
 * Test script to verify real-time subscriptions with Supabase
 */
async function testRealtimeSubscriptions() {
  console.log('Testing Trading Farm Real-time Subscriptions...');
  
  // Initialize the Supabase client with API key
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
  SupabaseClientFactory.initialize(apiKey);
  const client = getSupabaseClient();
  
  // Ensure real-time is enabled
  client.realtime.setAuth(apiKey);
  
  console.log('\n--------- Setting Up Subscriptions ---------');
  
  // Subscribe to farms table changes
  const farmsSubscription = client
    .channel('farms-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'farms'
      },
      (payload) => {
        console.log('Farms change received:', payload.eventType);
        console.log('Changed farm:', payload.new);
      }
    )
    .subscribe((status) => {
      console.log(`Farms subscription status: ${status}`);
    });
    
  // Subscribe to market_data table changes  
  const marketDataSubscription = client
    .channel('market-data-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'market_data'
      },
      (payload) => {
        console.log('Market data change received:', payload.eventType);
        console.log('Changed market data:', payload.new);
      }
    )
    .subscribe((status) => {
      console.log(`Market data subscription status: ${status}`);
    });
  
  // Subscribe to eliza_commands table changes
  const elizaCommandsSubscription = client
    .channel('eliza-commands-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'eliza_commands'
      },
      (payload) => {
        console.log('Eliza command change received:', payload.eventType);
        console.log('Changed command:', payload.new);
      }
    )
    .subscribe((status) => {
      console.log(`Eliza commands subscription status: ${status}`);
    });
    
  console.log('\n--------- Testing Data Changes ---------');
  
  // Create a new farm to trigger the subscription
  const { data: farmData, error: farmError } = await client
    .from('farms')
    .insert({
      name: 'Real-time Test Farm ' + new Date().toISOString(),
      description: 'A test farm for real-time subscription verification',
      is_active: true,
      risk_profile: { max_drawdown: 5 },
      performance_metrics: { win_rate: 0 },
      config: { test_mode: true },
      metadata: { created_by: 'realtime_test' }
    })
    .select();
    
  if (farmError) {
    console.error('Error creating test farm:', farmError);
  } else {
    console.log('Created test farm successfully, check for subscription events');
  }
  
  // Create a new market data entry to trigger the subscription
  let marketDataEntry = null;
  try {
    // First check what fields are available in the market_data table
    const { data: market_data_sample, error: sample_error } = await client
      .from('market_data')
      .select('*')
      .limit(1);
      
    if (sample_error) {
      console.error('Error fetching market_data sample:', sample_error);
    } else {
      console.log('Market data sample fields:', Object.keys(market_data_sample[0] || {}));
      
      // Create a new entry with the fields that actually exist
      const newMarketData: any = {
        symbol: 'BTC/USD',
        // Only add fields that we know exist
        source: 'realtime_test',
      };
      
      // Dynamically add fields if they exist in the sample
      if (market_data_sample[0]) {
        if ('exchange' in market_data_sample[0]) newMarketData.exchange = 'binance';
        if ('data_type' in market_data_sample[0]) newMarketData.data_type = 'ticker';
        if ('data' in market_data_sample[0]) newMarketData.data = { price: 65432.10 };
        if ('market_data' in market_data_sample[0]) newMarketData.market_data = { price: 65432.10 };
        if ('fetched_at' in market_data_sample[0]) newMarketData.fetched_at = new Date().toISOString();
      }
      
      const { data: marketData, error: marketError } = await client
        .from('market_data')
        .insert(newMarketData)
        .select();
        
      if (marketError) {
        console.error('Error creating market data:', marketError);
      } else {
        console.log('Created market data successfully, check for subscription events');
        marketDataEntry = marketData[0];
      }
    }
  } catch (error) {
    console.error('Exception creating market data:', error);
  }
  
  // Create a new eliza command to trigger the subscription
  const { data: elizaData, error: elizaError } = await client
    .from('eliza_commands')
    .insert({
      command: 'test real-time subscription',
      source: 'test',
      metadata: { test_id: new Date().getTime() }
    })
    .select();
    
  if (elizaError) {
    console.error('Error creating eliza command:', elizaError);
  } else {
    console.log('Created eliza command successfully, check for subscription events');
  }
  
  console.log('\n--------- Waiting for subscription events ---------');
  console.log('Waiting for 5 seconds to receive events...');
  
  // Wait for events to be received
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n--------- Cleaning up ---------');
  
  // Unsubscribe from all channels
  await farmsSubscription.unsubscribe();
  await marketDataSubscription.unsubscribe();
  await elizaCommandsSubscription.unsubscribe();
  
  console.log('Unsubscribed from all channels');
  
  // Delete test data
  // Note: This won't trigger subscription events since we've unsubscribed
  if (farmData && farmData[0]) {
    const { error } = await client
      .from('farms')
      .delete()
      .eq('id', farmData[0].id);
      
    if (error) {
      console.error('Error deleting test farm:', error);
    } else {
      console.log('Test farm deleted successfully');
    }
  }
  
  if (marketDataEntry) {
    const { error } = await client
      .from('market_data')
      .delete()
      .eq('id', marketDataEntry.id);
      
    if (error) {
      console.error('Error deleting market data:', error);
    } else {
      console.log('Market data deleted successfully');
    }
  }
  
  if (elizaData && elizaData[0]) {
    const { error } = await client
      .from('eliza_commands')
      .delete()
      .eq('id', elizaData[0].id);
      
    if (error) {
      console.error('Error deleting eliza command:', error);
    } else {
      console.log('Eliza command deleted successfully');
    }
  }
  
  console.log('\n--------- Real-time Subscription Testing Complete ---------');
}

// Run the test
testRealtimeSubscriptions().catch(console.error);
