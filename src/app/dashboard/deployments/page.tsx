'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  StrategyDeploymentService, 
  StrategyDeployment,
  DeploymentStatus
} from '../../../services/strategy-deployment-service';
import { useFarms } from '../../../hooks/useFarms';

export default function DeploymentsPage() {
  const { farms, loading: farmsLoading } = useFarms();
  const [deployments, setDeployments] = useState<StrategyDeployment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all');
  
  // Create deployment service instance
  const deploymentService = new StrategyDeploymentService();
  
  // Load deployments
  useEffect(() => {
    async function fetchDeployments() {
      try {
        setLoading(true);
        setError(null);
        
        // Get deployments for a specific farm or all farms
        if (selectedFarmId && selectedFarmId !== 'all') {
          const farmDeployments = await deploymentService.getFarmDeployments(selectedFarmId);
          setDeployments(farmDeployments);
        } else {
          // In a real app, you'd have an API to get all deployments
          // Here we'll just mock it by getting deployments for each farm
          const allDeployments: StrategyDeployment[] = [];
          
          for (const farm of farms) {
            try {
              const farmDeployments = await deploymentService.getFarmDeployments(farm.id);
              allDeployments.push(...farmDeployments);
            } catch (err) {
              console.error(`Error fetching deployments for farm ${farm.id}:`, err);
            }
          }
          
          // Sort by created_at (newest first)
          allDeployments.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          setDeployments(allDeployments);
        }
      } catch (err: any) {
        console.error('Error fetching deployments:', err);
        setError(err.message || 'Failed to load deployments');
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch if farms are loaded
    if (!farmsLoading && farms.length > 0) {
      fetchDeployments();
    }
  }, [selectedFarmId, farms, farmsLoading]);
  
  // Handle farm selection change
  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFarmId(e.target.value);
  };
  
  // Handle status change
  const handleStatusChange = async (deploymentId: string, newStatus: DeploymentStatus) => {
    try {
      const updatedDeployment = await deploymentService.updateDeploymentStatus(deploymentId, newStatus);
      
      if (updatedDeployment) {
        // Update local state
        setDeployments(prev => 
          prev.map(d => d.id === deploymentId ? updatedDeployment : d)
        );
      }
    } catch (err: any) {
      console.error('Error updating deployment status:', err);
      // Could show a toast notification here
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Get status badge style
  const getStatusBadgeStyle = (status: DeploymentStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-blue-100 text-blue-800';
      case 'stopped':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get farm name by ID
  const getFarmName = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId);
    return farm ? farm.name : 'Unknown Farm';
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Strategy Deployments</h1>
        <p className="text-gray-600">Manage your active strategy deployments across all farms</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="farm-select" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Farm
              </label>
              <select
                id="farm-select"
                className="border border-gray-300 rounded-md p-2"
                value={selectedFarmId}
                onChange={handleFarmChange}
                disabled={farmsLoading || farms.length === 0}
              >
                <option value="all">All Farms</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <Link
            href="/dashboard/strategies/backtest"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Deploy New Strategy
          </Link>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading deployments...
          </div>
        ) : deployments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No strategy deployments found.</p>
            <Link 
              href="/dashboard/strategies/backtest" 
              className="text-blue-600 hover:underline"
            >
              Backtest and deploy a strategy
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strategy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capital
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deployments.map(deployment => (
                  <tr key={deployment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {getFarmName(deployment.farm_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {deployment.strategy_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {deployment.config.symbol}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${deployment.config.initialCapital.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {deployment.config.allocatedPercentage}% of portfolio
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(deployment.status)}`}>
                        {deployment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(deployment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        {deployment.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(deployment.id, 'paused')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Pause
                          </button>
                        )}
                        {deployment.status === 'paused' && (
                          <button
                            onClick={() => handleStatusChange(deployment.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Resume
                          </button>
                        )}
                        {(deployment.status === 'active' || deployment.status === 'paused') && (
                          <button
                            onClick={() => handleStatusChange(deployment.id, 'stopped')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Stop
                          </button>
                        )}
                        {deployment.status === 'stopped' && (
                          <button
                            onClick={() => handleStatusChange(deployment.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Restart
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 