'use client';

import * as React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

export interface PieChartProps {
  data: ChartData<'pie'>;
  options?: ChartOptions<'pie'>;
  height?: number;
  width?: number;
  className?: string;
}

export function PieChart({ 
  data, 
  options, 
  height = 300, 
  width, 
  className = ''
}: PieChartProps) {
  const defaultOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
          padding: 20,
          color: 'rgba(var(--foreground-rgb))'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(var(--card-rgb), 0.9)',
        titleColor: 'rgba(var(--foreground-rgb))',
        bodyColor: 'rgba(var(--foreground-rgb), 0.8)',
        borderColor: 'rgba(var(--border-rgb))',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.formattedValue;
            const dataset = context.dataset;
            const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
            const percentage = Math.round((context.raw as number / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Merge custom options with default options
  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <div className={`w-full h-full ${className}`} style={{ height: height, width: width }}>
      <Pie data={data} options={mergedOptions} />
    </div>
  );
}
