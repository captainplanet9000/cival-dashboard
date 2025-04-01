'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  BacktestService, 
  Strategy, 
  BacktestConfig, 
  BacktestResult 
} from '../../../../services/backtest-service';
import { BacktestEquityChart } from '../../../../components/strategies/BacktestEquityChart';
import { DeployStrategyDialog } from '../../../../components/strategies/DeployStrategyDialog';

export default function StrategyBacktestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strategyId = searchParams.get('strategyId');
  const containerRef = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState<number>(600);
  
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [config, setConfig] = useState<BacktestConfig>({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 10000,
    symbol: 'BTCUSDT',
    timeframe: '1h',
    fees: 0.1,
    slippage: 0.05,
    riskPerTrade: 2
  });
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [runningBacktest, setRunningBacktest] = useState<boolean>(false);
  const [showDeployDialog, setShowDeployDialog] = useState<boolean>(false);
  
  // Create backtest service instance
  const backtestService = new BacktestService();
  
  // List of available symbols and timeframes
  const availableSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'DOGEUSDT'];
  const availableTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
  
  // Measure container width for responsive chart
  useEffect(() => {
    if (containerRef.current) {
      setInnerWidth(containerRef.current.clientWidth - 40); // 40px for padding
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setInnerWidth(containerRef.current.clientWidth - 40);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Fetch strategies on load
  useEffect(() => {
    async function fetchStrategies() {
      try {
        setLoading(true);
        
        // Use our service to fetch strategies
        const activeStrategies = await backtestService.getActiveStrategies();
        setStrategies(activeStrategies);
        
        // If strategyId is provided in URL, fetch that strategy
        if (strategyId) {
          const selectedStrategy = await backtestService.getStrategyById(strategyId);
          if (selectedStrategy) {
            setStrategy(selectedStrategy);
          }
        }
      } catch (error: any) {
        console.error('Error fetching strategies:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStrategies();
  }, [strategyId]);
  
  // Handle strategy selection change
  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId) {
      router.push(`/dashboard/strategies/backtest?strategyId=${selectedId}`);
    } else {
      setStrategy(null);
      router.push('/dashboard/strategies/backtest');
    }
  };
  
  // Handle config changes
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: name === 'initialCapital' || name === 'fees' || name === 'slippage' || name === 'riskPerTrade' 
        ? parseFloat(value) 
        : value
    }));
  };
  
  // Run backtest
  const runBacktest = async () => {
    if (!strategy) {
      setError('Please select a strategy to backtest');
      return;
    }
    
    try {
      setRunningBacktest(true);
      setError(null);
      
      // Use our service to run the backtest
      const results = await backtestService.runBacktest(strategy, config);
      setBacktestResults(results);
      
    } catch (error: any) {
      console.error('Error running backtest:', error);
      setError(error.message || 'Failed to run backtest');
    } finally {
      setRunningBacktest(false);
    }
  };
  
  // Format percentage
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Format currency
  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const handleDeploySuccess = (deploymentId: string) => {
    console.log(`Strategy successfully deployed with ID: ${deploymentId}`);
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Strategy Backtesting</h1>
        <p className="text-gray-600">Test your trading strategies against historical market data.</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Strategy Selection</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Strategy</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={strategy?.id || ''}
                onChange={handleStrategyChange}
              >
                <option value="">-- Select a Strategy --</option>
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            {strategy && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{strategy.name}</div>
                <div className="text-sm text-gray-500 capitalize">{strategy.strategy_type}</div>
                {strategy.description && (
                  <div className="mt-2 text-sm">{strategy.description}</div>
                )}
              </div>
            )}
            
            <div className="flex justify-end">
              <Link 
                href="/dashboard/strategies/pinescript/import" 
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Import New Strategy
              </Link>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Backtest Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                <select
                  name="symbol"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.symbol}
                  onChange={handleConfigChange}
                >
                  {availableSymbols.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                <select
                  name="timeframe"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.timeframe}
                  onChange={handleConfigChange}
                >
                  {availableTimeframes.map(tf => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.startDate}
                  onChange={handleConfigChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.endDate}
                  onChange={handleConfigChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Capital</label>
                <input
                  type="number"
                  name="initialCapital"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.initialCapital}
                  onChange={handleConfigChange}
                  min="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trading Fees (%)</label>
                <input
                  type="number"
                  name="fees"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.fees}
                  onChange={handleConfigChange}
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slippage (%)</label>
                <input
                  type="number"
                  name="slippage"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.slippage}
                  onChange={handleConfigChange}
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Per Trade (%)</label>
                <input
                  type="number"
                  name="riskPerTrade"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={config.riskPerTrade}
                  onChange={handleConfigChange}
                  step="0.1"
                  min="0.1"
                  max="100"
                />
              </div>
              
              <div className="pt-4">
                <button
                  onClick={runBacktest}
                  disabled={!strategy || runningBacktest}
                  className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {runningBacktest ? 'Running Backtest...' : 'Run Backtest'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2" ref={containerRef}>
          {backtestResults ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Backtest Results</h2>
                <div className="text-sm text-gray-500">
                  {new Date(backtestResults.created_at).toLocaleString()}
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Total Profit/Loss</div>
                    <div className={`text-lg font-semibold ${backtestResults.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(backtestResults.profit_loss)}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Win Rate</div>
                    <div className="text-lg font-semibold">
                      {backtestResults.win_rate.toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Total Trades</div>
                    <div className="text-lg font-semibold">
                      {backtestResults.total_trades}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Sharpe Ratio</div>
                    <div className="text-lg font-semibold">
                      {backtestResults.sharpe_ratio.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <BacktestEquityChart 
                      data={backtestResults.equity_curve}
                      initialCapital={config.initialCapital}
                      startDate={config.startDate}
                      endDate={config.endDate}
                      height={300}
                      width={innerWidth || 600}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Entry Price</th>
                          <th className="text-left p-2">Exit Price</th>
                          <th className="text-left p-2">Size</th>
                          <th className="text-left p-2">P/L</th>
                          <th className="text-left p-2">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {backtestResults.trade_data.slice(0, 10).map((trade) => (
                          <tr key={trade.id} className="hover:bg-gray-50">
                            <td className={`p-2 capitalize ${trade.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                              {trade.type}
                            </td>
                            <td className="p-2">{formatCurrency(trade.entry_price)}</td>
                            <td className="p-2">{formatCurrency(trade.exit_price)}</td>
                            <td className="p-2">{trade.size.toFixed(2)}</td>
                            <td className={`p-2 ${trade.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(trade.profit_loss)}
                            </td>
                            <td className="p-2">{trade.duration_hours.toFixed(1)} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setBacktestResults(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Run Another Backtest
                  </button>
                  
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    onClick={() => setShowDeployDialog(true)}
                  >
                    Deploy to Trading Farm
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-medium mb-2">Run a Backtest</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Select a strategy and configure your backtest parameters, then click "Run Backtest" to see how your strategy would have performed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {strategy && showDeployDialog && (
        <DeployStrategyDialog
          isOpen={showDeployDialog}
          onClose={() => setShowDeployDialog(false)}
          strategy={strategy}
          backtestResult={backtestResults || undefined}
          onSuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
} 