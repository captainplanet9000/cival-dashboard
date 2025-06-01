'use client';

import * as React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface BarChartProps {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  height?: number;
  width?: number;
  className?: string;
}

export function BarChart({
  data,
  options,
  height = 300,
  width,
  className = ''
}: BarChartProps) {
  const defaultOptions: ChartOptions<'bar'> = {
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
        },
        beginAtZero: true
      }
    }
  };

  // Merge custom options with default options
  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <div className={`w-full h-full ${className}`} style={{ height: height, width: width }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
}
