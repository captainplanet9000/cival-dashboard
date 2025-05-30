"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Portfolio,
  PortfolioAllocation,
  RebalancingTransaction
} from '@/types/portfolio';

// Local enum for component state management
enum RebalancingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
import { 
  RefreshCw,
  ArrowRightLeft,
  AlertTriangle,
  Check,
  Clock,
  Info,
  Wallet
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PortfolioRebalanceProps {
  portfolio: Portfolio;
  currentAllocations: PortfolioAllocation[];
  targetAllocations: PortfolioAllocation[];
  onRebalanceComplete?: (transactions: RebalancingTransaction[]) => void;
}

export function PortfolioRebalance({
  portfolio,
  currentAllocations,
  targetAllocations,
  onRebalanceComplete
}: PortfolioRebalanceProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isRebalancing, setIsRebalancing] = React.useState(false);
  const [rebalanceStatus, setRebalanceStatus] = React.useState<RebalancingStatus>(RebalancingStatus.PENDING);
  const [rebalanceTransactions, setRebalanceTransactions] = React.useState<RebalancingTransaction[]>([]);
  const [showPreview, setShowPreview] = React.useState(false);

  // Calculate rebalance required amounts
  const calculateRebalanceAmounts = (): RebalancingTransaction[] => {
    const portfolioValue = portfolio.current_value || portfolio.initial_capital;
    const transactions: RebalancingTransaction[] = [];
    
    // For each strategy, calculate the difference between current and target
    targetAllocations.forEach(target => {
      const current = currentAllocations.find(c => c.strategy_id === target.strategy_id);
      
      if (current) {
        const targetAmount = (portfolioValue * target.allocation_percentage) / 100;
        const currentAmount = current.current_value || (portfolioValue * current.allocation_percentage) / 100;
        const amountDifference = targetAmount - currentAmount;
        
        // Only create transactions for significant differences (e.g., > $10)
        if (Math.abs(amountDifference) > 10) {
          transactions.push({
            id: `${Date.now()}-${target.strategy_id}`,
            portfolio_id: portfolio.id || '',
            strategy_id: target.strategy_id,
            strategy_name: target.strategy_name,
            date: new Date().toISOString(),
            action: amountDifference > 0 ? 'buy' : 'sell',
            amount: Math.abs(amountDifference),
            previous_allocation: current.allocation_percentage,
            new_allocation: target.allocation_percentage,
            reason: 'manual',
            executed_by: 'user', // In a real app, use the authenticated user ID
            status: RebalancingStatus.PENDING
          });
        }
      } else {
        // This is a new allocation
        const targetAmount = (portfolioValue * target.allocation_percentage) / 100;
        
        transactions.push({
          id: `${Date.now()}-${target.strategy_id}`,
          portfolio_id: portfolio.id || '',
          strategy_id: target.strategy_id,
          strategy_name: target.strategy_name,
          date: new Date().toISOString(),
          action: 'buy',
          amount: targetAmount,
          previous_allocation: 0,
          new_allocation: target.allocation_percentage,
          reason: 'manual',
          executed_by: 'user', // In a real app, use the authenticated user ID
          status: 'pending' as 'pending' | 'completed' | 'failed'
        });
      }
    });
    
    // Check for strategies that were removed
    currentAllocations.forEach(current => {
      const target = targetAllocations.find(t => t.strategy_id === current.strategy_id);
      
      if (!target) {
        // This allocation was removed
        const currentAmount = current.current_value || (portfolioValue * current.allocation_percentage) / 100;
        
        transactions.push({
          id: `${Date.now()}-${current.strategy_id}-remove`,
          portfolio_id: portfolio.id || '',
          strategy_id: current.strategy_id,
          strategy_name: current.strategy_name,
          date: new Date().toISOString(),
          action: 'sell',
          amount: currentAmount,
          previous_allocation: current.allocation_percentage,
          new_allocation: 0,
          reason: 'manual',
          executed_by: 'user', // In a real app, use the authenticated user ID
          status: 'pending' as 'pending' | 'completed' | 'failed'
        });
      }
    });
    
    return transactions;
  };

  // Preview rebalance
  const previewRebalance = () => {
    const transactions = calculateRebalanceAmounts();
    setRebalanceTransactions(transactions);
    setShowPreview(true);
  };

  // Execute rebalance
  const executeRebalance = async () => {
    try {
      setIsRebalancing(true);
      setRebalanceStatus(RebalancingStatus.IN_PROGRESS);
      
      // If no preview was shown, calculate the transactions now
      if (!showPreview || rebalanceTransactions.length === 0) {
        setRebalanceTransactions(calculateRebalanceAmounts());
      }
      
      // In a real implementation, you would persist these transactions to your database
      // and execute the actual trading operations
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update transaction status
      const updatedTransactions = rebalanceTransactions.map((t: RebalancingTransaction) => ({
        ...t,
        status: 'completed' as 'pending' | 'completed' | 'failed',
        updated_at: new Date().toISOString()
      }));
      
      setRebalanceTransactions(updatedTransactions);
      setRebalanceStatus(RebalancingStatus.COMPLETED);
      
      // Notify parent component
      if (onRebalanceComplete) {
        onRebalanceComplete(updatedTransactions);
      }
      
      toast({
        title: "Rebalance Completed",
        description: `Successfully rebalanced ${updatedTransactions.length} strategy allocations.`,
      });
    } catch (error) {
      console.error("Rebalance error:", error);
      setRebalanceStatus(RebalancingStatus.FAILED);
      
      toast({
        variant: "destructive",
        title: "Rebalance Failed",
        description: "Failed to rebalance portfolio. Please try again.",
      });
    } finally {
      setIsRebalancing(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Determine if rebalance is needed
  const needsRebalance = targetAllocations.some(target => {
    const current = currentAllocations.find(c => c.strategy_id === target.strategy_id);
    if (!current) return true; // New allocation
    
    const drift = Math.abs(current.allocation_percentage - target.allocation_percentage);
    return drift > (portfolio.drift_threshold || 5);
  });

  // Calculate total rebalance amount (absolute sum of all transactions)
  const totalRebalanceAmount = rebalanceTransactions.reduce((sum: number, t: RebalancingTransaction) => sum + Math.abs(t.amount), 0);
  
  // Calculate total portfolio turnover (as percentage of portfolio value)
  const portfolioTurnover = (totalRebalanceAmount / (portfolio.current_value || portfolio.initial_capital)) * 100;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Portfolio Rebalancing
        </CardTitle>
        <CardDescription>
          Adjust your portfolio to match target allocations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rebalanceStatus === RebalancingStatus.COMPLETED ? (
          <Alert className="mb-4">
            <Check className="h-4 w-4" />
            <AlertTitle>Rebalance Complete</AlertTitle>
            <AlertDescription>
              Your portfolio has been successfully rebalanced. {rebalanceTransactions.length} transactions were executed.
            </AlertDescription>
          </Alert>
        ) : needsRebalance ? (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rebalance Recommended</AlertTitle>
            <AlertDescription>
              Your current allocations have drifted from your target allocations. Rebalancing is recommended to maintain your strategy.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Portfolio In Balance</AlertTitle>
            <AlertDescription>
              Your portfolio allocations are currently within the target drift threshold of {portfolio.drift_threshold || 5}%.
            </AlertDescription>
          </Alert>
        )}

        {showPreview && rebalanceTransactions.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Rebalance</div>
                <div className="text-2xl font-bold">{formatCurrency(totalRebalanceAmount)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Portfolio Turnover</div>
                <div className="text-2xl font-bold">{formatPercentage(portfolioTurnover)}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Affected Strategies</div>
                <div className="text-2xl font-bold">{rebalanceTransactions.length}</div>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="transactions">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <span>Rebalance Transactions</span>
                    <Badge variant="outline" className="ml-2">{rebalanceTransactions.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableCaption>Transactions to be executed during rebalancing</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rebalanceTransactions.map((transaction: RebalancingTransaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.strategy_name}</TableCell>
                          <TableCell>{formatPercentage(transaction.previous_allocation)}</TableCell>
                          <TableCell>{formatPercentage(transaction.new_allocation)}</TableCell>
                          <TableCell className="text-right">
                            <span className={transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}>
                              {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="mr-2 h-4 w-4" />
          <span>
            {rebalanceStatus === RebalancingStatus.COMPLETED
              ? `Last rebalanced: ${new Date().toLocaleString()}`
              : 'Rebalance your portfolio to match target allocations'}
          </span>
        </div>
        <div className="flex gap-2">
          {!showPreview ? (
            <Button variant="outline" onClick={previewRebalance}>
              Preview Rebalance
            </Button>
          ) : rebalanceStatus !== RebalancingStatus.COMPLETED ? (
            <Button onClick={executeRebalance} disabled={isRebalancing}>
              {isRebalancing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Rebalancing...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Execute Rebalance
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => {
              setShowPreview(false);
              setRebalanceStatus(RebalancingStatus.PENDING);
              setRebalanceTransactions([]);
            }}>
              Done
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
