'use client';

/**
 * Wallet Balance Chart Component
 * Displays wallet balance history over time
 */
import React, { useState } from 'react';
import { LineChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { format, subDays, subMonths } from 'date-fns';

interface WalletBalanceChartProps {
  data: {
    date: string;
    balance: number;
  }[];
  currency: string;
  minimal?: boolean;
}

export function WalletBalanceChart({ data, currency, minimal = false }: WalletBalanceChartProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  // Format currency for tooltips
  const formatCurrency = (amount: number) => {
    if (currency === 'BTC') {
      return `₿${amount.toFixed(8)}`;
    } else if (currency === 'ETH') {
      return `Ξ${amount.toFixed(6)}`;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  };
  
  // Filter data based on time range
  const getFilteredData = () => {
    if (timeRange === 'all' || minimal) {
      return data;
    }
    
    const now = new Date();
    let cutoffDate;
    
    switch (timeRange) {
      case '7d':
        cutoffDate = subDays(now, 7);
        break;
      case '30d':
        cutoffDate = subDays(now, 30);
        break;
      case '90d':
        cutoffDate = subDays(now, 90);
        break;
      default:
        cutoffDate = subDays(now, 30);
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  };
  
  // Prepare chart data
  const chartData = {
    labels: getFilteredData().map(item => format(new Date(item.date), 'MMM dd')),
    datasets: [
      {
        label: `Balance (${currency})`,
        data: getFilteredData().map(item => item.balance),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.3,
        fill: true,
      }
    ]
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: !minimal,
        },
        ticks: {
          display: !minimal,
          autoSkip: true,
          maxTicksLimit: minimal ? 0 : 10,
        }
      },
      y: {
        grid: {
          display: !minimal,
        },
        ticks: {
          display: !minimal,
          callback: function(value: number) {
            // More readable y-axis labels for currency
            if (currency === 'BTC' || currency === 'ETH') {
              return value.toFixed(4);
            }
            return value;
          }
        },
        beginAtZero: false,
      }
    },
    plugins: {
      legend: {
        display: !minimal,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += formatCurrency(context.raw);
            return label;
          },
          title: function(tooltipItems: any[]) {
            return format(new Date(data[tooltipItems[0].dataIndex].date), 'PPP');
          }
        }
      }
    },
    elements: {
      point: {
        radius: minimal ? 0 : 3,
        hoverRadius: minimal ? 3 : 5,
      }
    }
  };

  return (
    <div>
      {!minimal && (
        <div className="flex justify-end mb-4">
          <div className="flex gap-1">
            <Button 
              variant={timeRange === '7d' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7D
            </Button>
            <Button 
              variant={timeRange === '30d' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30D
            </Button>
            <Button 
              variant={timeRange === '90d' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90D
            </Button>
            <Button 
              variant={timeRange === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('all')}
            >
              All
            </Button>
          </div>
        </div>
      )}
      
      <div className="w-full h-full">
        <LineChart data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
