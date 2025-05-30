'use client';

import * as React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface LineChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  height?: number;
  width?: number;
  className?: string;
}

export function LineChart({
  data,
  options,
  height = 300,
  width,
  className = '',
}: LineChartProps) {
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
          color: 'rgba(var(--foreground-rgb))'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(var(--card-rgb), 0.9)',
        titleColor: 'rgba(var(--foreground-rgb))',
        bodyColor: 'rgba(var(--foreground-rgb), 0.8)',
        borderColor: 'rgba(var(--border-rgb))',
        borderWidth: 1,
      }
    },
    hover: {
      mode: 'nearest',
      intersect: true
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(var(--foreground-rgb), 0.7)'
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          color: 'rgba(var(--foreground-rgb), 0.7)'
        },
        grid: {
          color: 'rgba(var(--foreground-rgb), 0.1)'
        }
      }
    }
  };

  // Merge custom options with default options
  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <div className={`w-full h-full ${className}`} style={{ height: height, width: width }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
}
