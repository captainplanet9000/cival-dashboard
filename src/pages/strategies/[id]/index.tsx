import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Strategy } from '../../../services/strategies';

export default function StrategyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchStrategy() {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/strategies?id=${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch strategy');
        }
        
        const data = await response.json();
        setStrategy(data);
      } catch (err) {
        console.error('Error fetching strategy:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStrategy();
  }, [id]);

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
  
  // Function to get badge class for strategy status
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
  
  // Function to get strategy type icon
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <span className="text-3xl mr-3">{getStrategyTypeIcon(strategy.strategy_type)}</span>
          <div>
            <h1 className="text-3xl font-bold">{strategy.name}</h1>
            <div className="flex items-center mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(strategy.status)}`}>
                {strategy.status}
              </span>
              <span className="ml-4 text-sm text-gray-500">
                Version: {strategy.version}
              </span>
              <span className="ml-4 text-sm text-gray-500">
                Created: {new Date(strategy.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Link 
            href={`/strategies/${id}/edit`}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
          >
            Edit
          </Link>
          <Link 
            href={`/strategies/${id}/backtest`}
            className="px-4 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
          >
            Backtest
          </Link>
          <Link 
            href={`/strategies/${id}/deploy`}
            className="px-4 py-2 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 transition-colors"
          >
            Deploy
          </Link>
        </div>
      </div>
      
      {/* Description */}
      {strategy.description && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">{strategy.description}</p>
        </div>
      )}
      
      {/* Strategy Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Entry Conditions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Entry Conditions</h2>
          
          {strategy.entry_conditions.length === 0 ? (
            <p className="text-gray-500 italic">No entry conditions defined</p>
          ) : (
            <ul className="space-y-3">
              {strategy.entry_conditions.map((condition, index) => (
                <li key={index} className="bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">{condition.description || condition.type}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {Object.entries(condition.params).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        {key}: <span className="font-medium">{value?.toString()}</span>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Exit Conditions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Exit Conditions</h2>
          
          {strategy.exit_conditions.length === 0 ? (
            <p className="text-gray-500 italic">No exit conditions defined</p>
          ) : (
            <ul className="space-y-3">
              {strategy.exit_conditions.map((condition, index) => (
                <li key={index} className="bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">{condition.description || condition.type}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {Object.entries(condition.params).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        {key}: <span className="font-medium">{value?.toString()}</span>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Risk Management */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Risk Management</h2>
          
          {Object.keys(strategy.risk_management).length === 0 ? (
            <p className="text-gray-500 italic">No risk management parameters defined</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {strategy.risk_management.stopLoss && (
                <div>
                  <div className="text-gray-500 text-sm">Stop Loss</div>
                  <div className="font-medium">{strategy.risk_management.stopLoss}%</div>
                </div>
              )}
              
              {strategy.risk_management.takeProfit && (
                <div>
                  <div className="text-gray-500 text-sm">Take Profit</div>
                  <div className="font-medium">{strategy.risk_management.takeProfit}%</div>
                </div>
              )}
              
              {strategy.risk_management.trailingStop && (
                <div>
                  <div className="text-gray-500 text-sm">Trailing Stop</div>
                  <div className="font-medium">{strategy.risk_management.trailingStop}%</div>
                </div>
              )}
              
              {strategy.risk_management.maxDrawdown && (
                <div>
                  <div className="text-gray-500 text-sm">Max Drawdown</div>
                  <div className="font-medium">{strategy.risk_management.maxDrawdown}%</div>
                </div>
              )}
              
              {strategy.risk_management.positionSizing && (
                <div>
                  <div className="text-gray-500 text-sm">Position Sizing</div>
                  <div className="font-medium">{strategy.risk_management.positionSizing}</div>
                </div>
              )}
              
              {strategy.risk_management.maxPositions && (
                <div>
                  <div className="text-gray-500 text-sm">Max Positions</div>
                  <div className="font-medium">{strategy.risk_management.maxPositions}</div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Parameters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Parameters</h2>
          
          {Object.keys(strategy.parameters).length === 0 ? (
            <p className="text-gray-500 italic">No parameters defined</p>
          ) : (
            <div className="space-y-4">
              {strategy.parameters.timeframe && (
                <div>
                  <div className="text-gray-500 text-sm">Timeframe</div>
                  <div className="font-medium">{strategy.parameters.timeframe}</div>
                </div>
              )}
              
              {strategy.parameters.markets && strategy.parameters.markets.length > 0 && (
                <div>
                  <div className="text-gray-500 text-sm">Markets</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {strategy.parameters.markets.map((market, index) => (
                      <span key={index} className="inline-block bg-gray-100 px-2 py-1 rounded text-sm">
                        {market}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {strategy.parameters.leverage !== undefined && (
                <div>
                  <div className="text-gray-500 text-sm">Leverage</div>
                  <div className="font-medium">{strategy.parameters.leverage}x</div>
                </div>
              )}
              
              {strategy.parameters.indicators && strategy.parameters.indicators.length > 0 && (
                <div>
                  <div className="text-gray-500 text-sm mb-2">Indicators</div>
                  <ul className="space-y-2">
                    {strategy.parameters.indicators.map((indicator, index) => (
                      <li key={index} className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{indicator.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {Object.entries(indicator.params).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: <span className="font-medium">{value}</span>
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Strategy Code */}
      {strategy.code && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Strategy Code</h2>
          <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto">
            <code>{strategy.code}</code>
          </pre>
        </div>
      )}
      
      {/* Performance Metrics */}
      {strategy.performance_metrics && Object.keys(strategy.performance_metrics).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {strategy.performance_metrics.winRate !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Win Rate</div>
                <div className="font-medium">{strategy.performance_metrics.winRate.toFixed(2)}%</div>
              </div>
            )}
            
            {strategy.performance_metrics.profitFactor !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Profit Factor</div>
                <div className="font-medium">{strategy.performance_metrics.profitFactor.toFixed(2)}</div>
              </div>
            )}
            
            {strategy.performance_metrics.sharpeRatio !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Sharpe Ratio</div>
                <div className="font-medium">{strategy.performance_metrics.sharpeRatio.toFixed(2)}</div>
              </div>
            )}
            
            {strategy.performance_metrics.maxDrawdown !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Max Drawdown</div>
                <div className="font-medium">{strategy.performance_metrics.maxDrawdown.toFixed(2)}%</div>
              </div>
            )}
            
            {strategy.performance_metrics.totalTrades !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Total Trades</div>
                <div className="font-medium">{strategy.performance_metrics.totalTrades}</div>
              </div>
            )}
            
            {strategy.performance_metrics.profitableTrades !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Profitable Trades</div>
                <div className="font-medium">{strategy.performance_metrics.profitableTrades}</div>
              </div>
            )}
            
            {strategy.performance_metrics.averageProfit !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Average Profit</div>
                <div className="font-medium">{strategy.performance_metrics.averageProfit.toFixed(2)}%</div>
              </div>
            )}
            
            {strategy.performance_metrics.averageLoss !== undefined && (
              <div>
                <div className="text-gray-500 text-sm">Average Loss</div>
                <div className="font-medium">{strategy.performance_metrics.averageLoss.toFixed(2)}%</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Tags */}
      {strategy.tags && strategy.tags.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {strategy.tags.map((tag, index) => (
              <span 
                key={index} 
                className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 