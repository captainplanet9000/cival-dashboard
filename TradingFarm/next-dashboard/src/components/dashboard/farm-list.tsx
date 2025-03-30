"use client";

import { useState, useEffect } from 'react';
import { api } from '../../lib/api-client';
import { formatCurrency, formatPercentage, formatDate } from '../../lib/api-utils';
import Link from 'next/link';

/**
 * Interface for farm data
 */
interface Farm {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  risk_profile: {
    max_drawdown: number;
    max_trade_size?: number;
    risk_per_trade?: number;
    volatility_tolerance?: 'low' | 'medium' | 'high';
  };
  performance_metrics: {
    win_rate: number;
    profit_factor?: number;
    trades_count: number;
    total_profit_loss?: number;
    average_win?: number;
    average_loss?: number;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Component to display a list of farms with filtering and sorting options
 */
export default function FarmList() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'risk' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch farms data
  useEffect(() => {
    async function loadFarms() {
      try {
        setLoading(true);
        const response = await api.getFarms();
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setFarms(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch farms');
      } finally {
        setLoading(false);
      }
    }
    
    loadFarms();
  }, []);

  // Apply filters and sorting
  const filteredAndSortedFarms = (() => {
    // Filter by status
    let result = [...farms];
    if (statusFilter !== 'all') {
      result = result.filter(farm => 
        (statusFilter === 'active' ? farm.is_active : !farm.is_active)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
          
        case 'performance':
          const aPerformance = a.performance_metrics.total_profit_loss || 0;
          const bPerformance = b.performance_metrics.total_profit_loss || 0;
          comparison = aPerformance - bPerformance;
          break;
          
        case 'risk':
          comparison = a.risk_profile.max_drawdown - b.risk_profile.max_drawdown;
          break;
          
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  })();

  /**
   * Toggles the sort order when clicking the same sort field
   */
  const handleSortChange = (field: 'name' | 'performance' | 'risk' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending for new sort field
    }
  };

  /**
   * Renders a sort indicator arrow
   */
  const SortIndicator = ({ field }: { field: 'name' | 'performance' | 'risk' | 'date' }) => {
    if (sortBy !== field) return null;
    
    return (
      <span className="ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        <p className="font-medium">Error loading farms</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filter and sort controls */}
      <div className="p-4 border-b flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All Farms</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">Sort by:</span>
          <div className="flex gap-4">
            <button 
              onClick={() => handleSortChange('name')}
              className={`${sortBy === 'name' ? 'font-medium text-primary' : ''}`}
            >
              Name<SortIndicator field="name" />
            </button>
            <button 
              onClick={() => handleSortChange('performance')}
              className={`${sortBy === 'performance' ? 'font-medium text-primary' : ''}`}
            >
              Performance<SortIndicator field="performance" />
            </button>
            <button 
              onClick={() => handleSortChange('risk')}
              className={`${sortBy === 'risk' ? 'font-medium text-primary' : ''}`}
            >
              Risk<SortIndicator field="risk" />
            </button>
            <button 
              onClick={() => handleSortChange('date')}
              className={`${sortBy === 'date' ? 'font-medium text-primary' : ''}`}
            >
              Date<SortIndicator field="date" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Farms list */}
      {filteredAndSortedFarms.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No farms found matching your criteria
        </div>
      ) : (
        <div className="divide-y">
          {filteredAndSortedFarms.map(farm => (
            <div key={farm.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-lg">
                    <Link href={`/dashboard/farm-management/${farm.id}`} className="text-primary hover:underline">
                      {farm.name}
                    </Link>
                  </h3>
                  {farm.description && (
                    <p className="text-gray-600 text-sm">{farm.description}</p>
                  )}
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${
                    farm.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {farm.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Performance</p>
                  <p className={`font-medium ${
                    (farm.performance_metrics.total_profit_loss || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {farm.performance_metrics.total_profit_loss 
                      ? formatCurrency(farm.performance_metrics.total_profit_loss) 
                      : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Win Rate</p>
                  <p className="font-medium">
                    {formatPercentage(farm.performance_metrics.win_rate)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Max Drawdown</p>
                  <p className="font-medium text-amber-600">
                    {formatPercentage(farm.risk_profile.max_drawdown)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {formatDate(farm.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 