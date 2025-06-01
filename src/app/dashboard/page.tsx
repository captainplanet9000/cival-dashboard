"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FarmApi, FarmBasicInfo } from '@/lib/api/farms';
import { StrategyApi, StrategyBasicInfo } from '@/lib/api/strategies';
import { PerformanceMetrics } from '@/types/database-json.types';

export default function DashboardOverviewPage() {
  const [farms, setFarms] = useState<FarmBasicInfo[]>([]);
  const [strategies, setStrategies] = useState<StrategyBasicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch summary data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch data in parallel using the API class methods
        const [farmsData, strategiesData] = await Promise.all([
          FarmApi.fetchActiveFarms(5),
          StrategyApi.fetchRecentStrategies(5)
        ]);

        setFarms(farmsData);
        setStrategies(strategiesData);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }

      setFarms(data);
      if (data.length > 0 && !selectedFarmId) {
        setSelectedFarmId(data[0].id);
      }
      setIsLoading(false);
    };

    fetchFarms();
  }, [supabase, selectedFarmId]);

  // Sample performance data (replace with real data)
  const performanceData = [
    { date: '2024-01', value: 1000 },
    { date: '2024-02', value: 1200 },
    { date: '2024-03', value: 1100 },
    { date: '2024-04', value: 1400 },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Trading Farms */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Active Trading Farms</h2>
              <Link 
                href="/dashboard/farms" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            
            {farms.length === 0 ? (
              <p className="text-gray-500">No active trading farms found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2">Name</th>
                      <th className="text-left pb-2">Performance</th>
                      <th className="text-left pb-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farms.map((farm) => (
                      <tr key={farm.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <Link 
                            href={`/dashboard/farms/${farm.id}`} 
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {farm.name}
                          </Link>
                        </td>
                        <td className="py-3">
                          {(farm.performance_metrics && typeof farm.performance_metrics.profit_loss === 'number')
                            ? <span className={farm.performance_metrics.profit_loss >= 0 ? "text-green-600" : "text-red-600"}>
                                {farm.performance_metrics.profit_loss >= 0 ? "+" : ""}{farm.performance_metrics.profit_loss.toFixed(2)}%
                              </span>
                            : "N/A"}
                        </td>
                        <td className="py-3 text-gray-500">
                          {formatDate(farm.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Recent Strategies */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Strategies</h2>
              <Link 
                href="/dashboard/strategies" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            
            {strategies.length === 0 ? (
              <p className="text-gray-500">No strategies found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2">Name</th>
                      <th className="text-left pb-2">Type</th>
                      <th className="text-left pb-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategies.map((strategy) => (
                      <tr key={strategy.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <Link 
                            href={`/dashboard/strategies/${strategy.id}`} 
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {strategy.name}
                          </Link>
                        </td>
                        <td className="py-3 capitalize">
                          {strategy.strategy_type?.replace(/_/g, ' ') ?? 'N/A'}
                        </td>
                        <td className="py-3 text-gray-500">
                          {formatDate(strategy.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {/* Add recent activity items here */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Trade Executed</p>
                    <p className="text-sm text-gray-500">BTC/USDT @ $45,000</p>
                  </div>
                  <p className="text-sm text-gray-500">5m ago</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">New Order</p>
                    <p className="text-sm text-gray-500">Limit Buy ETH/USDT</p>
                  </div>
                  <p className="text-sm text-gray-500">15m ago</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Agent Status</p>
                    <p className="text-sm text-gray-500">
                      Risk Manager updated parameters
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">1h ago</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/dashboard/farms/create" 
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-center"
              >
                Create New Farm
              </Link>
              <Link 
                href="/dashboard/strategies/pinescript/import" 
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-center"
              >
                Import PineScript
              </Link>
              <Link 
                href="/dashboard/strategies/backtest" 
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-center"
              >
                Backtest Strategy
              </Link>
              <Link 
                href="/dashboard/memory" 
                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-center"
              >
                Memory Explorer
              </Link>
            </div>
          </div>
          
          {/* System Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Farms</span>
                <span className="font-medium">{farms.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recent Strategies</span>
                <span className="font-medium">{strategies.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API Status</span>
                <span className="text-green-600">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vector Memory</span>
                <span className="text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last System Update</span>
                <span className="text-gray-600">Today at 9:42 AM</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 