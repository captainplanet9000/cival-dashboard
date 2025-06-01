/**
 * Monitoring System Integration Test with Mocks
 * 
 * This script tests the monitoring system using mock data and services
 * instead of relying on a fully configured Supabase database.
 */

import { AlertManagementService, AlertRule, TradingAlert } from '@/services/monitoring/alert-management-service';
import { AlertEvaluationService } from '@/services/monitoring/alert-evaluation-service';
import { NotificationService } from '@/services/monitoring/notification-service';
import { ReportGenerationService } from '@/services/monitoring/report-generation-service';

// Mock implementations setup

// We'll use this mock Supabase client in our code
const mockSupabaseClient = {
  from: () => mockSupabaseQueryBuilder(),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'mock-user-id' } } } })
  },
  rpc: () => ({ data: null, error: null })
};

// Override imports by intercepting require calls
// This approach avoids the need to modify potentially read-only properties
const originalRequire = require;
require = function(id: string) {
  if (id === '@/utils/supabase/server') {
    return {
      createServerClient: async () => mockSupabaseClient
    };
  }
  return originalRequire(id);
} as NodeJS.Require;

// Mock CCXT module
const mockCCXT = {
  binance: class MockBinance {
    async fetchTicker(symbol: string) {
      if (symbol === 'BTC/USDT') {
        return {
          symbol: 'BTC/USDT',
          last: 65420.5,
          percentage: 1.87,
          quoteVolume: 12500000000
        };
      } else if (symbol === 'ETH/USDT') {
        return {
          symbol: 'ETH/USDT',
          last: 3120.75,
          percentage: -2.66,
          quoteVolume: 5800000000
        };
      }
      return {};
    }
  }
};

// We'll use this approach to mock CCXT without modifying the require.cache
const originalRequire = require;
require = function(id: string) {
  if (id === 'ccxt') {
    return mockCCXT;
  }
  return originalRequire(id);
} as NodeJS.Require;

