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

// [REMOVED] Chart.js-based AreaChart and legacy code. Use Recharts-based AreaChartComponent from ui/chart.tsx instead.
// No code here. All chart components are exported as named functions above.

// [REMOVED] Chart.js-based BarChart and legacy code. Use Recharts-based BarChartComponent from ui/chart.tsx instead.
// No code here. All chart components are exported as named functions above.

// [REMOVED] Chart.js-based PieChart and legacy code. Use Recharts-based PieChartComponent from ui/chart.tsx instead.
// No code here. All chart components are exported as named functions above.

// [REMOVED] Chart.js-based DoughnutChart and legacy code. Use Recharts-based PieChartComponent from ui/chart.tsx instead.
// No code here. All chart components are exported as named functions above.

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

// [REMOVED] Chart.js exports. Use Recharts-based chart components from ui/chart.tsx.
