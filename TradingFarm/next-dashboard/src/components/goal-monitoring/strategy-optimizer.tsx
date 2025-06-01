'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  HelpCircle,
  LayoutList,
  Lightbulb,
  RefreshCw,
  Zap,
} from 'lucide-react';

import { strategyOptimizationService, OptimizationRecommendation, OptimizationResult } from '@/services/strategy-optimization-service';
import { GoalAnalytics } from '@/services/goal-analytics-service';

// Priority badge mapping
const priorityBadge = {
  HIGH: <Badge variant="destructive">High Priority</Badge>,
  MEDIUM: <Badge variant="default">Medium Priority</Badge>,
  LOW: <Badge variant="outline">Low Priority</Badge>,
};

// Type icon mapping
const typeIcon = {
  PARAMETER_ADJUSTMENT: <Zap className="h-4 w-4 text-amber-500" />,
  STRATEGY_SWITCH: <ArrowRight className="h-4 w-4 text-blue-500" />,
  TIMING_ADJUSTMENT: <Badge variant="outline" className="px-1 py-0 h-4">⏱️</Badge>,
  RISK_ADJUSTMENT: <Badge variant="outline" className="px-1 py-0 h-4">⚠️</Badge>,
};

export interface StrategyOptimizerProps {
  goalId: string;
  analytics?: GoalAnalytics;
  onOptimizationApplied?: () => void;
}

