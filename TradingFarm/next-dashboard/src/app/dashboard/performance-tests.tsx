'use client';

import { useState } from 'react';
import { api } from '../../lib/api-client';
import { formatApiError } from '../../lib/api-utils';

/**
 * Component for testing API integration with backend services
 */
export default function ApiIntegrationTests() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    setIsRunning(true);
    setResults({});
    
    const testSuites = [
      { name: 'Dashboard API', tests: dashboardTests },
      { name: 'Farms API', tests: farmTests },
      { name: 'Agents API', tests: agentTests },
      { name: 'Orders API', tests: orderTests },
      { name: 'Trades API', tests: tradeTests },
      { name: 'Analytics API', tests: analyticsTests },
      { name: 'ElizaOS API', tests: elizaOsTests },
    ];
    
    for (const suite of testSuites) {
      for (const [testName, testFn] of Object.entries(suite.tests)) {
        const fullTestName = `${suite.name}: ${testName}`;
        setActiveTest(fullTestName);
        try {
          const result = await testFn();
          setResults(prev => ({
            ...prev,
            [fullTestName]: {
              success: true,
              message: result || 'Test passed',
              time: new Date().toISOString()
            }
          }));
        } catch (error) {
          setResults(prev => ({
            ...prev,
            [fullTestName]: {
              success: false,
              message: formatApiError(error),
              time: new Date().toISOString()
            }
          }));
        }
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsRunning(false);
    setActiveTest(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">API Integration Tests</h1>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>
      
      {activeTest && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded">
          <p className="flex items-center">
            <span className="mr-2">
              <svg className="animate-spin h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            Running: {activeTest}
          </p>
        </div>
      )}
      
      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          
          <div className="space-y-2">
            {Object.entries(results).map(([testName, result]) => (
              <div 
                key={testName}
                className={`p-4 rounded ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex justify-between">
                  <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testName}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {new Date(result.time).toLocaleTimeString()}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Test result interface
 */
interface TestResult {
  success: boolean;
  message: string;
  time: string;
}

/**
 * Dashboard API tests
 */
const dashboardTests = {
  'Get Dashboard Summary': async () => {
    const response = await api.getDashboardSummary();
    if (response.error) throw new Error(response.error);
    return 'Successfully retrieved dashboard summary';
  },
};

/**
 * Farm API tests
 */
const farmTests = {
  'List Farms': async () => {
    const response = await api.getFarms();
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} farms`;
  },
  
  'Get Farm Details': async () => {
    // First get a list of farms to get an ID
    const farmsResponse = await api.getFarms();
    if (farmsResponse.error) throw new Error(farmsResponse.error);
    if (!farmsResponse.data?.length) {
      return 'No farms to test with';
    }
    
    // Get details of the first farm
    const farmId = farmsResponse.data[0].id;
    const response = await api.getFarm(farmId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved details for farm ${farmId}`;
  },
  
  'Get Farm Metrics': async () => {
    // First get a list of farms to get an ID
    const farmsResponse = await api.getFarms();
    if (farmsResponse.error) throw new Error(farmsResponse.error);
    if (!farmsResponse.data?.length) {
      return 'No farms to test with';
    }
    
    // Get metrics for the first farm
    const farmId = farmsResponse.data[0].id;
    const response = await api.getFarmMetrics(farmId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved metrics for farm ${farmId}`;
  },
};

/**
 * Agent API tests
 */
const agentTests = {
  'List Agents': async () => {
    const response = await api.getAgents();
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} agents`;
  },
  
  'Get Agent Details': async () => {
    // First get a list of agents to get an ID
    const agentsResponse = await api.getAgents();
    if (agentsResponse.error) throw new Error(agentsResponse.error);
    if (!agentsResponse.data?.length) {
      return 'No agents to test with';
    }
    
    // Get details of the first agent
    const agentId = agentsResponse.data[0].id;
    const response = await api.getAgent(agentId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved details for agent ${agentId}`;
  },
  
  'Get Agents By Farm': async () => {
    // First get a list of farms to get an ID
    const farmsResponse = await api.getFarms();
    if (farmsResponse.error) throw new Error(farmsResponse.error);
    if (!farmsResponse.data?.length) {
      return 'No farms to test with';
    }
    
    // Get agents for the first farm
    const farmId = farmsResponse.data[0].id;
    const response = await api.getAgentsByFarm(farmId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} agents for farm ${farmId}`;
  },
};

/**
 * Order API tests
 */
const orderTests = {
  'List Orders': async () => {
    const response = await api.getOrders();
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} orders`;
  },
  
  'Get Order Details': async () => {
    // First get a list of orders to get an ID
    const ordersResponse = await api.getOrders();
    if (ordersResponse.error) throw new Error(ordersResponse.error);
    if (!ordersResponse.data?.length) {
      return 'No orders to test with';
    }
    
    // Get details of the first order
    const orderId = ordersResponse.data[0].id;
    const response = await api.getOrder(orderId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved details for order ${orderId}`;
  },
  
  'Get Orders By Farm': async () => {
    // First get a list of farms to get an ID
    const farmsResponse = await api.getFarms();
    if (farmsResponse.error) throw new Error(farmsResponse.error);
    if (!farmsResponse.data?.length) {
      return 'No farms to test with';
    }
    
    // Get orders for the first farm
    const farmId = farmsResponse.data[0].id;
    const response = await api.getOrdersByFarm(farmId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} orders for farm ${farmId}`;
  },
};

/**
 * Trade API tests
 */
const tradeTests = {
  'List Trades': async () => {
    const response = await api.getTrades();
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} trades`;
  },
  
  'Get Trade Details': async () => {
    // First get a list of trades to get an ID
    const tradesResponse = await api.getTrades();
    if (tradesResponse.error) throw new Error(tradesResponse.error);
    if (!tradesResponse.data?.length) {
      return 'No trades to test with';
    }
    
    // Get details of the first trade
    const tradeId = tradesResponse.data[0].id;
    const response = await api.getTrade(tradeId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved details for trade ${tradeId}`;
  },
  
  'Get Trades By Farm': async () => {
    // First get a list of farms to get an ID
    const farmsResponse = await api.getFarms();
    if (farmsResponse.error) throw new Error(farmsResponse.error);
    if (!farmsResponse.data?.length) {
      return 'No farms to test with';
    }
    
    // Get trades for the first farm
    const farmId = farmsResponse.data[0].id;
    const response = await api.getTradesByFarm(farmId);
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} trades for farm ${farmId}`;
  },
};

/**
 * Analytics API tests
 */
const analyticsTests = {
  'Get Performance Analytics': async () => {
    const response = await api.getPerformanceAnalytics();
    if (response.error) throw new Error(response.error);
    return 'Successfully retrieved performance analytics';
  },
  
  'Get Trade Distribution': async () => {
    const response = await api.getTradeDistribution();
    if (response.error) throw new Error(response.error);
    return 'Successfully retrieved trade distribution analytics';
  },
  
  'Get Risk Metrics': async () => {
    const response = await api.getRiskMetrics();
    if (response.error) throw new Error(response.error);
    return 'Successfully retrieved risk metrics';
  },
};

/**
 * ElizaOS API tests
 */
const elizaOsTests = {
  'List ElizaOS Agents': async () => {
    const response = await api.getElizaAgents();
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} ElizaOS agents`;
  },
  
  'Get ElizaOS Commands': async () => {
    const response = await api.getElizaCommands();
    if (response.error) throw new Error(response.error);
    return `Successfully retrieved ${response.data?.length || 0} ElizaOS commands`;
  },
}; 