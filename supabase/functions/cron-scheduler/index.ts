// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/supabase_edge_functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { parse as parseCron } from 'https://deno.land/x/cron_parser@v1.0.0/mod.ts'

// Scheduled tasks that can be run
enum ScheduledTaskType {
  FARM_STATUS_UPDATE = 'farm_status_update',
  PERFORMANCE_METRICS = 'performance_metrics',
  RISK_ASSESSMENT = 'risk_assessment',
  STRATEGY_OPTIMIZATION = 'strategy_optimization',
  MARKET_DATA_SYNC = 'market_data_sync',
  WALLET_BALANCE_SYNC = 'wallet_balance_sync',
  POSITION_CLEANUP = 'position_cleanup',
  NOTIFICATION_DIGEST = 'notification_digest',
}

interface ScheduledJob {
  id: string;
  farm_id: string;
  name: string;
  job_type: string;
  cron_expression: string;
  parameters: Record<string, any>;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

Deno.serve(async (req) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables for Supabase client');
    }

    // For cron-triggered execution, verify the secret
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get('secret');
    
    if (cronSecret && cronSecret !== providedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Initialize Supabase client with service role key (for admin operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different HTTP methods
    if (req.method === 'POST') {
      // Manual execution of a specific job
      const { jobId } = await req.json();
      
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'Missing job ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      return await executeJob(supabase, jobId);
    } else {
      // GET request - run scheduler to find and execute due jobs
      return await runScheduler(supabase);
    }
  } catch (error) {
    // Handle any errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Scheduler error: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Run the scheduler to find and execute due jobs
async function runScheduler(supabase: any): Promise<Response> {
  try {
    // Find active jobs that are due to run
    const { data: dueJobs, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('is_active', true)
      .or('next_run_at.is.null,next_run_at.lte.now()');
    
    if (error) {
      throw new Error(`Error fetching due jobs: ${error.message}`);
    }
    
    console.log(`Found ${dueJobs?.length || 0} jobs due for execution`);
    
    // Execute each due job
    const results = [];
    for (const job of (dueJobs || [])) {
      try {
        const result = await processJob(supabase, job);
        results.push({ jobId: job.id, status: 'success', result });
      } catch (error) {
        console.error(`Error executing job ${job.id}:`, error);
        results.push({ 
          jobId: job.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        executed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// Execute a specific job by ID
async function executeJob(supabase: any, jobId: string): Promise<Response> {
  try {
    // Find the job
    const { data: jobs, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('id', jobId)
      .limit(1);
    
    if (error) {
      throw new Error(`Error fetching job: ${error.message}`);
    }
    
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    const job = jobs[0];
    
    // Process the job
    const result = await processJob(supabase, job);
    
    return new Response(
      JSON.stringify({ 
        jobId: job.id,
        name: job.name,
        type: job.job_type,
        status: 'executed',
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

// Process a job based on its type
async function processJob(supabase: any, job: ScheduledJob): Promise<any> {
  // First update the last run time
  const now = new Date();
  
  // Calculate next run time based on cron expression
  let nextRunAt: Date | null = null;
  try {
    const cronSchedule = parseCron(job.cron_expression);
    nextRunAt = cronSchedule.next();
  } catch (error) {
    console.error(`Error parsing cron expression for job ${job.id}:`, error);
  }
  
  // Update the job status before running it
  const { error: updateError } = await supabase
    .from('scheduled_jobs')
    .update({
      last_run_at: now.toISOString(),
      next_run_at: nextRunAt?.toISOString() || null,
      updated_at: now.toISOString()
    })
    .eq('id', job.id);
  
  if (updateError) {
    console.error(`Error updating job ${job.id} timestamps:`, updateError);
  }
  
  // Execute the job based on its type
  switch (job.job_type) {
    case ScheduledTaskType.FARM_STATUS_UPDATE:
      return await runFarmStatusUpdate(supabase, job);
    
    case ScheduledTaskType.PERFORMANCE_METRICS:
      return await runPerformanceMetricsUpdate(supabase, job);
    
    case ScheduledTaskType.RISK_ASSESSMENT:
      return await runRiskAssessment(supabase, job);
    
    case ScheduledTaskType.STRATEGY_OPTIMIZATION:
      return await runStrategyOptimization(supabase, job);
    
    case ScheduledTaskType.MARKET_DATA_SYNC:
      return await runMarketDataSync(supabase, job);
    
    case ScheduledTaskType.WALLET_BALANCE_SYNC:
      return await runWalletBalanceSync(supabase, job);
    
    case ScheduledTaskType.POSITION_CLEANUP:
      return await runPositionCleanup(supabase, job);
    
    case ScheduledTaskType.NOTIFICATION_DIGEST:
      return await runNotificationDigest(supabase, job);
    
    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
}

// Farm status update job handler
async function runFarmStatusUpdate(supabase: any, job: ScheduledJob): Promise<any> {
  const farmId = job.farm_id;
  
  // Get the farm
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .single();
  
  if (farmError || !farm) {
    throw new Error(`Error fetching farm: ${farmError?.message || 'Farm not found'}`);
  }
  
  // For demo, we'll just toggle between active and paused
  const newStatus = farm.status === 'active' ? 'paused' : 'active';
  
  // Update the farm status
  const { error } = await supabase
    .from('farms')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', farmId);
  
  if (error) {
    throw new Error(`Error updating farm status: ${error.message}`);
  }
  
  // Create a status update record
  const { data: statusUpdate, error: statusError } = await supabase
    .from('farm_status_updates')
    .insert({
      farm_id: farmId,
      status: newStatus,
      message: `Status automatically changed to ${newStatus} by scheduler`,
      metrics: {},
      updated_by: null
    })
    .select('*')
    .single();
  
  if (statusError) {
    console.error(`Error creating status update record: ${statusError.message}`);
  }
  
  return { 
    previous_status: farm.status,
    new_status: newStatus,
    status_update_id: statusUpdate?.id
  };
}

// Performance metrics update job handler
async function runPerformanceMetricsUpdate(supabase: any, job: ScheduledJob): Promise<any> {
  const farmId = job.farm_id;
  const today = new Date().toISOString().split('T')[0];
  
  // Create a performance snapshot
  const { data: snapshot, error } = await supabase
    .from('farm_performance_snapshots')
    .insert({
      farm_id: farmId,
      snapshot_date: today,
      total_value: 10000 + Math.random() * 1000, // Demo value
      daily_profit_loss: (Math.random() * 200) - 100, // Demo value
      daily_roi: (Math.random() * 0.04) - 0.02, // Demo value
      equity_value: 9000 + Math.random() * 1000, // Demo value
      asset_allocation: {
        'BTC': 0.4,
        'ETH': 0.3,
        'USDT': 0.3
      },
      strategy_allocation: {
        'trend_following': 0.6,
        'mean_reversion': 0.4
      },
      risk_metrics: {
        'sharpe_ratio': 1.2 + Math.random() * 0.5,
        'sortino_ratio': 1.5 + Math.random() * 0.5,
        'max_drawdown': 0.05 + Math.random() * 0.05
      }
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Error creating performance snapshot: ${error.message}`);
  }
  
  // Update the farm with the latest metrics
  await supabase
    .from('farms')
    .update({
      performance_metrics: {
        total_value: snapshot.total_value,
        daily_roi: snapshot.daily_roi,
        asset_allocation: snapshot.asset_allocation,
        updated_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', farmId);
  
  return { 
    snapshot_id: snapshot.id,
    snapshot_date: snapshot.snapshot_date,
    total_value: snapshot.total_value,
    daily_roi: snapshot.daily_roi
  };
}

// Risk assessment job handler
async function runRiskAssessment(supabase: any, job: ScheduledJob): Promise<any> {
  const farmId = job.farm_id;
  const today = new Date().toISOString().split('T')[0];
  
  // Generate a risk score (0-100)
  const riskScore = Math.floor(Math.random() * 100);
  
  // Determine risk level based on score
  let riskLevel = 'low';
  if (riskScore > 70) riskLevel = 'high';
  else if (riskScore > 40) riskLevel = 'medium';
  
  // Create a risk assessment report
  const { data: report, error } = await supabase
    .from('risk_assessment_reports')
    .insert({
      farm_id: farmId,
      report_date: today,
      risk_score: riskScore,
      risk_level: riskLevel,
      value_at_risk: 0.03 + Math.random() * 0.05,
      expected_shortfall: 0.05 + Math.random() * 0.07,
      stress_test_results: [
        { scenario: 'Market Crash', impact: -0.2 - Math.random() * 0.2 },
        { scenario: 'Liquidity Crisis', impact: -0.15 - Math.random() * 0.15 },
        { scenario: 'Interest Rate Hike', impact: -0.05 - Math.random() * 0.05 }
      ],
      risk_by_asset: [
        { asset: 'BTC', risk: 0.2 + Math.random() * 0.1 },
        { asset: 'ETH', risk: 0.15 + Math.random() * 0.1 },
        { asset: 'USDT', risk: 0.01 + Math.random() * 0.01 }
      ],
      risk_by_strategy: [
        { strategy: 'Trend Following', risk: 0.1 + Math.random() * 0.1 },
        { strategy: 'Mean Reversion', risk: 0.15 + Math.random() * 0.1 }
      ],
      recommendations: [
        'Consider rebalancing portfolio to reduce volatility',
        'Maintain adequate stablecoin reserves',
        'Monitor market conditions closely'
      ]
    })
    .select('*')
    .single();
  
  if (error) {
    throw new Error(`Error creating risk assessment report: ${error.message}`);
  }
  
  // If risk level is high, create a notification
  if (riskLevel === 'high') {
    const { data: farm } = await supabase
      .from('farms')
      .select('owner_id, name')
      .eq('id', farmId)
      .single();
    
    if (farm) {
      await supabase.rpc('create_notification', {
        user_id: farm.owner_id,
        title: '⚠️ High Risk Alert',
        message: `Your farm "${farm.name}" has a high risk score of ${riskScore}/100.`,
        event_type: 'risk_alert',
        link: `/farms/${farmId}/analytics/risk`,
        data: { 
          farm_id: farmId, 
          risk_score: riskScore,
          risk_level: riskLevel
        }
      });
    }
  }
  
  return { 
    report_id: report.id,
    report_date: report.report_date,
    risk_score: report.risk_score,
    risk_level: report.risk_level,
    notification_sent: riskLevel === 'high'
  };
}

// Strategy optimization job handler (placeholder)
async function runStrategyOptimization(supabase: any, job: ScheduledJob): Promise<any> {
  const farmId = job.farm_id;
  
  // In a real implementation, this would run optimization algorithms
  // For demo, we'll just log that it ran
  
  // Log the job execution
  await supabase
    .from('audit_logs')
    .insert({
      farm_id: farmId,
      action: 'scheduler.strategy_optimization',
      resource_type: 'scheduler',
      resource_id: job.id,
      details: {
        job_id: job.id,
        farm_id: farmId,
        parameters: job.parameters
      }
    });
  
  return { 
    job_id: job.id,
    farm_id: farmId,
    status: 'completed',
    message: 'Strategy optimization simulation completed'
  };
}

// Market data sync job handler (placeholder)
async function runMarketDataSync(supabase: any, job: ScheduledJob): Promise<any> {
  const markets = job.parameters?.markets || ['BTC/USD', 'ETH/USD'];
  
  // In a real implementation, this would fetch market data from APIs
  // For demo, we'll just create some cache entries with random data
  
  const results = [];
  for (const market of markets) {
    const now = new Date();
    const startTime = new Date(now.getTime() - 86400000); // 24 hours ago
    
    // Create or update market data cache
    const { data, error } = await supabase
      .from('market_data_cache')
      .upsert({
        market,
        timeframe: '1h',
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        data: generateRandomOHLCData(24), // 24 hours of data
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 3600000).toISOString() // Expires in 1 hour
      }, {
        onConflict: 'market,timeframe,start_time,end_time'
      })
      .select('id')
      .single();
    
    results.push({
      market,
      status: error ? 'error' : 'success',
      cache_id: data?.id,
      error: error?.message
    });
  }
  
  return { 
    job_id: job.id,
    markets_synced: results.length,
    results
  };
}

// Helper to generate random OHLC data for market data cache
function generateRandomOHLCData(periods: number) {
  const data = [];
  let lastClose = 40000 + Math.random() * 5000; // Base price for BTC
  
  for (let i = 0; i < periods; i++) {
    const volatility = lastClose * 0.02; // 2% volatility
    const open = lastClose;
    const high = open + volatility * Math.random();
    const low = open - volatility * Math.random();
    const close = low + (high - low) * Math.random();
    const volume = 10 + Math.random() * 100;
    
    data.push({
      timestamp: new Date(Date.now() - (periods - i) * 3600000).toISOString(),
      open,
      high,
      low,
      close,
      volume
    });
    
    lastClose = close;
  }
  
  return data;
}

// Wallet balance sync job handler (placeholder)
async function runWalletBalanceSync(supabase: any, job: ScheduledJob): Promise<any> {
  const farmId = job.farm_id;
  
  // Get the farm's wallets
  const { data: wallets, error } = await supabase
    .from('farm_wallets')
    .select('*')
    .eq('farm_id', farmId);
  
  if (error) {
    throw new Error(`Error fetching farm wallets: ${error.message}`);
  }
  
  if (!wallets || wallets.length === 0) {
    return { message: 'No wallets found for this farm' };
  }
  
  // In a real implementation, this would call blockchain APIs to get balances
  // For demo, we'll just update the balances with random data
  
  const results = [];
  for (const wallet of wallets) {
    // Generate random balances for common tokens
    const tokenBalances = {
      'BTC': 1 + Math.random() * 2,
      'ETH': 10 + Math.random() * 20,
      'USDT': 10000 + Math.random() * 5000,
      'SOL': 100 + Math.random() * 200
    };
    
    // Update the wallet
    const { data, error: updateError } = await supabase
      .from('farm_wallets')
      .update({
        token_balances: tokenBalances,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)
      .select('id')
      .single();
    
    results.push({
      wallet_id: wallet.id,
      wallet_name: wallet.name,
      status: updateError ? 'error' : 'success',
      error: updateError?.message
    });
  }
  
  return { 
    job_id: job.id,
    wallets_updated: results.length,
    results
  };
}

// Position cleanup job handler (placeholder)
async function runPositionCleanup(supabase: any, job: ScheduledJob): Promise<any> {
  const farmId = job.farm_id;
  
  // In a real implementation, this would close expired positions, cancel old orders, etc.
  // For demo, we'll just cancel any orders that are more than a day old
  
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  
  // Find old open orders
  const { data: oldOrders, error } = await supabase
    .from('orders')
    .select('id')
    .eq('farm_id', farmId)
    .eq('status', 'open')
    .lt('created_at', yesterday);
  
  if (error) {
    throw new Error(`Error fetching old orders: ${error.message}`);
  }
  
  if (!oldOrders || oldOrders.length === 0) {
    return { message: 'No old orders found to clean up' };
  }
  
  // Cancel the old orders
  const orderIds = oldOrders.map(order => order.id);
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .in('id', orderIds);
  
  if (updateError) {
    throw new Error(`Error canceling old orders: ${updateError.message}`);
  }
  
  return { 
    job_id: job.id,
    orders_canceled: orderIds.length,
    order_ids: orderIds
  };
}

// Notification digest job handler
async function runNotificationDigest(supabase: any, job: ScheduledJob): Promise<any> {
  const farmId = job.farm_id;
  
  // Get the farm owner
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('owner_id, name')
    .eq('id', farmId)
    .single();
  
  if (farmError || !farm) {
    throw new Error(`Error fetching farm: ${farmError?.message || 'Farm not found'}`);
  }
  
  // Get unread notifications for this user
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', farm.owner_id)
    .eq('is_read', false)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Error fetching notifications: ${error.message}`);
  }
  
  if (!notifications || notifications.length === 0) {
    return { message: 'No unread notifications to digest' };
  }
  
  // Group notifications by type
  const groupedNotifications: Record<string, any[]> = {};
  notifications.forEach(notification => {
    if (!groupedNotifications[notification.event_type]) {
      groupedNotifications[notification.event_type] = [];
    }
    groupedNotifications[notification.event_type].push(notification);
  });
  
  // Create a digest notification
  const { data: digest, error: digestError } = await supabase.rpc('create_notification', {
    user_id: farm.owner_id,
    title: `Daily Digest for ${farm.name}`,
    message: `You have ${notifications.length} unread notifications. Check your dashboard for details.`,
    event_type: 'notification_digest',
    link: '/notifications',
    data: { 
      farm_id: farmId, 
      notification_count: notifications.length,
      notification_types: Object.keys(groupedNotifications),
      created_at: new Date().toISOString()
    }
  });
  
  if (digestError) {
    console.error(`Error creating digest notification: ${digestError.message}`);
  }
  
  return { 
    job_id: job.id,
    notifications_count: notifications.length,
    notification_types: Object.keys(groupedNotifications),
    digest_created: !!digest
  };
} 