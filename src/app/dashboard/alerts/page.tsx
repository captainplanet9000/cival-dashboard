'use client';

import React, { useState, useEffect } from 'react';
import { AlertConfiguration, AlertConfig } from '../../../components/performance/AlertConfiguration';
import NotificationService, { NotificationSubscription } from '../../../services/notification-service';

export default function AlertsPage() {
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');
  
  const notificationService = NotificationService.getInstance();
  
  useEffect(() => {
    // Load subscriptions
    const loadSubscriptions = () => {
      const subs = notificationService.getSubscriptions();
      setSubscriptions(subs);
    };
    
    loadSubscriptions();
  }, []);
  
  const handleSaveConfig = (config: AlertConfig) => {
    if (editingSubscriptionId) {
      // Update existing subscription
      const updatedSubscription = notificationService.updateSubscription(editingSubscriptionId, config);
      if (updatedSubscription) {
        setSubscriptions(prev => prev.map(sub => 
          sub.id === editingSubscriptionId ? updatedSubscription : sub
        ));
      }
      setEditingSubscriptionId(null);
    } else if (isCreating) {
      // Create new subscription
      const newSubscription = notificationService.createSubscription(config);
      setSubscriptions(prev => [...prev, newSubscription]);
      setIsCreating(false);
    }
  };
  
  const handleDelete = (id: string) => {
    const success = notificationService.deleteSubscription(id);
    if (success) {
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    }
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };
  
  // Function to get an emoji for alert type
  const getAlertTypeEmoji = (config: AlertConfig) => {
    if (config.profitThreshold && config.profitThreshold > 0) return '📈';
    if (config.lossThreshold && config.lossThreshold > 0) return '📉';
    if (config.drawdownThreshold && config.drawdownThreshold > 0) return '🔻';
    if (config.winRateThreshold && config.winRateThreshold > 0) return '🎯';
    return '🔔';
  };
  
  // Function to generate a human-readable description of the alert
  const getAlertDescription = (config: AlertConfig) => {
    const conditions = [];
    
    if (config.profitThreshold && config.profitThreshold > 0) {
      conditions.push(`profit exceeds ${config.profitThreshold}%`);
    }
    
    if (config.lossThreshold && config.lossThreshold > 0) {
      conditions.push(`loss exceeds ${config.lossThreshold}%`);
    }
    
    if (config.drawdownThreshold && config.drawdownThreshold > 0) {
      conditions.push(`drawdown exceeds ${config.drawdownThreshold}%`);
    }
    
    if (config.winRateThreshold && config.winRateThreshold > 0) {
      conditions.push(`win rate falls below ${config.winRateThreshold}%`);
    }
    
    if (config.tradeCountThreshold && config.tradeCountThreshold > 0) {
      conditions.push(`trade count exceeds ${config.tradeCountThreshold}`);
    }
    
    if (conditions.length === 0) {
      return 'No specific conditions set';
    }
    
    return `Alert when ${conditions.join(' or ')}`;
  };
  
  // Function to get alert scope
  const getScopeDescription = (config: AlertConfig) => {
    switch (config.scope) {
      case 'strategy':
        return 'Specific strategy';
      case 'farm':
        return 'Specific farm';
      case 'all':
        return 'All strategies';
      default:
        return 'Unknown scope';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Performance Alerts</h1>
        <p className="text-gray-600">Configure and manage alerts for your trading strategies</p>
      </div>
      
      <div className="flex mb-6">
        <div className="space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${
              selectedTab === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedTab('active')}
          >
            Active Alerts
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              selectedTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedTab('history')}
          >
            Alert History
          </button>
        </div>
        
        <div className="ml-auto">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            onClick={() => {
              setIsCreating(true);
              setEditingSubscriptionId(null);
            }}
            disabled={isCreating || !!editingSubscriptionId}
          >
            + New Alert
          </button>
        </div>
      </div>
      
      {selectedTab === 'active' ? (
        <div className="space-y-6">
          {isCreating && (
            <AlertConfiguration
              onSave={handleSaveConfig}
            />
          )}
          
          {editingSubscriptionId && (
            <AlertConfiguration
              onSave={handleSaveConfig}
              defaultConfig={subscriptions.find(sub => sub.id === editingSubscriptionId)?.alertConfig}
            />
          )}
          
          {!isCreating && !editingSubscriptionId && subscriptions.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No alert configurations found. Create your first alert to get started.
            </div>
          )}
          
          {!isCreating && !editingSubscriptionId && subscriptions.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alert Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conditions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scope
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{getAlertTypeEmoji(subscription.alertConfig)}</span>
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.alertConfig.enabled ? 'Active' : 'Disabled'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{getAlertDescription(subscription.alertConfig)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getScopeDescription(subscription.alertConfig)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm capitalize text-gray-900">{subscription.alertConfig.frequency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(subscription.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => setEditingSubscriptionId(subscription.id)}
                        >
                          Edit
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDelete(subscription.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Alert history feature is coming soon...
        </div>
      )}
    </div>
  );
} 