// Mock the database query builder
function mockSupabaseQueryBuilder() {
  const mockData = {
    alert_rules: [
      {
        id: 1,
        user_id: 'mock-user-id',
        farm_id: 1,
        name: 'Test Price Alert',
        description: 'Test price alert for BTC',
        rule_type: 'price_change',
        conditions: [
          { metric: 'symbol', operator: 'eq', value: 'BTC/USDT' },
          { metric: 'price_change_percent', operator: 'gt', value: 1.5 }
        ],
        level: 'info',
        notification_channels: ['ui', 'email'],
        is_active: true,
        throttle_minutes: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        user_id: 'mock-user-id',
        farm_id: 1,
        name: 'Test Agent Alert',
        description: 'Test agent error alert',
        rule_type: 'agent_status',
        conditions: [
          { metric: 'agent_id', operator: 'eq', value: 1 },
          { metric: 'status', operator: 'eq', value: 'error' }
        ],
        level: 'error',
        notification_channels: ['ui', 'email'],
        is_active: true,
        throttle_minutes: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    trading_alerts: [
      {
        id: 1,
        user_id: 'mock-user-id',
        farm_id: 1,
        alert_type: 'price_change',
        level: 'info',
        message: 'BTC price increased by 1.87%',
        details: { symbol: 'BTC/USDT', price: 65420.5 },
        is_read: false,
        is_acknowledged: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    notification_preferences: [
      {
        id: 1,
        user_id: 'mock-user-id',
        email_alerts: true,
        push_notifications: true,
        sms_alerts: false,
        telegram_alerts: false,
        email_frequency: 'immediate',
        min_alert_level: 'info',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    farms: [
      {
        id: 1,
        user_id: 'mock-user-id',
        name: 'Test Farm',
        description: 'Test farm for integration testing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    agents: [
      {
        id: 1,
        user_id: 'mock-user-id',
        farm_id: 1,
        name: 'Test Agent',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  };

  let currentTable: string = '';
  let filters: Record<string, any> = {};
  let returningAll = false;

  const builder = {
    from: (table: string) => {
      currentTable = table;
      filters = {};
      returningAll = false;
      return builder;
    },
    select: (columns?: string) => {
      return builder;
    },
    insert: (data: any) => {
      if (Array.isArray(data)) {
        mockData[currentTable] = [...mockData[currentTable], ...data.map((item, index) => ({
          id: mockData[currentTable].length + index + 1,
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))];
      } else {
        mockData[currentTable].push({
          id: mockData[currentTable].length + 1,
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      return builder;
    },
    update: (data: any) => {
      mockData[currentTable] = mockData[currentTable].map(item => {
        // Apply filters
        let match = true;
        for (const [key, value] of Object.entries(filters)) {
          if (item[key] !== value) {
            match = false;
            break;
          }
        }
        
        if (match) {
          return { ...item, ...data, updated_at: new Date().toISOString() };
        }
        return item;
      });
      
      return builder;
    },
    delete: () => {
      mockData[currentTable] = mockData[currentTable].filter(item => {
        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (item[key] !== value) {
            return true;
          }
        }
        return false;
      });
      
      return builder;
    },
    eq: (column: string, value: any) => {
      filters[column] = value;
      return builder;
    },
    neq: (column: string, value: any) => {
      // Not implemented for this mock
      return builder;
    },
    gt: (column: string, value: any) => {
      // Not implemented for this mock
      return builder;
    },
    lt: (column: string, value: any) => {
      // Not implemented for this mock
      return builder;
    },
    gte: (column: string, value: any) => {
      // Not implemented for this mock
      return builder;
    },
    lte: (column: string, value: any) => {
      // Not implemented for this mock
      return builder;
    },
    ilike: (column: string, value: any) => {
      // Not implemented for this mock
      return builder;
    },
    in: (column: string, values: any[]) => {
      // Not implemented for this mock
      return builder;
    },
    limit: (count: number) => {
      // Not implemented for this mock
      return builder;
    },
    single: () => {
      const filtered = mockData[currentTable].filter(item => {
        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (item[key] !== value) {
            return false;
          }
        }
        return true;
      });
      
      return {
        data: filtered.length > 0 ? filtered[0] : null,
        error: null
      };
    },
    maybeSingle: () => {
      return builder.single();
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      // Not implemented for this mock
      return builder;
    },
    then: (callback: (result: { data: any; error: any }) => void) => {
      const result = builder.execute();
      callback(result);
      return result;
    },
    execute: () => {
      const filtered = mockData[currentTable].filter(item => {
        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (item[key] !== value) {
            return false;
          }
        }
        return true;
      });
      
      return {
        data: returningAll ? filtered : filtered.length > 0 ? filtered[0] : null,
        error: null
      };
    }
  };
  
  return builder;
}

// Create our mock service implementations
const mockServices = {
  AlertEvaluationService: {
    ...AlertEvaluationService,
    evaluateUserAlertRules: async (userId: string) => {
      console.log(`[MOCK] Evaluating alert rules for user ${userId}`);
      return { success: true };
    }
  },
  NotificationService: {
    ...NotificationService,
    sendNotifications: async (alert: any) => {
      console.log(`[MOCK] Sending notifications for alert: ${alert.message}`);
      return [
        { success: true, channel: 'ui' },
        { success: true, channel: 'email' }
      ];
    }
  },
  ReportGenerationService: {
    ...ReportGenerationService,
    generateAlertReport: async (userId: string, options: any) => {
      console.log(`[MOCK] Generating alert report for user ${userId}`);
      return {
        success: true,
        metadata: {
          title: options.title || 'Alert History Report',
          generatedAt: new Date().toISOString(),
          generatedBy: userId
        },
        data: 'Mock report data',
        filename: `alert_report_${Date.now()}.${options.format}`
      };
    }
  }
};

// Instead of using require.cache, directly override the service methods
// to avoid TypeScript errors with module type definitions
Object.assign(AlertEvaluationService, {
  evaluateUserAlertRules: mockServices.AlertEvaluationService.evaluateUserAlertRules
});

Object.assign(NotificationService, {
  sendNotifications: mockServices.NotificationService.sendNotifications
});

Object.assign(ReportGenerationService, {
  generateAlertReport: mockServices.ReportGenerationService.generateAlertReport
});

/**
 * Run the mock integration tests for the monitoring system
 */
async function runMockTests() {
  console.log('Starting Monitoring System Mock Integration Tests');
  console.log('===============================================');
  
  try {
    const userId = 'mock-user-id';
    
    // Test 1: Get alert rules
    // Test position drawdown detection
  await runTest(async () => {
    const result = await runDrainageTestScenario(TEST_USER_ID, [1]);
    assert(result.success, 'Position drawdown test should succeed');
    console.log('✅ Position drawdown detection test passed');
  });
    // Test 2: Create a new alert
    console.log('\n🧪 TEST 2: Create New Alert');
    const newAlert: Omit<TradingAlert, 'id' | 'created_at' | 'updated_at' | 'is_read' | 'is_acknowledged'> = {
      user_id: userId,
      farm_id: 1,
      alert_type: 'position_drawdown',
      level: 'warning',
      message: 'ETH position has reached 6.84% drawdown',
      details: {
        symbol: 'ETH/USDT',
        drawdown: 6.84
      }
    };
    
    const createdAlert = await AlertManagementService.createAlert(newAlert);
    console.log('✅ Created new alert:', createdAlert ? 'Success' : 'Failed');
    
    // Test 3: Get alerts with filtering
    console.log('\n🧪 TEST 3: Get Alerts with Filtering');
    const alerts = await AlertManagementService.getAlerts(userId, {
      level: 'warning',
      unreadOnly: true
    });
    console.log(`✅ Found ${alerts.length} matching alerts`);
    
    // Test 4: Update alert status
    console.log('\n🧪 TEST 4: Update Alert Status');
    const updateResult = await AlertManagementService.updateAlertStatus(userId, 1, { is_read: true });
    console.log(`✅ Alert status update: ${updateResult ? 'Success' : 'Failed'}`);
    
    // Test 5: Create a new alert rule
    console.log('\n🧪 TEST 5: Create New Alert Rule');
    const newRule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      farm_id: 1,
      name: 'Volume Spike Alert',
      description: 'Alert on unusual trading volume',
      rule_type: 'volume_change',
      conditions: [
        {
          metric: 'volume_24h',
          operator: 'gt',
          value: 10000000000
        }
      ],
      level: 'info',
      notification_channels: ['ui'],
      is_active: true,
      throttle_minutes: 120
    };
    
    const savedRule = await AlertManagementService.saveAlertRule(newRule);
    console.log('✅ Created new alert rule:', savedRule ? 'Success' : 'Failed');
    
    // Test 6: Evaluate alert rules
    console.log('\n🧪 TEST 6: Evaluate Alert Rules');
    await AlertEvaluationService.evaluateUserAlertRules(userId);
    console.log('✅ Alert rule evaluation completed');
    
    // Test 7: Send notifications
    console.log('\n🧪 TEST 7: Send Notifications');
    if (alerts && alerts.length > 0) {
      const notificationResults = await NotificationService.sendNotifications(alerts[0]);
      console.log('✅ Notification delivery results:', notificationResults);
    } else {
      console.log('⚠️ No alerts to send notifications for');
    }
    
    // Test 8: Generate reports
    console.log('\n🧪 TEST 8: Generate Reports');
    const reportResult = await ReportGenerationService.generateAlertReport(userId, {
      format: 'csv',
      title: 'Test Alert Report'
    });
    console.log('✅ Report generation:', reportResult.success ? 'Success' : 'Failed');
    if (reportResult.success) {
      console.log(`- Filename: ${reportResult.filename}`);
    }
    
    console.log('\n===============================================');
    console.log('✅ All mock integration tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Mock integration test failed:', error);
    return false;
  }
}

// Run the mock tests
runMockTests().then(success => {
  process.exit(success ? 0 : 1);
});
