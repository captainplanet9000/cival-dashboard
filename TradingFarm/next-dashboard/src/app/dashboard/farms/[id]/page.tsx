"use client";

import { useEffect, useState } from "react";
import { farmApi, agentApi, Farm, Agent } from "../../../../lib/api-client";
import Link from "next/link";

interface FarmDetailPageProps {
  params: {
    id: string;
  };
}

export default function FarmDetailPage({ params }: FarmDetailPageProps) {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFarmData() {
      setLoading(true);
      const farmId = parseInt(params.id, 10);
      
      if (isNaN(farmId)) {
        setError("Invalid farm ID");
        setLoading(false);
        return;
      }
      
      try {
        // Fetch the farm details
        const farmResponse = await farmApi.getFarm(farmId);
        
        if (farmResponse.error) {
          throw new Error(farmResponse.error);
        }
        
        setFarm(farmResponse.data || null);
        
        // Fetch agents for this farm
        const agentsResponse = await agentApi.getAgents(farmId);
        
        if (!agentsResponse.error && agentsResponse.data) {
          setAgents(agentsResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load farm data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchFarmData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading farm details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Farm</h3>
          <p className="text-red-600">{error}</p>
          <Link href="/dashboard/farms" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Farms
          </Link>
        </div>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Farm Not Found</h3>
          <p className="mb-4 text-gray-600">The requested farm could not be found.</p>
          <Link href="/dashboard/farms" className="text-blue-600 hover:underline">
            Back to Farms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Farm Header */}
      <div className="mb-8 flex flex-col items-start justify-between space-y-4 sm:flex-row sm:space-y-0">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Link href="/dashboard/farms" className="text-blue-600 hover:underline">
              Farms
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">{farm.name}</h1>
            <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${farm.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {farm.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-gray-500">{farm.description || 'No description provided'}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Edit Farm
          </button>
          <button className={`rounded-md px-4 py-2 text-sm font-medium text-white ${farm.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {farm.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Farm Overview */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Farm Stats */}
        <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Farm Overview</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard title="Agents" value={agents.length} />
            <StatCard title="Active Agents" value={agents.filter(a => a.is_active).length} />
            <StatCard title="Win Rate" value={farm.performance_metrics?.win_rate ? `${(farm.performance_metrics.win_rate * 100).toFixed(1)}%` : 'N/A'} />
            <StatCard title="Profit Factor" value={farm.performance_metrics?.profit_factor?.toFixed(2) || 'N/A'} />
          </div>
          
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Performance Metrics</h3>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full rounded-full bg-blue-500" 
                style={{ width: `${getFarmPerformance(farm)}%` }}
              ></div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                <span className="ml-1 text-xs text-gray-500">Performance Score</span>
              </div>
              <span className="text-xs font-medium text-gray-900">{getFarmPerformance(farm)}%</span>
            </div>
          </div>
        </div>
        
        {/* Risk Profile */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Risk Profile</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Max Drawdown</p>
              <p className="text-lg font-semibold text-gray-900">{farm.risk_profile?.max_drawdown || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risk per Trade</p>
              <p className="text-lg font-semibold text-gray-900">{farm.risk_profile?.risk_per_trade || 1}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Volatility Tolerance</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{farm.risk_profile?.volatility_tolerance || 'medium'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Farm Agents</h2>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Add Agent
          </button>
        </div>
        
        {agents.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Win Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Profit Factor</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {agent.agent_type || 'Custom'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${agent.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {agent.performance_metrics?.win_rate
                        ? `${(agent.performance_metrics.win_rate * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {agent.performance_metrics?.profit_factor?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                      <div className="flex justify-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">View</button>
                        <button className="text-blue-600 hover:text-blue-900">Edit</button>
                        <button className={`${agent.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
                          {agent.is_active ? 'Stop' : 'Start'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <h3 className="mb-1 text-lg font-medium text-gray-900">No Agents Found</h3>
            <p className="mb-4 text-sm text-gray-500">Add agents to this farm to start trading</p>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="rounded-md bg-gray-50 p-4 text-center">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// Helper function to calculate farm performance percentage (demo only)
function getFarmPerformance(farm: Farm): number {
  // In a real app, this would be based on more sophisticated metrics
  if (farm.performance_metrics?.win_rate) {
    return Math.min(100, Math.round(farm.performance_metrics.win_rate * 100) + 
           (farm.performance_metrics.profit_factor ? Math.round(farm.performance_metrics.profit_factor * 10) : 0));
  }
  return Math.floor(Math.random() * 40) + 30;
} 