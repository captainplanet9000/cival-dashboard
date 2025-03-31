"use client";

import { useEffect, useState } from "react";
import { agentApi, Agent } from "../../../lib/api-client";
import Link from "next/link";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      setLoading(true);
      const response = await agentApi.getAgents();
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setAgents(response.data);
      }
      
      setLoading(false);
    }

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Agents</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Agents</h1>
          <p className="text-gray-500">Manage your trading agents and their configurations</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          + Create Agent
        </button>
      </div>

      {/* Filter section */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label htmlFor="farm-filter" className="block text-sm font-medium text-gray-700">Farm</label>
            <select
              id="farm-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Farms</option>
              <option value="1">Farm 1</option>
              <option value="2">Farm 2</option>
            </select>
          </div>
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">Agent Type</label>
            <select
              id="type-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="trend">Trend Following</option>
              <option value="mean">Mean Reversion</option>
              <option value="breakout">Breakout</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="ml-auto flex items-end">
            <button className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Agents list */}
      {agents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Farm</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Win Rate</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/dashboard/agents/${agent.id}`} className="font-medium text-blue-600 hover:underline">
                      {agent.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <Link href={`/dashboard/farms/${agent.farm_id}`} className="text-blue-600 hover:underline">
                      Farm {agent.farm_id}
                    </Link>
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
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    <div className="flex justify-center space-x-3">
                      <Link href={`/dashboard/agents/${agent.id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
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
          <p className="mb-4 text-sm text-gray-500">Get started by creating your first trading agent</p>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Create Agent
          </button>
        </div>
      )}
    </div>
  );
}