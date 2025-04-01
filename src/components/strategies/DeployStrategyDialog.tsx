'use client';

import React, { useState, useEffect } from 'react';
import { Strategy, BacktestResult } from '../../services/backtest-service';
import { StrategyDeploymentService, DeploymentConfig } from '../../services/strategy-deployment-service';
import { Farm } from '../../hooks/useFarms';

interface DeployStrategyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: Strategy;
  backtestResult?: BacktestResult;
  onSuccess?: (deploymentId: string) => void;
}

export const DeployStrategyDialog: React.FC<DeployStrategyDialogProps> = ({
  isOpen,
  onClose,
  strategy,
  backtestResult,
  onSuccess
}) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state for deployment configuration
  const [config, setConfig] = useState<Partial<DeploymentConfig>>({
    initialCapital: backtestResult?.config.initialCapital || 10000,
    maxPositionSize: backtestResult?.config.initialCapital ? backtestResult.config.initialCapital * 0.1 : 1000,
    symbol: backtestResult?.config.symbol || 'BTCUSDT',
    allocatedPercentage: 10,
    riskPerTrade: backtestResult?.config.riskPerTrade || 1,
    stopLossPercentage: 5,
    takeProfitPercentage: 10,
    maxDrawdownPercentage: 25,
    maxOpenPositions: 3
  });
  
  const deploymentService = new StrategyDeploymentService();
  
  // Fetch available farms
  useEffect(() => {
    async function fetchFarms() {
      try {
        setLoading(true);
        
        const { data, error } = await fetch('/api/farms?active=true').then(res => res.json());
        
        if (error) throw new Error(error.message);
        
        setFarms(data || []);
        
        // If there's only one farm, auto-select it
        if (data && data.length === 1) {
          setSelectedFarmId(data[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching farms:', err);
        setError('Failed to load farms. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    if (isOpen) {
      fetchFarms();
    }
  }, [isOpen]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFarmId) {
      setError('Please select a farm to deploy to');
      return;
    }
    
    if (config.initialCapital && config.initialCapital <= 0) {
      setError('Initial capital must be greater than zero');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Find the selected farm
      const farm = farms.find(f => f.id === selectedFarmId);
      
      if (!farm) {
        throw new Error('Selected farm not found');
      }
      
      // Deploy the strategy
      const deploymentResult = await deploymentService.deployStrategy(
        selectedFarmId,
        strategy,
        {
          ...config,
          farmId: selectedFarmId,
          strategyId: strategy.id
        },
        backtestResult
      );
      
      setSuccess(true);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(deploymentResult.id);
      }
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
        setSuccess(false); // Reset success state
      }, 2000);
      
    } catch (err: any) {
      console.error('Error deploying strategy:', err);
      setError(err.message || 'Failed to deploy strategy. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Deploy Strategy to Farm</h2>
          <p className="text-gray-600 text-sm mt-1">
            Configure how you want to deploy "{strategy.name}" to a trading farm
          </p>
        </div>
        
        {success ? (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-center mb-4">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Strategy successfully deployed!</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Farm
                </label>
                <select
                  name="farmId"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  disabled={loading || farms.length === 0}
                  required
                >
                  <option value="">-- Select a Farm --</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Capital
                  </label>
                  <input
                    type="number"
                    name="initialCapital"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.initialCapital}
                    onChange={handleInputChange}
                    min="100"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Position Size
                  </label>
                  <input
                    type="number"
                    name="maxPositionSize"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.maxPositionSize}
                    onChange={handleInputChange}
                    min="10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  name="symbol"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.symbol}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio Allocation (%)
                  </label>
                  <input
                    type="number"
                    name="allocatedPercentage"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.allocatedPercentage}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risk Per Trade (%)
                  </label>
                  <input
                    type="number"
                    name="riskPerTrade"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.riskPerTrade}
                    onChange={handleInputChange}
                    min="0.1"
                    max="10"
                    step="0.1"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    name="stopLossPercentage"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.stopLossPercentage}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                    step="0.5"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Take Profit (%)
                  </label>
                  <input
                    type="number"
                    name="takeProfitPercentage"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.takeProfitPercentage}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    step="0.5"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Drawdown (%)
                  </label>
                  <input
                    type="number"
                    name="maxDrawdownPercentage"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.maxDrawdownPercentage}
                    onChange={handleInputChange}
                    min="5"
                    max="50"
                    step="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Open Positions
                  </label>
                  <input
                    type="number"
                    name="maxOpenPositions"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.maxOpenPositions}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    step="1"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting || !selectedFarmId}
              >
                {submitting ? 'Deploying...' : 'Deploy Strategy'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}; 