/**
 * Monitoring and Operations Integration Test
 * 
 * This script tests the integration between real-time trading data and the monitoring system.
 * It verifies alert generation, notification delivery, and report generation.
 */

import { createClient } from '@supabase/supabase-js';
import { AlertEvaluationService } from '@/services/monitoring/alert-evaluation-service';
import { AlertManagementService } from '@/services/monitoring/alert-management-service';
import { NotificationService } from '@/services/monitoring/notification-service';
import { ReportGenerationService } from '@/services/monitoring/report-generation-service';
import { AlertEvaluationJob } from '@/services/background/alert-evaluation-job';
import dotenv from 'dotenv';
import ccxt from 'ccxt';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user - replace with a valid user ID from your database
const TEST_USER_ID = 'replace-with-valid-user-id';

/**
 * Main integration test function
 */
async function runIntegrationTests() {
  console.log('Starting Monitoring and Operations Integration Tests');
  console.log('===============================================');

  try {
    // Set up test data
    await setupTestData();

    // Run individual test suites
    await testRealTimeMarketDataAlerts();
    await testExchangeConnectionAlerts();
    await testAgentPerformanceAlerts();
    await testPositionDrawdownAlerts();
    await testAlertRuleEvaluation();
    await testNotificationDelivery();
    await testReportGeneration();

    console.log('===============================================');
    console.log('All integration tests completed successfully!');
  } catch (error) {
    console.error('Integration test failed:', error);
    process.exit(1);
  }
}

/**
 * Set up test data for integration testing
 */
async function setupTestData() {
  console.log('\n🔧 Setting up test data...');

  // Create test farm if it doesn't exist
  const { data: farms, error: farmError } = await supabase
    .from('farms')
    .select('id')
    .eq('user_id', TEST_USER_ID)
    .limit(1);

  if (farmError) throw farmError;

  let farmId: number;

  if (farms && farms.length > 0) {
    farmId = farms[0].id;
    console.log(`Using existing farm with ID: ${farmId}`);
  } else {
    const { data: newFarm, error: createError } = await supabase
      .from('farms')
      .insert({
        user_id: TEST_USER_ID,
        name: 'Integration Test Farm',
        description: 'Farm created for integration testing',
      })
      .select()
      .single();

    if (createError) throw createError;
    farmId = newFarm.id;
    console.log(`Created new test farm with ID: ${farmId}`);
  }

  // Create test agent if it doesn't exist
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', TEST_USER_ID)
    .eq('farm_id', farmId)
    .limit(1);

  if (agentError) throw agentError;

  let agentId: number;

  if (agents && agents.length > 0) {
    agentId = agents[0].id;
    console.log(`Using existing agent with ID: ${agentId}`);
  } else {
    const { data: newAgent, error: createAgentError } = await supabase
      .from('agents')
      .insert({
        user_id: TEST_USER_ID,
        farm_id: farmId,
        name: 'Integration Test Agent',
        description: 'Agent created for integration testing',
        status: 'active',
        type: 'spot',
      })
      .select()
      .single();

    if (createAgentError) throw createAgentError;
    agentId = newAgent.id;
    console.log(`Created new test agent with ID: ${agentId}`);
  }

  // Create test alert rules
  await createTestAlertRules(TEST_USER_ID, farmId, agentId);

  // Set up notification preferences
  await setupNotificationPreferences(TEST_USER_ID);

  console.log('Test data setup complete ✅');
  return { farmId, agentId };
}

/**
 * Create test alert rules
 */
