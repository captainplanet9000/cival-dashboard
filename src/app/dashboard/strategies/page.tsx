import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StrategyList } from '@/components/strategy/StrategyList';
import { CreateStrategyDialog } from '@/components/strategy/CreateStrategyDialog';
import { StrategyMetrics } from '@/components/strategy/StrategyMetrics';
import { Loader2 } from 'lucide-react';

export default function StrategiesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Strategy Management</h1>
        <CreateStrategyDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">76.4%</div>
            <p className="text-xs text-muted-foreground">
              +5.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+24.8%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
              <StrategyMetrics />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategy List</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
            <StrategyList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
} 