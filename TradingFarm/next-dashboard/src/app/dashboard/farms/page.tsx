"use client";

import { useEffect, useState } from "react";
import { farmApi, Farm } from "../../../lib/api-client";
import Link from "next/link";

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFarms() {
      setLoading(true);
      const response = await farmApi.getFarms();
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setFarms(response.data);
      }
      
      setLoading(false);
    }

    fetchFarms();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading farms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Farms</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Farms</h1>
          <p className="text-gray-500">Manage your trading farms and their configurations</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          + Create Farm
        </button>
      </div>

      {/* Farms grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {farms.map((farm) => (
          <Link
            href={`/dashboard/farms/${farm.id}`}
            key={farm.id}
            className="block rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{farm.name}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${farm.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {farm.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{farm.description || 'No description'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md bg-gray-50 p-2 text-center">
                <p className="text-xs text-gray-500">Agents</p>
                <p className="text-lg font-semibold text-gray-900">{farm.agents_count || 0}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2 text-center">
                <p className="text-xs text-gray-500">Strategies</p>
                <p className="text-lg font-semibold text-gray-900">{farm.strategies_count || 0}</p>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div 
                  className="h-full rounded-full bg-blue-500" 
                  style={{ width: `${calculateFarmHealth(farm)}%` }}
                ></div>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-gray-500">Farm Health</p>
                <p className="text-xs font-medium text-gray-900">{calculateFarmHealth(farm)}%</p>
              </div>
            </div>
          </Link>
        ))}
        
        {farms.length === 0 && (
          <div className="col-span-full rounded-lg border border-gray-200 bg-white p-8 text-center">
            <h3 className="mb-1 text-lg font-medium text-gray-900">No Farms Found</h3>
            <p className="mb-4 text-sm text-gray-500">Get started by creating your first trading farm</p>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Create Farm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to calculate farm health percentage (demo only)
function calculateFarmHealth(farm: Farm): number {
  // In a real app, this would be based on more sophisticated metrics
  return farm.is_active ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 30) + 20;
}