async function createTestAlertRules(userId: string, farmId: number, agentId: number) {
  console.log('\n🔧 Setting up test alert rules...');

  // Clear any existing test alert rules
  const { error: deleteError } = await supabase
    .from('alert_rules')
    .delete()
    .eq('user_id', userId)
    .ilike('name', 'Test Alert Rule%');

  if (deleteError) {
    console.warn('Error clearing existing test rules:', deleteError.message);
  }

  // Test alert rules
  const testRules = [
    // Price change alert rule
    {
      user_id: userId,
      farm_id: farmId,
      name: 'Test Alert Rule - BTC Price Increase',
      description: 'Alert when BTC price increases by more than 2% in 24h',
      rule_type: 'price_change',
      conditions: [
        {
          metric: 'symbol',
          operator: 'eq',
          value: 'BTC/USDT'
        },
        {
          metric: 'price_change_percent',
          operator: 'gt',
          value: 2.0
        }
      ],
      level: 'info',
      notification_channels: ['ui', 'email'],
      is_active: true,
      throttle_minutes: 60
    },
    // Volume change alert rule
    {
      user_id: userId,
      farm_id: farmId,
      name: 'Test Alert Rule - Unusual Trading Volume',
      description: 'Alert when ETH trading volume spikes',
      rule_type: 'volume_change',
      conditions: [
        {
          metric: 'symbol',
          operator: 'eq',
          value: 'ETH/USDT'
        },
        {
          metric: 'volume_24h',
          operator: 'gt',
          value: 1000000000
        }
      ],
      level: 'warning',
      notification_channels: ['ui'],
      is_active: true,
      throttle_minutes: 120
    },
    // Drawdown alert rule
    {
      user_id: userId,
      farm_id: farmId,
      name: 'Test Alert Rule - Position Drawdown',
      description: 'Alert on significant position drawdown',
      rule_type: 'position_drawdown',
      conditions: [
        {
          metric: 'drawdown',
          operator: 'gt',
          value: 5.0
        }
      ],
      level: 'warning',
      notification_channels: ['ui', 'email'],
      is_active: true,
      throttle_minutes: 30
    },
    // API limit alert rule
    {
      user_id: userId,
      farm_id: farmId,
      name: 'Test Alert Rule - API Usage',
      description: 'Alert when API usage is high',
      rule_type: 'api_limit',
      conditions: [
        {
          metric: 'api_usage_percent',
          operator: 'gt',
          value: 80.0
        }
      ],
      level: 'error',
      notification_channels: ['ui', 'email'],
      is_active: true,
      throttle_minutes: 15
    },
    // Agent status alert rule
    {
      user_id: userId,
      farm_id: farmId,
      name: 'Test Alert Rule - Agent Error',
      description: 'Alert when agent encounters errors',
      rule_type: 'agent_status',
      conditions: [
        {
          metric: 'agent_id',
          operator: 'eq',
          value: agentId
        },
        {
          metric: 'status',
          operator: 'eq',
          value: 'error'
        }
      ],
      level: 'error',
      notification_channels: ['ui', 'email'],
      is_active: true,
      throttle_minutes: 5
    }
  ];

  // Insert test rules
  for (const rule of testRules) {
    const { data, error } = await supabase
      .from('alert_rules')
      .insert(rule)
      .select()
      .single();

    if (error) {
      console.error(`Error creating test rule "${rule.name}":`, error.message);
    } else {
      console.log(`Created test rule "${rule.name}" with ID: ${data.id}`);
    }
  }

  console.log('Alert rules setup complete ✅');
}

/**
 * Set up notification preferences
 */
async function setupNotificationPreferences(userId: string) {
  console.log('\n🔧 Setting up notification preferences...');

  // Check if notification preferences exist
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    // Update existing preferences
    const { error: updateError } = await supabase
      .from('notification_preferences')
      .update({
        email_alerts: true,
        push_notifications: true,
        sms_alerts: false,
        telegram_alerts: false,
        email_frequency: 'immediate',
        min_alert_level: 'info',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;
    console.log('Updated existing notification preferences');
  } else {
    // Create new preferences
    const { error: insertError } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        email_alerts: true,
        push_notifications: true,
        sms_alerts: false,
        telegram_alerts: false,
        email_frequency: 'immediate',
        min_alert_level: 'info'
      });

    if (insertError) throw insertError;
    console.log('Created new notification preferences');
  }

  console.log('Notification preferences setup complete ✅');
}

/**
 * Test real-time market data alerts
 */
