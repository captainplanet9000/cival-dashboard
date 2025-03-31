'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from 'lucide-react';

interface Metric {
  name: string;
  value: string;
  status: 'good' | 'normal' | 'warning' | 'danger';
  info?: string;
}

interface RiskMetricsCardProps {
  title: string;
  metrics: Metric[];
  description?: string;
}

export default function RiskMetricsCard({ 
  title, 
  metrics,
  description 
}: RiskMetricsCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-500';
      case 'normal':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'good':
        return 'Good - Within optimal range';
      case 'normal':
        return 'Normal - Within acceptable parameters';
      case 'warning':
        return 'Warning - Approaching risk thresholds';
      case 'danger':
        return 'Danger - Exceeds safe parameters';
      default:
        return 'Unknown status';
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <div key={`${metric.name}-${index}`} className="flex flex-col space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">{metric.name}</span>
                {(metric.status === 'warning' || metric.status === 'danger') && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{metric.info || getStatusDescription(metric.status)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`}></div>
                <span className="font-medium">{metric.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
