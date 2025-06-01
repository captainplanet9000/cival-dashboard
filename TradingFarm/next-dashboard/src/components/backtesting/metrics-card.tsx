'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Metric {
  label: string;
  value: string | number;
}

interface MetricsCardProps {
  title: string;
  metrics: Metric[];
}

export function MetricsCard({ title, metrics }: MetricsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div className="text-sm font-medium">{metric.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