async function testRealTimeMarketDataAlerts() {
  console.log('\n🧪 Testing real-time market data alerts...');

  try {
    // Fetch real-time market data using ccxt
    console.log('Fetching real-time market data from exchanges...');
    
    // Initialize exchange (read-only public API, no authentication needed)
    const binance = new ccxt.binance();
    
    // Fetch market data for BTC/USDT and ETH/USDT
    const btcTicker = await binance.fetchTicker('BTC/USDT');
    const ethTicker = await binance.fetchTicker('ETH/USDT');
    
    console.log(`BTC/USDT: ${btcTicker.last} (24h change: ${btcTicker.percentage}%)`);
    console.log(`ETH/USDT: ${ethTicker.last} (24h change: ${ethTicker.percentage}%)`);
    
    // Create a simulated market data alert based on real data
    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .limit(1);
    
    if (!farms || farms.length === 0) {
      throw new Error('No test farm found');
    }
    
    const farmId = farms[0].id;
    
    // Create alert for significant price movement (if any)
    if (Math.abs(btcTicker.percentage) > 1.5) {
      const direction = btcTicker.percentage > 0 ? 'increase' : 'decrease';
      
      const alert = {
        user_id: TEST_USER_ID,
        farm_id: farmId,
        alert_type: 'price_change',
        level: Math.abs(btcTicker.percentage) > 3 ? 'warning' : 'info',
        message: `BTC/USDT price ${direction} of ${Math.abs(btcTicker.percentage).toFixed(2)}% in last 24h`,
        details: {
          symbol: 'BTC/USDT',
          price: btcTicker.last,
          change_percent: btcTicker.percentage,
          volume: btcTicker.quoteVolume
        }
      };
      
      const { data, error } = await supabase
        .from('trading_alerts')
        .insert(alert)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log(`Created market data alert for BTC/USDT with ID: ${data.id}`);
    } else {
      console.log('BTC price movement not significant enough to trigger alert');
    }
    
    // Test volume alert for ETH
    if (ethTicker.quoteVolume > 500000000) { // 500M USD volume threshold
      const alert = {
        user_id: TEST_USER_ID,
        farm_id: farmId,
        alert_type: 'volume_change',
        level: 'info',
        message: `High ETH/USDT trading volume: $${(ethTicker.quoteVolume / 1000000).toFixed(2)}M in last 24h`,
        details: {
          symbol: 'ETH/USDT',
          price: ethTicker.last,
          volume: ethTicker.quoteVolume
        }
      };
      
      const { data, error } = await supabase
        .from('trading_alerts')
        .insert(alert)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log(`Created volume alert for ETH/USDT with ID: ${data.id}`);
    } else {
      console.log('ETH volume not significant enough to trigger alert');
    }
    
    console.log('Market data alerts test complete ✅');
  } catch (error) {
    console.error('Error testing market data alerts:', error);
    throw error;
  }
}

/**
 * Test exchange connection alerts
 */
