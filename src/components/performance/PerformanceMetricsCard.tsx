import React from 'react';

interface PerformanceMetric {
  label: string;
  value: string | number;
  change?: number;
  isPercentage?: boolean;
  isCurrency?: boolean;
}

interface PerformanceMetricsCardProps {
  title: string;
  metrics: PerformanceMetric[];
  className?: string;
}

export const PerformanceMetricsCard: React.FC<PerformanceMetricsCardProps> = ({
  title,
  metrics,
  className = '',
}) => {
  const formatValue = (metric: PerformanceMetric) => {
    if (metric.isCurrency) {
      return `$${Number(metric.value).toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    if (metric.isPercentage) {
      return `${metric.value}%`;
    }
    
    return metric.value;
  };
  
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
            <div className="text-sm text-gray-500 mb-1">{metric.label}</div>
            <div className="flex items-baseline">
              <div className="text-lg font-semibold">{formatValue(metric)}</div>
              {metric.change !== undefined && (
                <div 
                  className={`ml-2 text-xs ${
                    metric.change > 0 
                      ? 'text-green-600' 
                      : metric.change < 0 
                        ? 'text-red-600' 
                        : 'text-gray-500'
                  }`}
                >
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 