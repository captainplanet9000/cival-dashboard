"use client";

import { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../data-access/services/api-config';
import { ConnectivityStatus } from '../../../components/dashboard/connectivity-status';

/**
 * API Settings component for configuring endpoints and testing connections
 */
export default function ApiSettings() {
  // Initialize settings from current config
  const [settings, setSettings] = useState({
    supabaseUrl: API_CONFIG.SUPABASE_URL,
    elizaOsApiUrl: API_CONFIG.ELIZAOS_API_URL,
    tradingFarmApiUrl: API_CONFIG.TRADING_FARM_API_URL,
    mcpNeonEndpoint: API_CONFIG.MCP_NEON_ENDPOINT,
    mcpBrowserbaseEndpoint: API_CONFIG.MCP_BROWSERBASE_ENDPOINT,
    mcpHyperliquidEndpoint: API_CONFIG.MCP_HYPERLIQUID_ENDPOINT,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /**
   * Handle input changes and update local state
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  /**
   * Save settings to local storage
   * In a real implementation, this would update environment variables or config files
   */
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Save to local storage
      localStorage.setItem('API_CONFIG', JSON.stringify(settings));
      
      // In a real implementation, we would update environment variables
      // or restart the server to apply new configuration
      
      setIsDirty(false);
      setSaveSuccess(true);
      
      // This would normally require a refresh to apply the new settings
      // window.location.reload();
    } catch (error) {
      setSaveError('Failed to save settings: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
        <p className="text-sm text-gray-500 mb-6">
          Configure API endpoints for connecting to backend services. Changes require a restart to take effect.
        </p>
      </div>

      {/* Supabase Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Database Connection</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Supabase URL</label>
          <input
            type="text"
            name="supabaseUrl"
            value={settings.supabaseUrl}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ElizaOS API Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">ElizaOS Integration</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">ElizaOS API URL</label>
          <input
            type="text"
            name="elizaOsApiUrl"
            value={settings.elizaOsApiUrl}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Trading Farm API Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Trading Farm Backend</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Trading Farm API URL</label>
          <input
            type="text"
            name="tradingFarmApiUrl"
            value={settings.tradingFarmApiUrl}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* MCP Services Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">MCP Services</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Neon MCP Endpoint</label>
          <input
            type="text"
            name="mcpNeonEndpoint"
            value={settings.mcpNeonEndpoint}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Browserbase MCP Endpoint</label>
          <input
            type="text"
            name="mcpBrowserbaseEndpoint"
            value={settings.mcpBrowserbaseEndpoint}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Hyperliquid MCP Endpoint</label>
          <input
            type="text"
            name="mcpHyperliquidEndpoint"
            value={settings.mcpHyperliquidEndpoint}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Save Settings Button */}
      <div className="pt-5">
        <div className="flex justify-start">
          <button
            onClick={saveSettings}
            disabled={!isDirty || isSaving}
            className={`inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              (!isDirty || isSaving) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          Settings saved successfully. You may need to restart the application for changes to take effect.
        </div>
      )}

      {saveError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {saveError}
        </div>
      )}

      {/* Connection Status */}
      <div className="mt-10">
        <h3 className="text-lg font-medium mb-4">Connection Status</h3>
        <ConnectivityStatus />
      </div>
    </div>
  );
} 