async function testExchangeConnectionAlerts() {
  console.log('\n🧪 Testing exchange connection alerts...');
  
  try {
    // Get test farm ID
    const { data: farms } = await supabase
      .from('farms')
      .select('id')
      .eq('user_id', TEST_USER_ID)
      .limit(1);
    
    if (!farms || farms.length === 0) {
      throw new Error('No test farm found');
    }
    
    const farmId = farms[0].id;
    
    // Insert exchange monitoring data
    const monitoringData = [
      {
        user_id: TEST_USER_ID,
        exchange: 'Binance',
        status: 'connected',
        api_usage_percent: 65.3,
        api_request_count: 653,
        api_limit_count: 1000,
        response_time_ms: 87,
        last_checked_at: new Date().toISOString()
      },
      {
        user_id: TEST_USER_ID,
        exchange: 'Coinbase',
        status: 'limited',
        api_usage_percent: 85.7,
        api_request_count: 857,
        api_limit_count: 1000,
        response_time_ms: 153,
        error_message: 'Rate limits approaching threshold',
        last_checked_at: new Date().toISOString()
      }
    ];
    
    for (const data of monitoringData) {
      const { error } = await supabase
        .from('exchange_monitoring')
        .insert(data);
      
      if (error) {
        throw error;
      }
    }
    
    console.log('Inserted exchange monitoring data');
    
    // Create exchange connection alert for Coinbase
    const alert = {
      user_id: TEST_USER_ID,
      farm_id: farmId,
      exchange: 'Coinbase',
      alert_type: 'api_limit',
      level: 'warning',
      message: 'Coinbase API usage at 85.7% of rate limit',
      details: {
        exchange: 'Coinbase',
        api_usage: 857,
        api_limit: 1000,
        status: 'limited'
      }
    };
    
    const { data, error } = await supabase
      .from('trading_alerts')
      .insert(alert)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Created exchange connection alert with ID: ${data.id}`);
    console.log('Exchange connection alerts test complete ✅');
  } catch (error) {
    console.error('Error testing exchange connection alerts:', error);
    throw error;
  }
}

/**
 * Test agent performance alerts
 */
async function testAgentPerformanceAlerts() {
  console.log('\n🧪 Testing agent performance alerts...');
  
  try {
    // Get test farm and agent
    const { data: agents } = await supabase
      .from('agents')
      .select('id, farm_id')
      .eq('user_id', TEST_USER_ID)
      .limit(1);
    
    if (!agents || agents.length === 0) {
      throw new Error('No test agent found');
    }
    
    const agentId = agents[0].id;
    const farmId = agents[0].farm_id;
    
    // Insert agent stats
    const todayDate = new Date().toISOString().split('T')[0];
    
    const agentStats = {
      agent_id: agentId,
      execution_count: 120,
      success_count: 117,
      error_count: 3,
      avg_execution_time_ms: 245,
      last_execution_status: 'error',
      last_execution_time: new Date().toISOString(),
      last_error_message: 'Connection timeout during order execution',
      total_trades: 52,
      profitable_trades: 30,
      trading_volume: 158750.25,
      pnl_amount: 2341.87,
      win_rate: 0.577,
      day_date: todayDate
    };
    
    // Check if stats already exist for today
    const { data: existingStats } = await supabase
      .from('agent_stats')
      .select('id')
      .eq('agent_id', agentId)
      .eq('day_date', todayDate);
    
    if (existingStats && existingStats.length > 0) {
      // Update existing stats
      const { error } = await supabase
        .from('agent_stats')
        .update(agentStats)
        .eq('agent_id', agentId)
        .eq('day_date', todayDate);
      
      if (error) throw error;
      console.log('Updated agent stats for today');
    } else {
      // Insert new stats
      const { error } = await supabase
        .from('agent_stats')
        .insert(agentStats);
      
      if (error) throw error;
      console.log('Inserted new agent stats for today');
    }
    
    // Create agent error alert
    const alert = {
      user_id: TEST_USER_ID,
      farm_id: farmId,
      agent_id: agentId,
      alert_type: 'agent_status',
      level: 'error',
      message: 'Agent encountered execution error',
      details: {
        agent_id: agentId,
        error_message: 'Connection timeout during order execution',
        error_count: 3,
        last_execution_time: new Date().toISOString()
      }
    };
    
    const { data, error } = await supabase
      .from('trading_alerts')
      .insert(alert)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Created agent performance alert with ID: ${data.id}`);
    console.log('Agent performance alerts test complete ✅');
  } catch (error) {
    console.error('Error testing agent performance alerts:', error);
    throw error;
  }
}

/**
 * Test position drawdown alerts
 */
