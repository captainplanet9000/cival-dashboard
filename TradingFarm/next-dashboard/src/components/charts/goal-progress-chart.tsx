'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

// Define the data structure for goal progress
interface GoalProgressProps {
  goal: {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    status: string;
    target_date?: string | null;
    created_at: string;
  };
  showTargetDate?: boolean;
  className?: string;
}

// Colors for different chart elements
const COLORS = {
  completed: '#10b981', // Green
  remaining: '#d1d5db', // Light gray
  progress: '#3b82f6', // Blue
  overdue: '#ef4444', // Red
  warning: '#f59e0b', // Amber
};

/**
 * Goal progress chart component using Recharts
 */
export function GoalProgressChart({
  goal,
  showTargetDate = true,
  className = '',
}: GoalProgressProps) {
  // Calculate progress metrics
  const progressPercent = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
  const remainingAmount = Math.max(0, goal.target_amount - goal.current_amount);
  
  // Data for the pie chart
  const pieData = [
    { name: 'Completed', value: goal.current_amount },
    { name: 'Remaining', value: remainingAmount },
  ];
  
  // Data for the radial bar chart
  const radialData = [
    {
      name: 'Progress',
      value: progressPercent,
      fill: progressPercent >= 100 ? COLORS.completed : (progressPercent >= 75 ? COLORS.progress : COLORS.warning),
    },
  ];
  
  // Target date information
  const hasTargetDate = Boolean(goal.target_date);
  const targetDate = goal.target_date ? new Date(goal.target_date) : null;
  const isOverdue = targetDate && targetDate < new Date();
  const timeRemaining = targetDate
    ? formatDistanceToNow(targetDate, { addSuffix: true })
    : 'No deadline';
  
  // Data for the comparative bar chart
  const barData = [
    {
      name: goal.name,
      current: goal.current_amount,
      target: goal.target_amount,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{goal.name}</CardTitle>
            <CardDescription>
              Target: {goal.target_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </CardDescription>
          </div>
          
          <Badge
            className={`${
              goal.status === 'COMPLETED'
                ? 'bg-green-500'
                : goal.status === 'ACTIVE'
                ? 'bg-blue-500'
                : goal.status === 'PAUSED'
                ? 'bg-amber-500'
                : goal.status === 'FAILED'
                ? 'bg-red-500'
                : 'bg-gray-500'
            }`}
          >
            {goal.status}
          </Badge>
        </div>
        
        {showTargetDate && hasTargetDate && (
          <div className={`text-sm mt-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
            {isOverdue ? 'Overdue' : 'Due'}: {timeRemaining}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="radial" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="radial">Progress</TabsTrigger>
            <TabsTrigger value="pie">Distribution</TabsTrigger>
            <TabsTrigger value="bar">Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="radial" className="mt-0">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  barSize={15}
                  data={radialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={30}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xl font-semibold"
                    fill="currentColor"
                  >
                    {Math.round(progressPercent)}%
                  </text>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Progress']}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 text-center space-y-1">
              <div className="text-sm text-muted-foreground">
                Current: {goal.current_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
              <div className="text-sm text-muted-foreground">
                Remaining: {remainingAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="pie" className="mt-0">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill={COLORS.progress} />
                    <Cell fill={COLORS.remaining} />
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bar" className="mt-0">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" scale="band" />
                  <Tooltip
                    formatter={(value) => [value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), '']}
                  />
                  <Legend />
                  <Bar
                    dataKey="current"
                    name="Current Amount"
                    fill={COLORS.progress}
                    barSize={20}
                  />
                  <Bar
                    dataKey="target"
                    name="Target Amount"
                    fill={COLORS.remaining}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
