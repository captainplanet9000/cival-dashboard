import React from 'react';

interface RiskAssessmentProps {
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  correlation: number;
  var95: number;
  var99: number;
  className?: string;
}

export const RiskAssessmentCard: React.FC<RiskAssessmentProps> = ({
  maxDrawdown,
  volatility,
  sharpeRatio,
  correlation,
  var95,
  var99,
  className = ''
}) => {
  // Function to determine risk level color
  const getRiskColor = (value: number, metric: 'drawdown' | 'volatility' | 'sharpe' | 'var' | 'correlation') => {
    switch (metric) {
      case 'drawdown':
        if (value <= 10) return 'bg-green-100 text-green-800';
        if (value <= 20) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
      
      case 'volatility':
        if (value <= 15) return 'bg-green-100 text-green-800';
        if (value <= 30) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
      
      case 'sharpe':
        if (value >= 1.5) return 'bg-green-100 text-green-800';
        if (value >= 0.8) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
      
      case 'var':
        if (value <= 2) return 'bg-green-100 text-green-800';
        if (value <= 5) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
        
      case 'correlation':
        if (value <= 0.3) return 'bg-green-100 text-green-800';
        if (value <= 0.7) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
        
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Function to get risk level text
  const getRiskLevel = (value: number, metric: 'drawdown' | 'volatility' | 'sharpe' | 'var' | 'correlation') => {
    switch (metric) {
      case 'drawdown':
        if (value <= 10) return 'Low';
        if (value <= 20) return 'Medium';
        return 'High';
      
      case 'volatility':
        if (value <= 15) return 'Low';
        if (value <= 30) return 'Medium';
        return 'High';
      
      case 'sharpe':
        if (value >= 1.5) return 'Good';
        if (value >= 0.8) return 'Acceptable';
        return 'Poor';
      
      case 'var':
        if (value <= 2) return 'Low';
        if (value <= 5) return 'Medium';
        return 'High';
        
      case 'correlation':
        if (value <= 0.3) return 'Low';
        if (value <= 0.7) return 'Medium';
        return 'High';
        
      default:
        return 'Unknown';
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Risk Assessment</h2>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Max Drawdown</span>
            <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(maxDrawdown, 'drawdown')}`}>
              {getRiskLevel(maxDrawdown, 'drawdown')} Risk
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${Math.min(100, maxDrawdown * 2)}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">
            {maxDrawdown.toFixed(2)}%
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Volatility</span>
            <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(volatility, 'volatility')}`}>
              {getRiskLevel(volatility, 'volatility')} Risk
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-purple-600 h-2.5 rounded-full" 
              style={{ width: `${Math.min(100, volatility * 2)}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">
            {volatility.toFixed(2)}%
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Sharpe Ratio</span>
            <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(sharpeRatio, 'sharpe')}`}>
              {getRiskLevel(sharpeRatio, 'sharpe')}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full" 
              style={{ width: `${Math.min(100, sharpeRatio * 30)}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">
            {sharpeRatio.toFixed(2)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="text-sm font-medium mb-1">Value at Risk (95%)</div>
            <div className={`px-2 py-1 rounded text-center ${getRiskColor(var95, 'var')}`}>
              {var95.toFixed(2)}%
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Value at Risk (99%)</div>
            <div className={`px-2 py-1 rounded text-center ${getRiskColor(var99, 'var')}`}>
              {var99.toFixed(2)}%
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Market Correlation</div>
            <div className={`px-2 py-1 rounded text-center ${getRiskColor(correlation, 'correlation')}`}>
              {correlation.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 