async function testPositionDrawdownAlerts() {
  console.log('\n🧪 Testing position drawdown alerts...');
  
  try {
    // Get test farm and agent
    const { data: agents } = await supabase
      .from('agents')
      .select('id, farm_id')
      .eq('user_id', TEST_USER_ID)
      .limit(1);
    
    if (!agents || agents.length === 0) {
      throw new Error('No test agent found');
    }
    
    const agentId = agents[0].id;
    const farmId = agents[0].farm_id;
    
    // Create a simulated position with drawdown
    // Note: In a real implementation, this would come from actual position data
    const positionData = {
      symbol: 'ETH/USDT',
      entryPrice: 3350.0,
      currentPrice: 3120.75,
      quantity: 5.0,
      value: 15603.75,
      pnl: -1146.25,
      pnlPercent: -6.84,
      drawdown: 6.84
    };
    
    // Create position drawdown alert
    const alert = {
      user_id: TEST_USER_ID,
      farm_id: farmId,
      agent_id: agentId,
      alert_type: 'position_drawdown',
      level: 'warning',
      message: `ETH/USDT position has reached ${positionData.drawdown.toFixed(2)}% drawdown`,
      details: {
        symbol: positionData.symbol,
        entryPrice: positionData.entryPrice,
        currentPrice: positionData.currentPrice,
        pnlPercent: positionData.pnlPercent,
        drawdown: positionData.drawdown
      }
    };
    
    const { data, error } = await supabase
      .from('trading_alerts')
      .insert(alert)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Created position drawdown alert with ID: ${data.id}`);
    console.log('Position drawdown alerts test complete ✅');
  } catch (error) {
    console.error('Error testing position drawdown alerts:', error);
    throw error;
  }
}

/**
 * Test alert rule evaluation
 */
async function testAlertRuleEvaluation() {
  console.log('\n🧪 Testing alert rule evaluation...');
  
  try {
    // Run the alert evaluation job
    console.log('Running alert evaluation job...');
    await AlertEvaluationJob.run();
    
    // Check for any alerts that were created by the job
    const { data: newAlerts, error } = await supabase
      .from('trading_alerts')
      .select('id, level, alert_type, message')
      .eq('user_id', TEST_USER_ID)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    if (newAlerts && newAlerts.length > 0) {
      console.log(`Alert evaluation job created ${newAlerts.length} new alerts:`);
      newAlerts.forEach(alert => {
        console.log(`- [${alert.level.toUpperCase()}] ${alert.alert_type}: ${alert.message}`);
      });
    } else {
      console.log('No new alerts were created by the evaluation job');
    }
    
    console.log('Alert rule evaluation test complete ✅');
  } catch (error) {
    console.error('Error testing alert rule evaluation:', error);
    throw error;
  }
}

/**
 * Test notification delivery
 */
async function testNotificationDelivery() {
  console.log('\n🧪 Testing notification delivery...');
  
  try {
    // Get a recent alert to test notification delivery
    const { data: alerts, error } = await supabase
      .from('trading_alerts')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    if (!alerts || alerts.length === 0) {
      console.log('No unread alerts found for notification testing');
      return;
    }
    
    const alert = alerts[0];
    
    // Test notification delivery
    console.log(`Testing notification delivery for alert ID: ${alert.id}`);
    const results = await NotificationService.sendNotifications(alert);
    
    // Log results
    console.log('Notification delivery results:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`- ${status} ${result.channel}: ${result.error || 'Success'}`);
    });
    
    // Mark alert as read
    const { error: updateError } = await supabase
      .from('trading_alerts')
      .update({ is_read: true })
      .eq('id', alert.id);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log('Notification delivery test complete ✅');
  } catch (error) {
    console.error('Error testing notification delivery:', error);
    throw error;
  }
}

/**
 * Test report generation
 */
async function testReportGeneration() {
  console.log('\n🧪 Testing report generation...');
  
  try {
    // Generate alert history report
    console.log('Generating alert history report...');
    const alertReport = await ReportGenerationService.generateAlertReport(
      TEST_USER_ID,
      {
        format: 'csv',
        filters: {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          end_date: new Date().toISOString()
        },
        title: 'Test Alert History Report'
      }
    );
    
    if (!alertReport.success) {
      throw new Error(`Alert report generation failed: ${alertReport.error}`);
    }
    
    console.log(`Generated alert report: ${alertReport.metadata.title}`);
    console.log(`CSV data length: ${alertReport.data.length} bytes`);
    
    // Generate monitoring metrics report
    console.log('Generating monitoring metrics report...');
    const monitoringReport = await ReportGenerationService.generateMonitoringReport(
      TEST_USER_ID,
      {
        format: 'json',
        filters: {
          start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Last 3 days
          end_date: new Date().toISOString()
        },
        title: 'Test Monitoring Metrics Report'
      }
    );
    
    if (!monitoringReport.success) {
      throw new Error(`Monitoring report generation failed: ${monitoringReport.error}`);
    }
    
    console.log(`Generated monitoring report: ${monitoringReport.metadata.title}`);
    
    // Generate compliance report
    console.log('Generating compliance report...');
    const complianceReport = await ReportGenerationService.generateComplianceReport(
      TEST_USER_ID,
      {
        format: 'csv',
        filters: {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          end_date: new Date().toISOString()
        },
        title: 'Test Compliance Report'
      }
    );
    
    if (!complianceReport.success) {
      throw new Error(`Compliance report generation failed: ${complianceReport.error}`);
    }
    
    console.log(`Generated compliance report: ${complianceReport.metadata.title}`);
    console.log(`CSV data length: ${complianceReport.data.length} bytes`);
    
    console.log('Report generation test complete ✅');
  } catch (error) {
    console.error('Error testing report generation:', error);
    throw error;
  }
}

// Run the integration tests
runIntegrationTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Integration tests failed:', error);
    process.exit(1);
  });
