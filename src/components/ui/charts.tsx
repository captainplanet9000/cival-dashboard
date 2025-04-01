"use client";

import React from 'react';
import {
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Scatter,
  ScatterChart,
  Treemap,
  LabelList
} from 'recharts';

const COLORS = [
  '#0ea5e9', // sky blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#d946ef', // fuchsia
  '#14b8a6', // teal
  '#f97316', // orange
];

interface ChartProps {
  data: any[];
  className?: string;
  height?: number;
  colors?: string[];
  xAxisDataKey?: string;
}

export const ResponsiveContainer = RechartsResponsiveContainer;

export function BarChart({ 
  data, 
  className, 
  height = 300, 
  colors = COLORS, 
  xAxisDataKey = 'name' 
}: ChartProps) {
  return (
    <RechartsResponsiveContainer width="100%" height={height} className={className}>
      <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey={xAxisDataKey} 
          tick={{ fontSize: 12 }} 
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }} 
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={{ stroke: '#cbd5e1' }}
        />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '6px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0'
          }}
        />
        <Bar 
          dataKey="value" 
          fill={colors[0]}
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? colors[0] : colors[4]} />
          ))}
        </Bar>
      </RechartsBarChart>
    </RechartsResponsiveContainer>
  );
}

export function LineChart({ 
  data, 
  className, 
  height = 300, 
  colors = COLORS,
  xAxisDataKey = 'name'
}: ChartProps) {
  return (
    <RechartsResponsiveContainer width="100%" height={height} className={className}>
      <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey={xAxisDataKey}
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={{ stroke: '#cbd5e1' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0'
          }}
        />
        <Line 
          type="monotone"
          dataKey="value" 
          stroke={colors[0]} 
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2 }} 
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </RechartsResponsiveContainer>
  );
}

export function PieChart({ 
  data, 
  className, 
  height = 300, 
  colors = COLORS 
}: ChartProps) {
  return (
    <RechartsResponsiveContainer width="100%" height={height} className={className}>
      <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0'
          }}
          formatter={(value) => [`${value}`, 'Value']}
        />
      </RechartsPieChart>
    </RechartsResponsiveContainer>
  );
}

export function RadarChart({ 
  data, 
  className, 
  height = 300, 
  colors = COLORS 
}: ChartProps) {
  return (
    <RechartsResponsiveContainer width="100%" height={height} className={className}>
      <RechartsRadarChart outerRadius={90} width={500} height={height} data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fontSize: 10 }} />
        <Radar
          name="Current"
          dataKey="value"
          stroke={colors[0]}
          fill={colors[0]}
          fillOpacity={0.6}
        />
        <Radar
          name="Baseline"
          dataKey="baseline"
          stroke={colors[3]}
          fill={colors[3]}
          fillOpacity={0.4}
        />
        <Legend />
        <Tooltip
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0'
          }}
        />
      </RechartsRadarChart>
    </RechartsResponsiveContainer>
  );
}

export function ScatterPlot({ 
  data, 
  className, 
  height = 300, 
  colors = COLORS 
}: ChartProps) {
  return (
    <RechartsResponsiveContainer width="100%" height={height} className={className}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          type="number" 
          dataKey="x" 
          name="x" 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          name="y"
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          tickLine={{ stroke: '#cbd5e1' }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0'
          }}
        />
        <Scatter name="Values" data={data} fill={colors[0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={colors[entry.category % colors.length] || colors[0]} 
            />
          ))}
        </Scatter>
      </ScatterChart>
    </RechartsResponsiveContainer>
  );
}

interface HeatMapData {
  name: string;
  data: { x: string; y: string; value: number; }[];
}

export function HeatMap({ 
  data, 
  className, 
  height = 300,
  colors = ['#f1f5f9', '#38bdf8', '#0369a1']
}: { data: HeatMapData[], className?: string, height?: number, colors?: string[] }) {
  // Flatten the data for TreeMap which is better for heat map visualization in recharts
  const flattenedData = data.flatMap(group => 
    group.data.map(item => ({
      name: `${item.x}-${item.y}`,
      size: Math.abs(item.value),
      value: item.value,
      group: group.name
    }))
  );

  const minValue = Math.min(...flattenedData.map(d => d.value));
  const maxValue = Math.max(...flattenedData.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <RechartsResponsiveContainer width="100%" height={height} className={className}>
      <Treemap
        data={flattenedData}
        dataKey="size"
        aspectRatio={1}
        stroke="#e2e8f0"
        fill="#8884d8"
      >
        {flattenedData.map((entry, index) => {
          const normalizedValue = (entry.value - minValue) / range;
          const colorIndex = Math.min(
            Math.floor(normalizedValue * (colors.length - 1)),
            colors.length - 1
          );
          
          return (
            <Cell 
              key={`cell-${index}`} 
              fill={colors[colorIndex]}
              stroke="#e2e8f0"
            >
              <LabelList 
                dataKey="name" 
                position="center"
                style={{ 
                  fontSize: '10px', 
                  fill: normalizedValue > 0.7 ? 'white' : 'black',
                  textAnchor: 'middle'
                }} 
              />
            </Cell>
          );
        })}
      </Treemap>
    </RechartsResponsiveContainer>
  );
}

// Re-export components with consistent styling
export const BarChart = RechartsBarChart;
export const LineChart = RechartsLineChart;
export const PieChart = RechartsPieChart;
export const RadarChart = RechartsRadarChart;
export const ResponsiveContainer = RechartsResponsiveContainer;
export const CartesianGrid = CartesianGrid;
export const XAxis = XAxis;
export const YAxis = YAxis;
export const Tooltip = Tooltip;
export const Legend = Legend;
export const PolarGrid = PolarGrid;
export const PolarAngleAxis = PolarAngleAxis;
export const PolarRadiusAxis = PolarRadiusAxis;
export const Radar = Radar;
export const Line = Line;

// Add any custom styling or configuration here
// ... existing code ... 