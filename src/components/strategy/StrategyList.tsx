import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StrategyDetails } from './StrategyDetails';
import { Strategy } from '@/lib/api/strategies';
import { formatPercent, formatDate } from '@/lib/utils';

export function StrategyList() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const getStatusColor = (status: Strategy['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'testing':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskColor = (level: Strategy['riskLevel']) => {
    switch (level) {
      case 'Low':
        return 'bg-green-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'High':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Mock data - will be replaced with API call
  const mockStrategies: Strategy[] = [
    {
      id: '1',
      name: 'Moving Average Crossover',
      type: 'Trend Following',
      description: 'Classic moving average crossover strategy',
      status: 'active',
      performance: 15.4,
      riskLevel: 'Medium',
      parameters: {
        shortPeriod: 10,
        longPeriod: 50,
      },
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: '2024-03-15T00:00:00Z',
      lastTested: '2024-03-14T00:00:00Z',
      successRate: 68.5,
      tradingPairs: ['BTC/USD', 'ETH/USD'],
    },
    {
      id: '2',
      name: 'RSI Mean Reversion',
      type: 'Mean Reversion',
      description: 'RSI-based mean reversion strategy',
      status: 'testing',
      performance: 8.2,
      riskLevel: 'High',
      parameters: {
        rsiPeriod: 14,
        overbought: 70,
        oversold: 30,
      },
      createdAt: '2024-02-15T00:00:00Z',
      updatedAt: '2024-03-15T00:00:00Z',
      lastTested: '2024-03-15T00:00:00Z',
      successRate: 72.1,
      tradingPairs: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
    },
  ];

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risk Level</TableHead>
            <TableHead>Performance</TableHead>
            <TableHead>Success Rate</TableHead>
            <TableHead>Last Tested</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockStrategies.map((strategy) => (
            <TableRow key={strategy.id}>
              <TableCell className="font-medium">{strategy.name}</TableCell>
              <TableCell>{strategy.type}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(strategy.status)}>
                  {strategy.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getRiskColor(strategy.riskLevel)}>
                  {strategy.riskLevel}
                </Badge>
              </TableCell>
              <TableCell>{formatPercent(strategy.performance)}</TableCell>
              <TableCell>{formatPercent(strategy.successRate)}</TableCell>
              <TableCell>{formatDate(strategy.lastTested)}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStrategy(strategy)}
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedStrategy && (
        <StrategyDetails
          strategy={selectedStrategy}
          open={!!selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
        />
      )}
    </div>
  );
} 