import React, { useState } from 'react';

interface AlertConfigurationProps {
  strategyId?: string;
  farmId?: string;
  onSave: (config: AlertConfig) => void;
  defaultConfig?: AlertConfig;
  className?: string;
}

export interface AlertConfig {
  enabled: boolean;
  profitThreshold?: number;
  lossThreshold?: number;
  drawdownThreshold?: number;
  winRateThreshold?: number;
  tradeCountThreshold?: number;
  notificationChannels: {
    email: boolean;
    browser: boolean;
    mobile: boolean;
    webhook?: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  scope: 'strategy' | 'farm' | 'all';
  strategyId?: string;
  farmId?: string;
}

export const AlertConfiguration: React.FC<AlertConfigurationProps> = ({
  strategyId,
  farmId,
  onSave,
  defaultConfig,
  className = '',
}) => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(
    defaultConfig || {
      enabled: true,
      profitThreshold: 5,
      lossThreshold: 5,
      drawdownThreshold: 10,
      winRateThreshold: 40,
      tradeCountThreshold: 10,
      notificationChannels: {
        email: true,
        browser: true,
        mobile: false,
      },
      frequency: 'immediate',
      scope: strategyId ? 'strategy' : farmId ? 'farm' : 'all',
      strategyId,
      farmId,
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      if (name.startsWith('channel-')) {
        const channel = name.replace('channel-', '');
        setAlertConfig({
          ...alertConfig,
          notificationChannels: {
            ...alertConfig.notificationChannels,
            [channel]: checked,
          },
        });
      } else {
        setAlertConfig({
          ...alertConfig,
          [name]: checked,
        });
      }
    } else if (name === 'scope') {
      setAlertConfig({
        ...alertConfig,
        scope: value as 'strategy' | 'farm' | 'all',
      });
    } else if (name === 'frequency') {
      setAlertConfig({
        ...alertConfig,
        frequency: value as 'immediate' | 'hourly' | 'daily' | 'weekly',
      });
    } else if (name === 'webhook') {
      setAlertConfig({
        ...alertConfig,
        notificationChannels: {
          ...alertConfig.notificationChannels,
          webhook: value,
        },
      });
    } else {
      setAlertConfig({
        ...alertConfig,
        [name]: type === 'number' ? parseFloat(value) : value,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(alertConfig);
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Performance Alert Configuration</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <label htmlFor="enabled" className="text-sm font-medium">
              Enable Alerts
            </label>
            <div className="relative inline-block w-12 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="enabled"
                id="enabled"
                className="sr-only"
                checked={alertConfig.enabled}
                onChange={handleChange}
              />
              <div className={`block h-6 rounded-full w-12 transition ${alertConfig.enabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform transform ${alertConfig.enabled ? 'translate-x-6' : ''}`}></div>
            </div>
          </div>
        </div>
        
        {alertConfig.enabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="profitThreshold" className="block text-sm font-medium mb-1">
                  Profit Threshold (%)
                </label>
                <input
                  type="number"
                  name="profitThreshold"
                  id="profitThreshold"
                  step="0.1"
                  min="0"
                  className="px-3 py-2 border border-gray-300 rounded-md w-full"
                  value={alertConfig.profitThreshold || ''}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Alert when profit exceeds this percentage</p>
              </div>
              
              <div>
                <label htmlFor="lossThreshold" className="block text-sm font-medium mb-1">
                  Loss Threshold (%)
                </label>
                <input
                  type="number"
                  name="lossThreshold"
                  id="lossThreshold"
                  step="0.1"
                  min="0"
                  className="px-3 py-2 border border-gray-300 rounded-md w-full"
                  value={alertConfig.lossThreshold || ''}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Alert when loss exceeds this percentage</p>
              </div>
              
              <div>
                <label htmlFor="drawdownThreshold" className="block text-sm font-medium mb-1">
                  Max Drawdown Threshold (%)
                </label>
                <input
                  type="number"
                  name="drawdownThreshold"
                  id="drawdownThreshold"
                  step="0.1"
                  min="0"
                  className="px-3 py-2 border border-gray-300 rounded-md w-full"
                  value={alertConfig.drawdownThreshold || ''}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Alert when drawdown exceeds this percentage</p>
              </div>
              
              <div>
                <label htmlFor="winRateThreshold" className="block text-sm font-medium mb-1">
                  Win Rate Threshold (%)
                </label>
                <input
                  type="number"
                  name="winRateThreshold"
                  id="winRateThreshold"
                  step="0.1"
                  min="0"
                  max="100"
                  className="px-3 py-2 border border-gray-300 rounded-md w-full"
                  value={alertConfig.winRateThreshold || ''}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Alert when win rate falls below this percentage</p>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="frequency" className="block text-sm font-medium mb-1">
                Alert Frequency
              </label>
              <select
                name="frequency"
                id="frequency"
                className="px-3 py-2 border border-gray-300 rounded-md w-full"
                value={alertConfig.frequency}
                onChange={handleChange}
              >
                <option value="immediate">Immediate</option>
                <option value="hourly">Hourly Digest</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Notification Channels
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="channel-email"
                    id="channel-email"
                    className="h-4 w-4 border-gray-300 rounded text-blue-600"
                    checked={alertConfig.notificationChannels.email}
                    onChange={handleChange}
                  />
                  <label htmlFor="channel-email" className="ml-2 text-sm">
                    Email Notifications
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="channel-browser"
                    id="channel-browser"
                    className="h-4 w-4 border-gray-300 rounded text-blue-600"
                    checked={alertConfig.notificationChannels.browser}
                    onChange={handleChange}
                  />
                  <label htmlFor="channel-browser" className="ml-2 text-sm">
                    Browser Notifications
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="channel-mobile"
                    id="channel-mobile"
                    className="h-4 w-4 border-gray-300 rounded text-blue-600"
                    checked={alertConfig.notificationChannels.mobile}
                    onChange={handleChange}
                  />
                  <label htmlFor="channel-mobile" className="ml-2 text-sm">
                    Mobile Push Notifications
                  </label>
                </div>
                
                <div className="mt-3">
                  <label htmlFor="webhook" className="block text-sm mb-1">
                    Webhook URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="webhook"
                    id="webhook"
                    placeholder="https://your-webhook-url.com"
                    className="px-3 py-2 border border-gray-300 rounded-md w-full"
                    value={alertConfig.notificationChannels.webhook || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="scope" className="block text-sm font-medium mb-1">
                Alert Scope
              </label>
              <select
                name="scope"
                id="scope"
                className="px-3 py-2 border border-gray-300 rounded-md w-full"
                value={alertConfig.scope}
                onChange={handleChange}
                disabled={!!strategyId || !!farmId}
              >
                <option value="strategy" disabled={!strategyId}>Specific Strategy</option>
                <option value="farm" disabled={!farmId}>Specific Farm</option>
                <option value="all">All Strategies</option>
              </select>
            </div>
          </>
        )}
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
          >
            Save Alert Configuration
          </button>
        </div>
      </form>
    </div>
  );
}; 