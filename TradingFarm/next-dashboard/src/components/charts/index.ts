import React from 'react';

// Mock chart components
export const BarChart = ({ data, options }: { data: any; options?: any }) => {
  return React.createElement('div', { className: 'mock-bar-chart' }, 'Mock Bar Chart');
};

export const AreaChart = ({ data, options }: { data: any; options?: any }) => {
  return React.createElement('div', { className: 'mock-area-chart' }, 'Mock Area Chart');
};

export const PieChart = ({ data, options }: { data: any; options?: any }) => {
  return React.createElement('div', { className: 'mock-pie-chart' }, 'Mock Pie Chart');
};

export const LineChart = ({ data, options }: { data: any; options?: any }) => {
  return React.createElement('div', { className: 'mock-line-chart' }, 'Mock Line Chart');
};

// Export BarChart2 to fix errors related to BarChart2
export const BarChart2 = BarChart;

// Export ScatterChart component
export const ScatterChart = ({ data, options }: { data: any; options?: any }) => {
  return React.createElement('div', { className: 'mock-scatter-chart' }, 'Mock Scatter Chart');
};

// Export axis and tooltip components
export const AxisLeft = () => null;
export const AxisBottom = () => null;
export const Tooltip = () => null;

// Export utility functions
export const getChartTheme = () => ({});
export const generateChartData = () => ({});
export const formatTooltipValue = () => '';
export const ChartWrapper = ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children);

// Export default object for imports in the format: import Charts from '@/components/charts'
export default {
  BarChart,
  AreaChart,
  PieChart,
  LineChart,
  BarChart2
};
