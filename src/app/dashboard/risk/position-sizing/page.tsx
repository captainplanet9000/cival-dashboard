'use client';

import React, { useState } from 'react';
import { PositionSizingCalculator } from '../../../../components/risk/PositionSizingCalculator';
import { PositionSizingResult } from '../../../../services/position-sizing-service';

export default function PositionSizingPage() {
  const [calculationHistory, setCalculationHistory] = useState<PositionSizingResult[]>([]);
  
  const handlePositionSizeCalculated = (result: PositionSizingResult) => {
    // Add new calculation to history, keeping only the last 5
    setCalculationHistory(prev => {
      const newHistory = [result, ...prev];
      return newHistory.slice(0, 5);
    });
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Position Sizing Calculator</h1>
        <p className="text-gray-600">
          Calculate optimal position sizes based on your risk management rules and market volatility
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PositionSizingCalculator 
            onPositionSizeCalculated={handlePositionSizeCalculated}
          />
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Volatility-Based Position Sizing</h2>
            <p className="text-sm text-gray-600 mb-4">
              Volatility-based position sizing automatically adjusts your position size based on market conditions:
            </p>
            
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 mb-4">
              <li><span className="font-medium">Higher volatility</span> = <span className="text-red-600">smaller positions</span> to reduce risk</li>
              <li><span className="font-medium">Lower volatility</span> = <span className="text-green-600">larger positions</span> to optimize returns</li>
              <li>Automatically calculates stop loss levels based on volatility</li>
              <li>Adapts to changing market conditions</li>
              <li>Maintains consistent risk exposure across different markets</li>
            </ul>
            
            <h3 className="font-semibold text-lg mb-2 mt-6">Benefits</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>More consistent returns over time</li>
              <li>Reduced impact of market volatility expansions</li>
              <li>Optimal capital allocation based on risk</li>
              <li>Protection against outsized losses during volatile periods</li>
            </ul>
          </div>
          
          {calculationHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Recent Calculations</h2>
              
              <div className="space-y-4">
                {calculationHistory.map((result, index) => (
                  <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Calculation {calculationHistory.length - index}</span>
                      <span className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="text-gray-600">Position Size:</div>
                      <div>${result.positionSize.toFixed(2)}</div>
                      
                      <div className="text-gray-600">Units:</div>
                      <div>{result.positionSizeUnits.toFixed(6)}</div>
                      
                      <div className="text-gray-600">Risk Amount:</div>
                      <div>${result.riskAmount.toFixed(2)}</div>
                      
                      {result.volatilityFactor !== 1.0 && (
                        <>
                          <div className="text-gray-600">Vol Factor:</div>
                          <div>{result.volatilityFactor.toFixed(2)}x</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Position Sizing Formulas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Fixed Percentage Risk</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-2">
              <p className="font-mono">
                Position Size = Risk Amount / Stop Loss Distance
              </p>
              <p className="font-mono mt-2">
                Risk Amount = Account Size × Risk Percentage
              </p>
            </div>
            <p className="text-sm text-gray-600">
              The standard position sizing formula that allocates a fixed percentage of your account to each trade.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Volatility Adjustment</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-2">
              <p className="font-mono">
                Volatility Factor = Base Volatility / Current Volatility
              </p>
              <p className="font-mono mt-2">
                Adjusted Position = Position Size × Volatility Factor
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Scales position size based on current market volatility relative to a baseline volatility level.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">ATR-Based Stop Loss</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-2">
              <p className="font-mono">
                ATR = Average True Range over N periods
              </p>
              <p className="font-mono mt-2">
                Stop Loss Distance = K × ATR (typically K = 2-3)
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Places stop loss based on volatility rather than fixed price, adapting to market conditions.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Kelly Criterion (Advanced)</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-2">
              <p className="font-mono">
                f* = (bp - q) / b
              </p>
              <p className="text-sm mt-1">
                where: f* = optimal fraction, b = odds, p = win rate, q = loss rate
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Optimal position sizing based on probability theory, accounting for win rate and reward-to-risk ratio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 