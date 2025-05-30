"use client";

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  PortfolioAllocation,
  RebalancingFrequency 
} from '@/types/portfolio';
import { useTheme } from 'next-themes';
import { 
  RefreshCw, 
  PieChart, 
  AlertTriangle, 
  Sliders,
  Check
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PortfolioAllocationTableProps {
  allocations: PortfolioAllocation[];
  targetAllocations: PortfolioAllocation[];
  rebalancingFrequency: RebalancingFrequency;
  driftThreshold?: number;
  lastRebalanced?: string;
  onRebalance?: () => void;
  isRebalancing?: boolean;
}

export function PortfolioAllocationTable({
  allocations,
  targetAllocations,
  rebalancingFrequency,
  driftThreshold = 5,
  lastRebalanced,
  onRebalance,
  isRebalancing = false
}: PortfolioAllocationTableProps) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [showDifferences, setShowDifferences] = React.useState(true);

  // Calculate if rebalance is needed
  const needsRebalance = allocations.some(currentAlloc => {
    const target = targetAllocations.find(t => t.strategy_id === currentAlloc.strategy_id);
    if (!target) return false;
    
    return Math.abs(currentAlloc.allocation_percentage - target.allocation_percentage) > driftThreshold;
  });

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return value.toFixed(2) + '%';
  };
  
  // Format dollar amount for display
  const formatDollar = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Handle rebalance click
  const handleRebalance = () => {
    if (onRebalance) {
      onRebalance();
    } else {
      toast({
        title: "Rebalance Triggered",
        description: "Portfolio rebalancing has been scheduled.",
      });
    }
  };

  // Get color class based on drift
  const getDriftColorClass = (drift: number) => {
    const absDrift = Math.abs(drift);
    if (absDrift < 1) return 'text-green-500';
    if (absDrift < driftThreshold / 2) return 'text-yellow-500';
    if (absDrift < driftThreshold) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get color for progress bar
  const getProgressColor = (current: number, target: number) => {
    const drift = Math.abs(current - target);
    if (drift < 1) return 'bg-green-500';
    if (drift < driftThreshold / 2) return 'bg-green-500';
    if (drift < driftThreshold) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Portfolio Allocations
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <span>Last rebalanced:</span>
            <span className="font-medium">{formatDate(lastRebalanced)}</span>
          </div>
          <Button
            variant={needsRebalance ? "default" : "outline"}
            size="sm"
            onClick={handleRebalance}
            disabled={isRebalancing || !needsRebalance}
          >
            {isRebalancing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Rebalancing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rebalance
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {needsRebalance && (
          <div className="px-6 py-2">
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Rebalance Recommended</AlertTitle>
              <AlertDescription>
                One or more of your strategy allocations has drifted beyond the {driftThreshold}% threshold. 
                Rebalancing is recommended to maintain your target allocation.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="px-6 py-2 flex justify-between items-center border-b">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {rebalancingFrequency === RebalancingFrequency.MANUAL 
                ? 'Manual Rebalancing' 
                : rebalancingFrequency === RebalancingFrequency.THRESHOLD
                  ? `Threshold-based (${driftThreshold}%)`
                  : `${rebalancingFrequency.charAt(0) + rebalancingFrequency.slice(1).toLowerCase()} Rebalancing`
              }
            </Badge>
            <div className="text-xs text-muted-foreground">
              {allocations.length} strategies
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 gap-1 text-xs"
            onClick={() => setShowDifferences(!showDifferences)}
          >
            <Sliders className="h-3 w-3" />
            {showDifferences ? 'Hide Drift' : 'Show Drift'}
          </Button>
        </div>

        <Table>
          <TableCaption>
            Current portfolio allocations and target percentages
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Strategy</TableHead>
              <TableHead>Current Allocation</TableHead>
              {showDifferences && <TableHead>Target</TableHead>}
              {showDifferences && <TableHead>Drift</TableHead>}
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => {
              const targetAllocation = targetAllocations.find(t => t.strategy_id === allocation.strategy_id);
              const target = targetAllocation?.allocation_percentage || 0;
              const current = allocation.allocation_percentage;
              const drift = current - target;
              const absDrift = Math.abs(drift);
              const inRange = absDrift <= driftThreshold;
              
              return (
                <TableRow key={allocation.strategy_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {inRange && (
                        <div className="text-green-500">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      {!inRange && (
                        <div className="text-red-500">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                      <div>{allocation.strategy_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span>{formatPercentage(current)}</span>
                      </div>
                      <Progress
                        value={current}
                        max={100}
                        className="h-2"
                        indicatorClassName={getProgressColor(current, target)}
                      />
                    </div>
                  </TableCell>
                  {showDifferences && (
                    <TableCell>{formatPercentage(target)}</TableCell>
                  )}
                  {showDifferences && (
                    <TableCell className={getDriftColorClass(drift)}>
                      {drift > 0 ? '+' : ''}{formatPercentage(drift)}
                    </TableCell>
                  )}
                  <TableCell className="text-right">{formatDollar(allocation.current_value || 0)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
