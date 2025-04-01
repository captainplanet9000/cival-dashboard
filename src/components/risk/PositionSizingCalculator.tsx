import React, { useState, useEffect } from 'react';
import PositionSizingService, { 
  PositionSizingConfig, 
  PositionSizingResult,
  PriceData
} from '../../services/position-sizing-service';

interface PositionSizingCalculatorProps {
  symbol?: string;
  initialPrice?: number;
  historicalPrices?: PriceData[];
  onPositionSizeCalculated?: (result: PositionSizingResult) => void;
  className?: string;
}

export const PositionSizingCalculator: React.FC<PositionSizingCalculatorProps> = ({
  symbol = 'BTC/USD',
  initialPrice = 50000,
  historicalPrices = [],
  onPositionSizeCalculated,
  className = ''
}) => {
  const positionSizingService = PositionSizingService.getInstance();
  const defaultConfig = positionSizingService.getDefaultConfig();
  
  const [config, setConfig] = useState<PositionSizingConfig>(defaultConfig);
  const [entryPrice, setEntryPrice] = useState<number>(initialPrice);
  const [stopLossPrice, setStopLossPrice] = useState<number | null>(null);
  const [result, setResult] = useState<PositionSizingResult | null>(null);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState<number>(1);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  
  // Generate some mock historical price data if none provided
  const [mockPrices, setMockPrices] = useState<PriceData[]>([]);
  
  useEffect(() => {
    if (historicalPrices.length === 0) {
      const prices: PriceData[] = [];
      const basePrice = initialPrice;
      const now = new Date();
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const randomFactor = 0.98 + Math.random() * 0.04; // Random between 0.98 and 1.02
        const price = basePrice * randomFactor;
        
        prices.push({
          date,
          high: price * (1 + Math.random() * 0.02), // High up to 2% above close
          low: price * (1 - Math.random() * 0.02), // Low up to 2% below close
          close: price
        });
      }
      
      setMockPrices(prices);
    }
  }, [initialPrice, historicalPrices]);
  
  const pricesForCalculation = historicalPrices.length > 0 ? historicalPrices : mockPrices;
  const currentPrice = pricesForCalculation.length > 0 
    ? pricesForCalculation[pricesForCalculation.length - 1].close 
    : initialPrice;
  
  // Calculate position size when inputs change
  useEffect(() => {
    if (pricesForCalculation.length === 0) return;
    
    let calculatedResult: PositionSizingResult;
    
    if (config.useVolatilityPositionSizing) {
      calculatedResult = positionSizingService.calculateVolatilityBasedPosition(
        config,
        entryPrice,
        currentPrice,
        pricesForCalculation,
        leverage
      );
    } else {
      calculatedResult = positionSizingService.calculateFixedPercentagePosition(
        config,
        entryPrice,
        stopLossPrice,
        currentPrice,
        leverage
      );
    }
    
    setResult(calculatedResult);
    
    if (onPositionSizeCalculated) {
      onPositionSizeCalculated(calculatedResult);
    }
  }, [config, entryPrice, stopLossPrice, pricesForCalculation, currentPrice, leverage]);
  
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    }));
  };
  
  const handleReset = () => {
    setConfig(positionSizingService.getDefaultConfig());
    setStopLossPrice(null);
    setOrderType('market');
    setDirection('long');
    setLeverage(1);
  };
  
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Position Sizing Calculator</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="symbol">
              Symbol
            </label>
            <input
              type="text"
              id="symbol"
              className="border border-gray-300 rounded-md p-2 w-full"
              value={symbol}
              disabled
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="direction">
              Direction
            </label>
            <div className="flex">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-l-md ${
                  direction === 'long'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setDirection('long')}
              >
                Long
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-r-md ${
                  direction === 'short'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setDirection('short')}
              >
                Short
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="order-type">
              Order Type
            </label>
            <div className="flex">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-l-md ${
                  orderType === 'market'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setOrderType('market')}
              >
                Market
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-r-md ${
                  orderType === 'limit'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setOrderType('limit')}
              >
                Limit
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="entry-price">
              {orderType === 'market' ? 'Current Price' : 'Entry Price'}
            </label>
            <input
              type="number"
              id="entry-price"
              name="entryPrice"
              className="border border-gray-300 rounded-md p-2 w-full"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value))}
              step="0.01"
              min="0"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="stop-loss">
              Stop Loss Price (Optional)
            </label>
            <input
              type="number"
              id="stop-loss"
              name="stopLoss"
              className="border border-gray-300 rounded-md p-2 w-full"
              value={stopLossPrice || ''}
              onChange={(e) => setStopLossPrice(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Optional"
              step="0.01"
              min="0"
              disabled={config.useVolatilityPositionSizing}
            />
            {config.useVolatilityPositionSizing && (
              <p className="text-xs text-gray-500 mt-1">
                Stop loss is automatically calculated when using volatility-based sizing
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="account-size">
              Account Size
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">$</span>
              <input
                type="number"
                id="account-size"
                name="accountSize"
                className="border border-gray-300 rounded-md p-2 w-full"
                value={config.accountSize}
                onChange={handleConfigChange}
                step="100"
                min="100"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="risk-per-trade">
              Risk Per Trade (%)
            </label>
            <div className="flex items-center">
              <input
                type="number"
                id="risk-per-trade"
                name="riskPerTrade"
                className="border border-gray-300 rounded-md p-2 w-full"
                value={config.riskPerTrade}
                onChange={handleConfigChange}
                step="0.1"
                min="0.1"
                max="10"
              />
              <span className="text-gray-500 ml-2">%</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="leverage">
              Leverage
            </label>
            <div className="flex items-center">
              <input
                type="range"
                id="leverage"
                name="leverage"
                className="w-full"
                value={leverage}
                onChange={(e) => setLeverage(parseFloat(e.target.value))}
                min="1"
                max="10"
                step="1"
              />
              <span className="text-gray-500 ml-2 w-8 text-right">{leverage}x</span>
            </div>
          </div>
        </div>
        
        <div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="use-volatility"
              name="useVolatilityPositionSizing"
              className="h-4 w-4 border-gray-300 rounded text-blue-600"
              checked={config.useVolatilityPositionSizing}
              onChange={handleConfigChange}
            />
            <label htmlFor="use-volatility" className="ml-2 text-sm font-medium">
              Use Volatility-Based Position Sizing
            </label>
          </div>
          
          {config.useVolatilityPositionSizing && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="volatility-method">
                  Volatility Calculation Method
                </label>
                <div className="flex">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-l-md ${
                      config.useATR
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setConfig({ ...config, useATR: true })}
                  >
                    ATR
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-r-md ${
                      !config.useATR
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setConfig({ ...config, useATR: false })}
                  >
                    Standard Deviation
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="volatility-lookback">
                  Volatility Lookback Periods
                </label>
                <input
                  type="number"
                  id="volatility-lookback"
                  name="volatilityLookback"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={config.volatilityLookback}
                  onChange={handleConfigChange}
                  step="1"
                  min="2"
                  max="50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of periods to look back for volatility calculation
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="volatility-multiplier">
                  Volatility Multiplier
                </label>
                <input
                  type="number"
                  id="volatility-multiplier"
                  name="volatilityMultiplier"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={config.volatilityMultiplier}
                  onChange={handleConfigChange}
                  step="0.1"
                  min="0.1"
                  max="5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Adjusts position size relative to volatility (higher = larger positions)
                </p>
              </div>
            </>
          )}
          
          <button
            type="button"
            className="text-blue-600 hover:text-blue-800 text-sm mb-6"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>
          
          {showAdvancedOptions && (
            <div className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="max-position-size">
                  Max Position Size (%)
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    id="max-position-size"
                    name="maxPositionSize"
                    className="border border-gray-300 rounded-md p-2 w-full"
                    value={config.maxPositionSize}
                    onChange={handleConfigChange}
                    step="1"
                    min="1"
                    max="100"
                  />
                  <span className="text-gray-500 ml-2">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum percentage of account to allocate to a single position
                </p>
              </div>
            </div>
          )}
          
          {result && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Calculated Position Size:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Position Size:</div>
                <div className="font-medium">${result.positionSize.toFixed(2)}</div>
                
                <div className="text-gray-600">Position Units:</div>
                <div className="font-medium">{result.positionSizeUnits.toFixed(6)}</div>
                
                <div className="text-gray-600">Account %:</div>
                <div className="font-medium">{result.positionSizePercentage.toFixed(2)}%</div>
                
                <div className="text-gray-600">Risk Amount:</div>
                <div className="font-medium">${result.riskAmount.toFixed(2)}</div>
                
                <div className="text-gray-600">Risk %:</div>
                <div className="font-medium">{result.riskPercentage.toFixed(2)}%</div>
                
                {config.useVolatilityPositionSizing && (
                  <>
                    <div className="text-gray-600">Volatility Factor:</div>
                    <div className="font-medium">{result.volatilityFactor.toFixed(2)}x</div>
                  </>
                )}
                
                {result.stopLossPrice && (
                  <>
                    <div className="text-gray-600">Stop Loss:</div>
                    <div className="font-medium">${result.stopLossPrice.toFixed(2)}</div>
                  </>
                )}
                
                {result.leverageUsed > 1 && (
                  <>
                    <div className="text-gray-600">Leverage:</div>
                    <div className="font-medium">{result.leverageUsed.toFixed(1)}x</div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2 hover:bg-gray-400"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 