export function StrategyOptimizer({
  goalId,
  analytics,
  onOptimizationApplied
}: StrategyOptimizerProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optimizations, setOptimizations] = useState<OptimizationResult | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptimizationRecommendation | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Fetch optimization recommendations
  const fetchOptimizations = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      const { data, error } = await strategyOptimizationService.generateOptimizations(goalId, analytics);
      
      if (error) {
        toast.error('Failed to generate optimization recommendations');
        console.error('Error fetching optimizations:', error);
      } else if (data) {
        setOptimizations(data);
      }
    } catch (error) {
      console.error('Error fetching optimizations:', error);
      toast.error('Failed to load optimization recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchOptimizations();
  }, [goalId, analytics]);
  
  // Handle applying a recommendation
  const handleApplyRecommendation = async (recommendationId: string) => {
    setIsApplying(true);
    try {
      const { success, error } = await strategyOptimizationService.applyOptimization(goalId, recommendationId);
      
      if (error || !success) {
        toast.error('Failed to apply optimization: ' + error);
      } else {
        toast.success('Strategy optimization applied successfully');
        
        // Mark as applied in the UI
        if (optimizations) {
          setOptimizations({
            ...optimizations,
            appliedRecommendations: [
              ...(optimizations.appliedRecommendations || []),
              recommendationId
            ]
          });
        }
        
        // Notify parent component
        if (onOptimizationApplied) {
          onOptimizationApplied();
        }
      }
    } catch (error) {
      console.error('Error applying optimization:', error);
      toast.error('An error occurred while applying the optimization');
    } finally {
      setIsApplying(false);
      setDialogOpen(false);
    }
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchOptimizations();
  };
  
  // Check if a recommendation has been applied
  const isRecommendationApplied = (id: string): boolean => {
    return optimizations?.appliedRecommendations?.includes(id) || false;
  };
  
  // If loading and no data yet
  if (loading && !optimizations) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="h-5 w-5 text-primary mr-2" />
            <div>
              <CardTitle>Strategy Optimizer</CardTitle>
              <CardDescription>
                AI-powered recommendations to improve your acquisition strategy
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!optimizations || optimizations.recommendations.length === 0 ? (
          <div className="space-y-4">
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>No Recommendations Available</AlertTitle>
              <AlertDescription>
                We don't have any strategy optimizations to suggest at this time. This could be because:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Your current strategy is already performing well</li>
                  <li>There's not enough historical data to make recommendations</li>
                  <li>Market conditions haven't changed significantly</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-muted">
              <LayoutList className="h-4 w-4" />
              <AlertDescription>
                {optimizations.recommendations.length} optimization{optimizations.recommendations.length !== 1 && 's'} available based on current analytics and market conditions
              </AlertDescription>
            </Alert>
            
            <Accordion type="single" collapsible className="w-full">
              {optimizations.recommendations.map((recommendation) => {
                const isApplied = isRecommendationApplied(recommendation.id);
                
                return (
                  <AccordionItem 
                    key={recommendation.id} 
                    value={recommendation.id}
                    className={`border ${isApplied ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-start text-left gap-2">
                        <div className="mt-0.5">
                          {typeIcon[recommendation.type]} 
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {recommendation.description}
                            </span>
                            {priorityBadge[recommendation.priority]}
                            {isApplied && (
                              <Badge variant="outline" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                <Check className="h-3 w-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Expect: {recommendation.expectedBenefit}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold">Reasoning</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {recommendation.reasoning}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">Expected Benefit</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {recommendation.expectedBenefit}
                            </p>
                            <div className="flex items-center mt-2">
                              <span className="text-xs text-muted-foreground mr-2">
                                Confidence:
                              </span>
                              <div className="w-24 h-2 bg-muted rounded-full">
                                <div 
                                  className="h-full rounded-full bg-primary" 
                                  style={{ width: `${recommendation.confidence * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs ml-2">
                                {Math.round(recommendation.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {recommendation.parameters && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1">Parameters</h4>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                              {JSON.stringify(recommendation.parameters, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          {!isApplied ? (
                            <Dialog open={dialogOpen && selectedRecommendation?.id === recommendation.id} onOpenChange={(open) => {
                              setDialogOpen(open);
                              if (!open) setSelectedRecommendation(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="default"
                                  size="sm"
                                  onClick={() => setSelectedRecommendation(recommendation)}
                                >
                                  <Zap className="mr-2 h-4 w-4" />
                                  Apply Optimization
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Apply Strategy Optimization</DialogTitle>
                                  <DialogDescription>
                                    This will create a new strategy based on the recommendation. The current strategy will be marked as superseded.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-600">Review Before Applying</AlertTitle>
                                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                                      {recommendation.description}
                                    </AlertDescription>
                                  </Alert>
                                  
                                  <div className="grid grid-cols-1 gap-4 text-sm">
                                    <div>
                                      <h4 className="font-semibold">Expected Benefit</h4>
                                      <p className="text-muted-foreground">
                                        {recommendation.expectedBenefit}
                                      </p>
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-semibold">Recommendation Type</h4>
                                      <div className="flex items-center mt-1">
                                        {typeIcon[recommendation.type]}
                                        <span className="ml-2">{recommendation.type.replace(/_/g, ' ')}</span>
                                      </div>
                                    </div>
                                    
                                    {recommendation.parameters && (
                                      <div>
                                        <h4 className="font-semibold">Parameters to Change</h4>
                                        <pre className="text-xs bg-muted p-2 rounded overflow-auto mt-1">
                                          {JSON.stringify(recommendation.parameters, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={isApplying}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="default"
                                    onClick={() => handleApplyRecommendation(recommendation.id)}
                                    disabled={isApplying}
                                  >
                                    {isApplying ? (
                                      <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Applying...
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="mr-2 h-4 w-4" />
                                        Apply Optimization
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Badge variant="outline" className="px-2 py-1">
                              <Check className="h-3 w-3 mr-1" />
                              Applied
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </CardContent>
      {optimizations && (
        <CardFooter className="border-t px-6 py-4">
          <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
            <div>
              Market conditions: 
              <Badge variant="outline" className="ml-2">
                {optimizations.marketConditions.trend}
              </Badge>
              <Badge variant="outline" className="ml-1">
                {optimizations.marketConditions.volatility} volatility
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh recommendations
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
