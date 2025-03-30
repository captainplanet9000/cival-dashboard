import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Strategy, StrategyBacktest } from '../../../services/strategies';
import { Timeframe } from '../../../integrations/supabase/types';

// Component to display backtest results
const BacktestResults = ({ results }: { results: any }) => {
  if (!results) return null;
  
  const { metrics, trades } = results;
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Backtest Results</h2>
      
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-2">Returns</h3>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Initial Capital:</span>
              <span className="font-medium">{formatCurrency(metrics.initialCapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Final Balance:</span>
              <span className="font-medium">{formatCurrency(metrics.finalBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Profit/Loss:</span>
              <span className={`font-medium ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.totalProfitLoss)} ({formatPercent(metrics.totalProfitLossPercent)})
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-2">Trade Statistics</h3>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades:</span>
              <span className="font-medium">{metrics.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate:</span>
              <span className="font-medium">{formatPercent(metrics.winRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Factor:</span>
              <span className="font-medium">{metrics.profitFactor.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-2">Risk Metrics</h3>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Max Drawdown:</span>
              <span className="font-medium">{formatPercent(metrics.maxDrawdown)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sharpe Ratio:</span>
              <span className="font-medium">{metrics.sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expectancy:</span>
              <span className="font-medium">{formatPercent(metrics.expectancy)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trade List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h3 className="text-lg font-semibold p-4 border-b">Trade History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trade.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(trade.entryTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(trade.exitTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(trade.entryPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(trade.exitPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {trade.size.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(trade.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={trade.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(trade.profitPercent)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {trade.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main backtest page component
export default function StrategyBacktestPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [previousBacktests, setPreviousBacktests] = useState<StrategyBacktest[]>([]);
  const [loading, setLoading] = useState(true);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formState, setFormState] = useState({
    market: 'BTC-USD',
    timeframe: '1h' as Timeframe,
    strategyVersion: '',
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    initialCapital: 10000
  });
  
  // Get default dates for the form
  function getDefaultStartDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - 3); // 3 months ago
    return date.toISOString().slice(0, 10);
  }
  
  function getDefaultEndDate() {
    return new Date().toISOString().slice(0, 10);
  }
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: name === 'initialCapital' ? parseFloat(value) : value
    }));
  };
  
  // Load strategy and previous backtests
  useEffect(() => {
    async function loadStrategyData() {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch strategy data
        const strategyResponse = await fetch(`/api/strategies?id=${id}`);
        if (!strategyResponse.ok) {
          throw new Error('Failed to fetch strategy');
        }
        const strategyData: Strategy = await strategyResponse.json();
        setStrategy(strategyData);
        
        // Set the current version in the form
        setFormState(prevState => ({
          ...prevState,
          strategyVersion: strategyData.version
        }));
        
        // Fetch previous backtests
        const backtestsResponse = await fetch(`/api/strategies/backtests?strategyId=${id}`);
        if (backtestsResponse.ok) {
          const backtestsData: StrategyBacktest[] = await backtestsResponse.json();
          setPreviousBacktests(backtestsData);
        }
      } catch (err) {
        console.error('Error loading strategy data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load strategy data');
      } finally {
        setLoading(false);
      }
    }
    
    loadStrategyData();
  }, [id]);
  
  // Run backtest
  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setBacktestLoading(true);
      setBacktestResults(null);
      
      const response = await fetch('/api/strategies/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategyId: id,
          strategyVersion: formState.strategyVersion,
          timeframe: formState.timeframe,
          startDate: formState.startDate,
          endDate: formState.endDate,
          market: formState.market,
          initialCapital: formState.initialCapital
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run backtest');
      }
      
      const data = await response.json();
      setBacktestResults(data.results);
      
      // Update previous backtests list
      setPreviousBacktests(prevBacktests => [data.backtest, ...prevBacktests]);
    } catch (err) {
      console.error('Error running backtest:', err);
      setError(err instanceof Error ? err.message : 'Failed to run backtest');
    } finally {
      setBacktestLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }
  
  if (!strategy) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Warning:</strong>
          <span className="block sm:inline"> Strategy not found</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{strategy.name} - Backtest</h1>
          <p className="text-gray-600">{strategy.description}</p>
        </div>
        <Link 
          href={`/strategies/${id}`}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
        >
          Back to Strategy
        </Link>
      </div>
      
      {/* Backtest Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Configure Backtest</h2>
        
        <form onSubmit={handleRunBacktest}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Market</label>
              <select
                name="market"
                value={formState.market}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              >
                <option value="BTC-USD">Bitcoin (BTC-USD)</option>
                <option value="ETH-USD">Ethereum (ETH-USD)</option>
                <option value="SOL-USD">Solana (SOL-USD)</option>
                <option value="BNB-USD">Binance Coin (BNB-USD)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
              <select
                name="timeframe"
                value={formState.timeframe}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
                <option value="1w">1 Week</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Version</label>
              <select
                name="strategyVersion"
                value={formState.strategyVersion}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              >
                <option value={strategy.version}>Current ({strategy.version})</option>
                {/* In a real app, you'd fetch and list all available versions */}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formState.startDate}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formState.endDate}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital (USD)</label>
              <input
                type="number"
                name="initialCapital"
                value={formState.initialCapital}
                onChange={handleInputChange}
                min="100"
                step="100"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={backtestLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {backtestLoading ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Backtest Results */}
      {backtestResults && (
        <BacktestResults results={backtestResults} />
      )}
      
      {/* Previous Backtests */}
      {previousBacktests.length > 0 && !backtestResults && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Previous Backtests</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeframe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previousBacktests.map((backtest) => (
                  <tr key={backtest.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(backtest.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backtest.market}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backtest.timeframe}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(backtest.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(backtest.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(backtest.metrics as any).winRate?.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={(backtest.metrics as any).totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {((backtest.metrics as any).totalProfitLossPercent).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => {
                          // In a real app, you'd load and display the backtest results
                          alert('View backtest details (not implemented)');
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 