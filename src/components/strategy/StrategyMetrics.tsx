import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Strategy } from '@/lib/api/strategies';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

function MetricCard({
  title,
  value,
  description,
  trend,
  isLoading = false,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {trend && (
          <Badge
            variant={trend.isPositive ? 'default' : 'destructive'}
            className="text-xs"
          >
            {trend.isPositive ? '+' : '-'}
            {Math.abs(trend.value)}%
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-[100px]" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function StrategyMetrics() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeStrategies: 0,
    successRate: 0,
    totalReturns: 0,
    avgDrawdown: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API delay
        setMetrics({
          activeStrategies: 12,
          successRate: 68.5,
          totalReturns: 24.7,
          avgDrawdown: 8.3,
        });
      } catch (error) {
        console.error('Error fetching strategy metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Active Strategies"
        value={metrics.activeStrategies}
        description="Total strategies currently running"
        trend={{ value: 12, isPositive: true }}
        isLoading={isLoading}
      />
      <MetricCard
        title="Success Rate"
        value={`${metrics.successRate}%`}
        description="Average win rate across all strategies"
        trend={{ value: 4.5, isPositive: true }}
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Returns"
        value={`${metrics.totalReturns}%`}
        description="Cumulative returns in the last 30 days"
        trend={{ value: 2.3, isPositive: true }}
        isLoading={isLoading}
      />
      <MetricCard
        title="Average Drawdown"
        value={`${metrics.avgDrawdown}%`}
        description="Mean maximum drawdown per strategy"
        trend={{ value: 1.8, isPositive: false }}
        isLoading={isLoading}
      />
    </div>
  );
} 