import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ArrowUpRight, AlertTriangle, AlertCircle } from "lucide-react";
import { SystemResource } from './types';

interface ResourceMonitorProps {
  resource: SystemResource;
  showChart?: boolean;
}

const ResourceMonitor: React.FC<ResourceMonitorProps> = ({ 
  resource,
  showChart = true
}) => {
  const percentage = (resource.current / resource.max) * 100;
  
  // Format the percentage with at most 1 decimal place
  const formattedPercentage = Math.round(percentage * 10) / 10;
  
  // Determine color based on status
  const getColorByStatus = () => {
    switch (resource.status) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'normal':
      default:
        return 'text-green-500';
    }
  };
  
  // Get status icon
  const getStatusIcon = () => {
    switch (resource.status) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'normal':
      default:
        return <ArrowUpRight className="h-5 w-5 text-green-500" />;
    }
  };
  
  // Get progress color
  const getProgressColor = () => {
    switch (resource.status) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'normal':
      default:
        return 'bg-green-500';
    }
  };
  
  // Format time for chart
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {resource.name}
          </CardTitle>
          {getStatusIcon()}
        </div>
        <CardDescription>
          Current: {resource.current} {resource.unit} of {resource.max} {resource.unit}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">
            {formattedPercentage}%
          </div>
          <div className={`text-xs ${getColorByStatus()}`}>
            {resource.status.toUpperCase()}
          </div>
        </div>
        
        <Progress
          value={percentage}
          className="h-2"
          indicatorClassName={getProgressColor()}
        />
        
        {showChart && resource.history.length > 0 && (
          <div className="h-28 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resource.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  domain={[0, resource.max]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={25}
                />
                <Tooltip 
                  formatter={(value) => [`${value} ${resource.unit}`, resource.name]}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResourceMonitor;
