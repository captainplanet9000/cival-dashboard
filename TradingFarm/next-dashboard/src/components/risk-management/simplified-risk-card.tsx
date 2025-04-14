'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, InfoIcon } from 'lucide-react';

// Simple metric interface that matches the data structure from our query hook
export interface SimpleMetric {
  name: string;
  value: string;
  status: 'normal' | 'warning' | 'danger';
}

export interface SimplifiedRiskCardProps {
  title: string;
  metrics: SimpleMetric[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function SimplifiedRiskCard({ 
  title,
  metrics,
  isLoading = false,
  onRefresh
}: SimplifiedRiskCardProps) {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>
            Loading...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-56">
          <div className="animate-pulse bg-muted h-40 w-full rounded-md"></div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          Distribution of risk exposure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {metric.status === 'danger' && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                {metric.status === 'warning' && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                {metric.status === 'normal' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span>{metric.name}</span>
              </div>
              <Badge 
                variant={
                  metric.status === 'danger' ? 'destructive' : 
                  metric.status === 'warning' ? 'outline' : 'outline'
                }
                className={
                  metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-500 dark:border-yellow-800' : ''
                }
              >
                {metric.value}
              </Badge>
            </div>
          ))}
          
          {metrics.length === 0 && (
            <div className="text-center p-4">
              <InfoIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No metrics available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
