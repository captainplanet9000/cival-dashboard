'use client';

/**
 * Chart Components
 * Wrapper around Chart.js for various chart types
 */
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// Define chart prop types
type ChartProps = {
  data: ChartData<any, any, any>;
  options?: ChartOptions<any>;
};

// Line Chart Component
export function LineChart({ data, options = {} }: ChartProps) {
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.2,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };
  
  // Merge default options with user options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return <Line data={data} options={mergedOptions} />;
}

// Area Chart (Line with fill)
export function AreaChart({ data, options = {} }: ChartProps) {
  // Transform data to ensure fill is enabled for all datasets
  const areaData = {
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      fill: true,
    })),
  };
  
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };
  
  // Merge default options with user options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return <Line data={areaData} options={mergedOptions} />;
}

// Bar Chart Component
export function BarChart({ data, options = {} }: ChartProps) {
  const defaultOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  // Merge default options with user options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return <Bar data={data} options={mergedOptions} />;
}

// Pie Chart Component
export function PieChart({ data, options = {} }: ChartProps) {
  const defaultOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw;
            const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value as number / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };
  
  // Merge default options with user options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return <Pie data={data} options={mergedOptions} />;
}

// Doughnut Chart Component
export function DoughnutChart({ data, options = {} }: ChartProps) {
  const defaultOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw;
            const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value as number / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };
  
  // Merge default options with user options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return <Doughnut data={data} options={mergedOptions} />;
}

// Radar Chart Component
export function RadarChart({ data, options = {} }: ChartProps) {
  const defaultOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      r: {
        beginAtZero: true,
      },
    },
  };
  
  // Merge default options with user options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return <Radar data={data} options={mergedOptions} />;
}

// Export all chart types
export { Bar, Line, Pie, Doughnut, Radar };
