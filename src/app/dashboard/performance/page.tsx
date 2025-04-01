'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFarms } from '../../../hooks/useFarms';
import { StrategyDeploymentService, StrategyDeployment } from '../../../services/strategy-deployment-service';
import { Line, Bar } from 'react-chartjs-2';
import { PerformanceMetricsCard } from '../../../components/performance/PerformanceMetricsCard';
import { RiskAssessmentCard } from '../../../components/performance/RiskAssessmentCard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function PerformanceDashboardPage() {
  const { farms, loading: farmsLoading } = useFarms();
  const [deployments, setDeployments] = useState<StrategyDeployment[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({
    totalProfit: 0,
    averageWinRate: 0,
    totalTrades: 0,
    activeStrategies: 0,
    dailyPerformance: [],
    strategyPerformance: []
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Create deployment service instance
  const deploymentService = new StrategyDeploymentService();

  // Mock performance data generation
  const generateMockPerformanceData = (deployments: StrategyDeployment[]) => {
    // Filter only active deployments
    const activeDeployments = deployments.filter(d => d.status === 'active');
    
    // Calculate overall metrics
    let totalPL = 0;
    let totalWinRate = 0;
    let totalTradeCount = 0;
    
    // Generate mock daily performance data
    const days = timeRangeToDays(selectedTimeRange);
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      return {
        date: date.toISOString().split('T')[0],
        profit: ((Math.random() * 2) - 0.5) * 2, // Between -1% and 3%
        trades: Math.floor(Math.random() * 15) + 5
      };
    });
    
    // Generate strategy performance data
    const strategyData = activeDeployments.map(deployment => {
      const profitLoss = Math.random() * 20 - (Math.random() * 5); // -5% to 20%
      const winRate = 40 + Math.random() * 40; // 40% to 80%
      const trades = Math.floor(Math.random() * 100) + 10;
      
      totalPL += profitLoss;
      totalWinRate += winRate;
      totalTradeCount += trades;
      
      return {
        id: deployment.id,
        strategyId: deployment.strategy_id,
        farmId: deployment.farm_id,
        symbol: deployment.config.symbol,
        profitLoss,
        winRate,
        trades,
        sharpeRatio: (1 + Math.random() * 2).toFixed(2),
        maxDrawdown: (Math.random() * 15).toFixed(2),
        volatility: 5 + Math.random() * 20,
        correlation: Math.random() * 0.8,
        var95: Math.random() * 5 + 1,
        var99: Math.random() * 7 + 2
      };
    });
    
    return {
      totalProfit: totalPL.toFixed(2),
      averageWinRate: activeDeployments.length > 0 ? (totalWinRate / activeDeployments.length).toFixed(2) : 0,
      totalTrades: totalTradeCount,
      activeStrategies: activeDeployments.length,
      dailyPerformance: dailyData,
      strategyPerformance: strategyData
    };
  };

  // Convert time range to number of days
  const timeRangeToDays = (range: string): number => {
    switch (range) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  // Load deployments and performance data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Get deployments for a specific farm or all farms
        let allDeployments: StrategyDeployment[] = [];
        
        if (selectedFarmId && selectedFarmId !== 'all') {
          const farmDeployments = await deploymentService.getFarmDeployments(selectedFarmId);
          allDeployments = farmDeployments;
        } else {
          // Get deployments for each farm
          for (const farm of farms) {
            try {
              const farmDeployments = await deploymentService.getFarmDeployments(farm.id);
              allDeployments.push(...farmDeployments);
            } catch (err) {
              console.error(`Error fetching deployments for farm ${farm.id}:`, err);
            }
          }
        }
        
        setDeployments(allDeployments);
        
        // Generate mock performance metrics
        // In a real app, you would fetch this from an API
        const metrics = generateMockPerformanceData(allDeployments);
        setPerformanceMetrics(metrics);
        
        // Set first strategy as selected if nothing is selected
        if (!selectedStrategyId && metrics.strategyPerformance.length > 0) {
          setSelectedStrategyId(metrics.strategyPerformance[0].id);
        }
        
      } catch (err: any) {
        console.error('Error fetching performance data:', err);
        setError(err.message || 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch if farms are loaded
    if (!farmsLoading && farms.length > 0) {
      fetchData();
    }
  }, [selectedFarmId, farms, farmsLoading, selectedTimeRange]);

  // Handle farm selection change
  const handleFarmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFarmId(e.target.value);
  };

  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
  };
  
  // Handle strategy selection
  const handleStrategySelect = (id: string) => {
    setSelectedStrategyId(id);
  };

  // Get farm name by ID
  const getFarmName = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId);
    return farm ? farm.name : 'Unknown Farm';
  };

  // Chart data for daily performance
  const dailyChartData = {
    labels: performanceMetrics.dailyPerformance.map((day: any) => day.date),
    datasets: [
      {
        label: 'Daily P/L (%)',
        data: performanceMetrics.dailyPerformance.map((day: any) => day.profit),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.2
      }
    ]
  };

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  // Strategy performance chart data
  const strategyChartData = {
    labels: performanceMetrics.strategyPerformance.map((strategy: any) => 
      strategy.strategyId.substring(0, 8) + '...' + ' (' + strategy.symbol + ')'
    ),
    datasets: [
      {
        label: 'Profit/Loss (%)',
        data: performanceMetrics.strategyPerformance.map((strategy: any) => strategy.profitLoss),
        backgroundColor: performanceMetrics.strategyPerformance.map((strategy: any) => 
          strategy.profitLoss >= 0 ? 'rgba(75, 192, 92, 0.6)' : 'rgba(255, 99, 132, 0.6)'
        ),
        borderColor: performanceMetrics.strategyPerformance.map((strategy: any) => 
          strategy.profitLoss >= 0 ? 'rgb(75, 192, 92)' : 'rgb(255, 99, 132)'
        ),
        borderWidth: 1
      }
    ]
  };
  
  // Get the selected strategy data
  const getSelectedStrategyData = () => {
    return performanceMetrics.strategyPerformance.find((s: any) => s.id === selectedStrategyId);
  };
  
  const selectedStrategy = getSelectedStrategyData();

  return (
    <div className="p-6" ref={containerRef}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Performance Dashboard</h1>
        <p className="text-gray-600">Monitor the performance of your deployed trading strategies in real-time</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
        
        <div className="flex space-x-2">
          <button 
            onClick={() => handleTimeRangeChange('24h')}
            className={`px-3 py-1 rounded ${selectedTimeRange === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            24h
          </button>
          <button 
            onClick={() => handleTimeRangeChange('7d')}
            className={`px-3 py-1 rounded ${selectedTimeRange === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            7D
          </button>
          <button 
            onClick={() => handleTimeRangeChange('30d')}
            className={`px-3 py-1 rounded ${selectedTimeRange === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            30D
          </button>
          <button 
            onClick={() => handleTimeRangeChange('90d')}
            className={`px-3 py-1 rounded ${selectedTimeRange === '90d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            90D
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Loading performance data...
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Total P/L (%)</div>
              <div className={`text-2xl font-bold ${Number(performanceMetrics.totalProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(performanceMetrics.totalProfit) >= 0 ? '+' : ''}{performanceMetrics.totalProfit}%
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Average Win Rate</div>
              <div className="text-2xl font-bold">{performanceMetrics.averageWinRate}%</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Total Trades</div>
              <div className="text-2xl font-bold">{performanceMetrics.totalTrades}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Active Strategies</div>
              <div className="text-2xl font-bold">{performanceMetrics.activeStrategies}</div>
            </div>
          </div>
          
          {/* Daily Performance Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Daily Performance</h2>
            <div className="h-72">
              <Line data={dailyChartData} options={chartOptions} />
            </div>
          </div>
          
          {/* Strategy Performance Table and Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Strategy Performance</h2>
              <div className="h-80">
                <Bar 
                  data={strategyChartData} 
                  options={{
                    indexAxis: 'y' as const,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      x: {
                        ticks: {
                          callback: function(value: any) {
                            return value + '%';
                          }
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-xl font-semibold p-6 pb-4">Strategy Details</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Strategy
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Farm
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P/L
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sharpe
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {performanceMetrics.strategyPerformance.map((strategy: any) => (
                      <tr 
                        key={strategy.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${strategy.id === selectedStrategyId ? 'bg-blue-50' : ''}`}
                        onClick={() => handleStrategySelect(strategy.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {strategy.strategyId.substring(0, 10)}...
                              </div>
                              <div className="text-sm text-gray-500">
                                {strategy.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{getFarmName(strategy.farmId)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${strategy.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {strategy.profitLoss >= 0 ? '+' : ''}{strategy.profitLoss.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{strategy.winRate.toFixed(2)}%</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{strategy.sharpeRatio}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Selected Strategy Details */}
          {selectedStrategy && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceMetricsCard
                title={`Strategy Performance - ${selectedStrategy.strategyId.substring(0, 8)}...`}
                metrics={[
                  { label: 'Symbol', value: selectedStrategy.symbol },
                  { label: 'Farm', value: getFarmName(selectedStrategy.farmId) },
                  { label: 'Profit/Loss', value: selectedStrategy.profitLoss.toFixed(2), isPercentage: true, change: Number(selectedStrategy.profitLoss) > 0 ? 12.5 : -8.3 },
                  { label: 'Win Rate', value: selectedStrategy.winRate.toFixed(2), isPercentage: true },
                  { label: 'Total Trades', value: selectedStrategy.trades },
                  { label: 'Avg. Trade Duration', value: '4.2 hours' },
                  { label: 'Sharpe Ratio', value: selectedStrategy.sharpeRatio },
                  { label: 'Max Drawdown', value: selectedStrategy.maxDrawdown, isPercentage: true }
                ]}
              />
              
              <RiskAssessmentCard
                maxDrawdown={Number(selectedStrategy.maxDrawdown)}
                volatility={selectedStrategy.volatility}
                sharpeRatio={Number(selectedStrategy.sharpeRatio)}
                correlation={selectedStrategy.correlation}
                var95={selectedStrategy.var95}
                var99={selectedStrategy.var99}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
} 