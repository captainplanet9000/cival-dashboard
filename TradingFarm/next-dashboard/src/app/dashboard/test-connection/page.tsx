"use client";

import { useState } from 'react';
import { ConnectivityStatus } from '../../../components/dashboard';
import { testConnectivity, ConnectivityReport } from '../../../lib/api-utils';
import { API_CONFIG } from '../../../data-access/services/api-config';

/**
 * Test Connection Page
 * 
 * This page allows users to test connectivity to all backend services
 * and view configuration details.
 */
export default function TestConnectionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connection Test</h1>
        <p className="text-muted-foreground mt-2">
          Verify connectivity to backend services and APIs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <ConnectivityStatus />
        </div>
        
        <div>
          <ConfigurationDetails />
        </div>
      </div>
      
      <div>
        <ConnectionTroubleshooter />
      </div>
    </div>
  );
}

/**
 * Component to display configuration details
 */
function ConfigurationDetails() {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Configuration Details</h2>
      
      <div className="space-y-4">
        <ConfigItem 
          label="Supabase URL" 
          value={API_CONFIG.SUPABASE_URL} 
        />
        
        <ConfigItem 
          label="ElizaOS API" 
          value={API_CONFIG.ELIZAOS_API_URL} 
        />
        
        <ConfigItem 
          label="Trading Farm API" 
          value={API_CONFIG.TRADING_FARM_API_URL} 
        />
        
        <ConfigItem 
          label="Neon MCP" 
          value={API_CONFIG.MCP_NEON_ENDPOINT} 
        />
        
        <ConfigItem 
          label="Browserbase MCP" 
          value={API_CONFIG.MCP_BROWSERBASE_ENDPOINT} 
        />
        
        <ConfigItem 
          label="Hyperliquid MCP" 
          value={API_CONFIG.MCP_HYPERLIQUID_ENDPOINT} 
        />
      </div>
      
      <div className="mt-4 pt-3 border-t text-xs text-gray-500">
        <p>
          To change these settings, visit the 
          <a href="/dashboard/settings" className="text-primary hover:underline ml-1">
            Settings Page
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Component to display a configuration item
 */
function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="text-sm font-mono bg-gray-50 p-2 rounded border mt-1 break-all">
        {value}
      </div>
    </div>
  );
}

/**
 * Component to provide connection troubleshooting
 */
function ConnectionTroubleshooter() {
  const [selectedService, setSelectedService] = useState<string>('');
  
  // Common issues for each service
  const serviceIssues: Record<string, string[]> = {
    supabase: [
      "API URL is incorrect or Supabase service is down",
      "API key is invalid or expired",
      "Network firewall is blocking the connection",
      "CORS policy is preventing requests from this origin"
    ],
    elizaOS: [
      "ElizaOS server is not running",
      "API URL is incorrect or has changed",
      "ElizaOS is running but the API endpoint is misconfigured",
      "Required ElizaOS agent is not initialized"
    ],
    tradingFarmAPI: [
      "Trading Farm backend service is not running",
      "API URL is incorrect or has changed",
      "Network issue between frontend and backend",
      "Backend service crashed or is unresponsive"
    ],
    neon: [
      "Neon MCP service is not running",
      "Incorrect API endpoint configuration",
      "API key is invalid or missing",
      "Rate limit has been exceeded"
    ],
    browserbase: [
      "Browserbase MCP service is not running",
      "Incorrect endpoint configuration",
      "Service has not been initialized properly"
    ],
    hyperliquid: [
      "Hyperliquid MCP service is not running",
      "API endpoint is incorrect",
      "API key not configured properly",
      "Exchange API access is restricted"
    ]
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Troubleshooting Guide</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a service to troubleshoot:
        </label>
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="block w-full rounded-md border-gray-300 border px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select a service...</option>
          <option value="supabase">Supabase Database</option>
          <option value="elizaOS">ElizaOS API</option>
          <option value="tradingFarmAPI">Trading Farm API</option>
          <option value="neon">Neon MCP</option>
          <option value="browserbase">Browserbase MCP</option>
          <option value="hyperliquid">Hyperliquid MCP</option>
        </select>
      </div>
      
      {selectedService && (
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Common Issues:</h3>
          <ul className="list-disc pl-5 space-y-1">
            {serviceIssues[selectedService]?.map((issue, index) => (
              <li key={index} className="text-sm text-gray-700">{issue}</li>
            ))}
          </ul>
          
          <h3 className="font-medium mt-4 mb-2">Resolution Steps:</h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li className="text-sm text-gray-700">
              Verify that the service is running and accessible
            </li>
            <li className="text-sm text-gray-700">
              Check that the endpoint URL is correct in the configuration
            </li>
            <li className="text-sm text-gray-700">
              Ensure API keys are valid and have not expired
            </li>
            <li className="text-sm text-gray-700">
              Verify network connectivity and firewall settings
            </li>
            <li className="text-sm text-gray-700">
              Check server logs for specific error messages
            </li>
          </ol>
        </div>
      )}
    </div>
  );
} 