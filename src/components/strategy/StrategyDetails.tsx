import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Strategy } from '@/lib/api/strategies';
import { StrategyPerformanceChart } from './StrategyPerformanceChart';

interface StrategyDetailsProps {
  strategy: Strategy;
  onClose: () => void;
}

export function StrategyDetails({ strategy, onClose }: StrategyDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'testing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl">{strategy.name}</CardTitle>
          <CardDescription>{strategy.description}</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={getStatusColor(strategy.status)}>
            {strategy.status}
          </Badge>
          <Badge className={getRiskColor(strategy.riskLevel)}>
            {strategy.riskLevel} Risk
          </Badge>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Strategy Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{strategy.type}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Trading Pairs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {strategy.tradingPairs.map((pair) => (
                      <Badge key={pair} variant="secondary">
                        {pair}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span>{strategy.performance.successRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Returns:</span>
                      <span>{strategy.performance.totalReturns}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sharpe Ratio:</span>
                      <span>{strategy.performance.sharpeRatio}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Max Drawdown:</span>
                      <span>{strategy.performance.maxDrawdown}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volatility:</span>
                      <span>{strategy.performance.volatility}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Win/Loss Ratio:</span>
                      <span>{strategy.performance.winLossRatio}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance History</CardTitle>
                <CardDescription>
                  Historical performance and key metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <StrategyPerformanceChart strategy={strategy} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Settings</CardTitle>
                <CardDescription>
                  Configure parameters and risk settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(strategy.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="font-medium">{key}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Strategy History</CardTitle>
                <CardDescription>
                  Recent updates and modifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategy.history?.map((event) => (
                    <div
                      key={event.id}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{event.type}</p>
                        <p className="text-sm text-gray-500">{event.description}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 