import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Strategy } from '../../services/strategies';

export default function StrategiesList() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStrategies() {
      try {
        setLoading(true);
        const response = await fetch('/api/strategies');
        
        if (!response.ok) {
          throw new Error('Failed to fetch strategies');
        }
        
        const data = await response.json();
        setStrategies(data);
      } catch (err) {
        console.error('Error fetching strategies:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStrategies();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      case 'backtesting':
        return 'bg-blue-100 text-blue-800';
      case 'optimizing':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStrategyTypeIcon = (type: string) => {
    switch (type) {
      case 'momentum':
        return '📈';
      case 'mean_reversion':
        return '🔄';
      case 'breakout':
        return '💥';
      case 'trend_following':
        return '📊';
      case 'arbitrage':
        return '⚖️';
      case 'grid':
        return '🔲';
      case 'martingale':
        return '🎰';
      case 'custom':
        return '🛠️';
      default:
        return '📋';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trading Strategies</h1>
        <Link 
          href="/strategies/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Strategy
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : strategies.length === 0 ? (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-lg text-gray-600 mb-4">No strategies found</p>
          <p className="text-gray-500">
            Create your first trading strategy to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getStrategyTypeIcon(strategy.strategy_type)}</span>
                    <h2 className="text-xl font-semibold text-gray-800">{strategy.name}</h2>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(strategy.status)}`}>
                    {strategy.status}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {strategy.description || 'No description provided'}
                </p>
                
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>Version: {strategy.version}</span>
                  <span>{new Date(strategy.updated_at).toLocaleDateString()}</span>
                </div>
                
                {strategy.tags && strategy.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {strategy.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between gap-2 mt-4">
                  <Link 
                    href={`/strategies/${strategy.id}`}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 flex-1 text-center"
                  >
                    View
                  </Link>
                  <Link 
                    href={`/strategies/${strategy.id}/edit`}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex-1 text-center"
                  >
                    Edit
                  </Link>
                  <Link 
                    href={`/strategies/${strategy.id}/backtest`}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 flex-1 text-center"
                  >
                    Backtest
                  </Link>
                </div>
              </div>
              
              {strategy.performance_metrics && (
                <div className="bg-gray-50 px-6 py-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Performance</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Win Rate</p>
                      <p className="font-semibold">
                        {strategy.performance_metrics.winRate 
                          ? `${strategy.performance_metrics.winRate.toFixed(2)}%` 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Profit Factor</p>
                      <p className="font-semibold">
                        {strategy.performance_metrics.profitFactor 
                          ? strategy.performance_metrics.profitFactor.toFixed(2)
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Max Drawdown</p>
                      <p className="font-semibold">
                        {strategy.performance_metrics.maxDrawdown 
                          ? `${strategy.performance_metrics.maxDrawdown.toFixed(2)}%`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 