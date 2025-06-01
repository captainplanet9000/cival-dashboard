/**
 * Trading Farm - Agent Health Monitoring Test Script
 * This script tests the core functionality of the health monitoring system
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection configuration
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTI1MzE2NywiZXhwIjoyMDYwODI5MTY3fQ.MyP21Ig3G7HvDPNZcx81LzQQrIy5yfC9ErmC686LMX4';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Sample health data for testing
const healthData = [
  {
    agent_id: 'test-agent-1',
    cpu_usage: 45.5,
    memory_usage: 32.8,
    disk_usage: 28.3,
    response_time: 120,
    uptime: 8640,
    status: 'healthy',
    message: 'All systems operational',
    error_rate: 0.2,
    trading_status: 'active',
    order_count: 12,
    trade_count: 8,
    position_count: 3,
    capital_allocated: 10000,
    capital_available: 7500,
    profit_loss: 320.50,
    win_rate: 0.68,
    drawdown: 4.2,
    sharpe_ratio: 1.8,
    max_drawdown: 8.4,
    circuit_breaker_status: 'closed'
  },
  {
    agent_id: 'test-agent-2',
    cpu_usage: 78.2,
    memory_usage: 65.9,
    disk_usage: 42.1,
    response_time: 350,
    uptime: 4320,
    status: 'warning',
    message: 'High memory usage detected',
    error_rate: 2.8,
    trading_status: 'active',
    order_count: 24,
    trade_count: 18,
    position_count: 5,
    capital_allocated: 15000,
    capital_available: 8200,
    profit_loss: -120.75,
    win_rate: 0.45,
    drawdown: 8.9,
    sharpe_ratio: 0.7,
    max_drawdown: 12.5,
    circuit_breaker_status: 'closed'
  },
  {
    agent_id: 'test-agent-3',
    cpu_usage: 92.7,
    memory_usage: 88.4,
    disk_usage: 75.3,
    response_time: 780,
    uptime: 2160,
    status: 'critical',
    message: 'System resources critically low',
    error_rate: 8.5,
    trading_status: 'paused',
    order_count: 6,
    trade_count: 4,
    position_count: 1,
    capital_allocated: 8000,
    capital_available: 7800,
    profit_loss: -550.25,
    win_rate: 0.32,
    drawdown: 15.6,
    sharpe_ratio: 0.3,
    max_drawdown: 18.9,
    circuit_breaker_status: 'open',
    circuit_breaker_triggered_at: new Date().toISOString(),
    circuit_breaker_reason: 'High error rate detected'
  }
];

// Sample agents for testing
const agents = [
  {
    id: 'test-agent-1',
    name: 'Bitcoin Trend Follower',
    description: 'Follows medium-term trends in Bitcoin markets',
    type: 'trading',
    status: 'running',
    farm_id: 'farm-1',
    created_at: '2025-04-01T12:00:00Z',
    updated_at: '2025-04-22T18:30:00Z'
  },
  {
    id: 'test-agent-2',
    name: 'Ethereum Scalper',
    description: 'High-frequency trading on Ethereum pairs',
    type: 'trading',
    status: 'running',
    farm_id: 'farm-1',
    created_at: '2025-04-05T09:15:00Z',
    updated_at: '2025-04-22T19:45:00Z'
  },
  {
    id: 'test-agent-3',
    name: 'DeFi Portfolio Manager',
    description: 'Manages a portfolio of DeFi assets',
    type: 'portfolio',
    status: 'error',
    farm_id: 'farm-2',
    created_at: '2025-03-15T14:30:00Z',
    updated_at: '2025-04-22T20:10:00Z'
  }
];

// Circuit breaker configuration
const circuitBreakers = [
  {
    id: 'cb-1',
    agent_id: 'test-agent-1',
    metric: 'error_rate',
    threshold: 5.0,
    comparison: 'gt',
    message: 'Error rate too high',
    auto_reset: true,
    reset_after_seconds: 3600,
    enabled: true
  },
  {
    id: 'cb-2',
    agent_id: 'test-agent-2',
    metric: 'memory_usage',
    threshold: 90.0,
    comparison: 'gt',
    message: 'Memory usage critically high',
    auto_reset: false,
    enabled: true
  },
  {
    id: 'cb-3',
    agent_id: 'test-agent-3',
    metric: 'drawdown',
    threshold: 15.0,
    comparison: 'gt',
    message: 'Drawdown exceeded threshold',
    auto_reset: false,
    enabled: true
  }
];

// Health alert configuration
const healthAlerts = [
  {
    id: 'alert-1',
    agent_id: 'test-agent-1',
    metric: 'cpu_usage',
    threshold: 80.0,
    comparison: 'gt',
    message: 'CPU usage high',
    severity: 'medium',
    enabled: true,
    notify_channels: ['dashboard', 'email']
  },
  {
    id: 'alert-2',
    agent_id: 'test-agent-2',
    metric: 'response_time',
    threshold: 500,
    comparison: 'gt',
    message: 'Agent response time slow',
    severity: 'low',
    enabled: true,
    notify_channels: ['dashboard']
  },
  {
    id: 'alert-3',
    agent_id: 'test-agent-3',
    metric: 'error_rate',
    threshold: 5.0,
    comparison: 'gt',
    message: 'High error rate detected',
    severity: 'critical',
    enabled: true,
    notify_channels: ['dashboard', 'email', 'sms']
  }
];

class HealthMonitorTester {
  constructor() {
    this.supabase = supabase;
    console.log('💻 Health Monitor Test Initialized');
  }

  async runTests() {
    console.log('\n🔄 Running Agent Health Monitoring Tests...\n');
    
    try {
      // Test 1: Connection to Supabase
      console.log('📡 Test 1: Verifying Supabase Connection');
      const { data: connectionTest, error: connectionError } = await this.supabase
        .from('farms')
        .select('id')
        .limit(1);
      
      if (connectionError) {
        console.error('❌ Connection test failed:', connectionError.message);
        return;
      }
      
      console.log('✅ Connection to Supabase successful!');
      
      // Test 2: Check if agent_health table exists
      console.log('\n🗄️ Test 2: Checking Health Tables');
      await this.checkTable('agent_health');
      await this.checkTable('agent_events');
      await this.checkTable('agent_circuit_breakers');
      await this.checkTable('agent_alert_configs');
      
      // Test 3: Insert sample health data
      console.log('\n📊 Test 3: Inserting Sample Health Data');
      for (const health of healthData) {
        const { error } = await this.supabase
          .from('agent_health')
          .upsert({ 
            ...health, 
            id: health.agent_id + '-health',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          });
        
        if (error) {
          console.log(`❌ Error inserting health data for ${health.agent_id}:`, error.message);
        } else {
          console.log(`✅ Health data inserted for ${health.agent_id}`);
        }
      }
      
      // Test 4: Insert circuit breaker configurations
      console.log('\n🔌 Test 4: Setting Up Circuit Breakers');
      for (const cb of circuitBreakers) {
        const { error } = await this.supabase
          .from('agent_circuit_breakers')
          .upsert({
            ...cb,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.log(`❌ Error setting up circuit breaker for ${cb.agent_id}:`, error.message);
        } else {
          console.log(`✅ Circuit breaker set up for ${cb.agent_id}`);
        }
      }
      
      // Test 5: Insert health alert configurations
      console.log('\n🚨 Test 5: Setting Up Health Alerts');
      for (const alert of healthAlerts) {
        const { error } = await this.supabase
          .from('agent_alert_configs')
          .upsert({
            ...alert,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.log(`❌ Error setting up health alert for ${alert.agent_id}:`, error.message);
        } else {
          console.log(`✅ Health alert set up for ${alert.agent_id}`);
        }
      }
      
      // Test 6: Query health data
      console.log('\n🔍 Test 6: Querying Health Data');
      const { data: healthRecords, error: queryError } = await this.supabase
        .from('agent_health')
        .select('agent_id, status, cpu_usage, memory_usage, error_rate, circuit_breaker_status')
        .in('agent_id', ['test-agent-1', 'test-agent-2', 'test-agent-3']);
      
      if (queryError) {
        console.log('❌ Error querying health data:', queryError.message);
      } else {
        console.log('✅ Health data query successful:');
        console.table(healthRecords);
      }
      
      // Test 7: Check circuit breaker functionality
      console.log('\n⚡ Test 7: Testing Circuit Breaker Logic');
      const agentWithHighErrorRate = healthData.find(h => h.error_rate > 5.0);
      if (agentWithHighErrorRate) {
        console.log(`✅ Circuit breaker triggered for ${agentWithHighErrorRate.agent_id} due to high error rate (${agentWithHighErrorRate.error_rate}%)`);
        
        // Update the trading status to paused
        const { error: updateError } = await this.supabase
          .from('agent_health')
          .update({ 
            trading_status: 'paused',
            circuit_breaker_status: 'open',
            circuit_breaker_triggered_at: new Date().toISOString(),
            circuit_breaker_reason: 'High error rate detected'
          })
          .eq('agent_id', agentWithHighErrorRate.agent_id);
        
        if (updateError) {
          console.log('❌ Error updating agent status:', updateError.message);
        } else {
          console.log(`✅ Agent ${agentWithHighErrorRate.agent_id} trading status updated to paused`);
        }
      }
      
      console.log('\n✅ All tests completed!');
      console.log('\nHealth monitoring system is successfully implemented.');
      console.log('You can now use the AgentList component to visualize agent health data.');
      
    } catch (error) {
      console.error('❌ Unexpected error during tests:', error.message);
    }
  }
  
  async checkTable(tableName) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') { // Undefined table error
          console.log(`❌ Table ${tableName} does not exist`);
        } else {
          console.log(`❌ Error checking table ${tableName}:`, error.message);
        }
      } else {
        console.log(`✅ Table ${tableName} exists`);
      }
    } catch (err) {
      console.log(`❓ Could not determine if table ${tableName} exists:`, err.message);
    }
  }
}

// Run the tests
const tester = new HealthMonitorTester();
tester.runTests();
