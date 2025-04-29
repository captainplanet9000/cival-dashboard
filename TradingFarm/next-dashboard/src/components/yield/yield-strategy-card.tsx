import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronRight, TrendingUp, Clock, Coins, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { YieldStrategy } from "@/types/yield-strategy.types";

interface YieldStrategyCardProps {
  strategy: YieldStrategy;
  farmId: string;
}

export function YieldStrategyCard({ strategy, farmId }: YieldStrategyCardProps) {
  // Helper to format risk level
  const getRiskBadge = (level: number) => {
    switch (level) {
      case 1:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Low Risk</Badge>;
      case 2:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Medium Risk</Badge>;
      case 3:
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">High Risk</Badge>;
      case 4:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Very High Risk</Badge>;
      default:
        return <Badge variant="outline">Custom Risk</Badge>;
    }
  };

  // Helper to get strategy status indicator
  const getStatusIndicator = () => {
    if (!strategy.isActive) {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactive</Badge>;
    }
    
    if (strategy.currentApy && strategy.targetApy) {
      const ratio = strategy.currentApy / strategy.targetApy;
      if (ratio >= 0.95) {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Optimal
        </Badge>;
      } else if (ratio >= 0.8) {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <TrendingUp className="w-3.5 h-3.5 mr-1" /> Performing
        </Badge>;
      } else {
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <AlertCircle className="w-3.5 h-3.5 mr-1" /> Suboptimal
        </Badge>;
      }
    }
    
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
      <Clock className="w-3.5 h-3.5 mr-1" /> Active
    </Badge>;
  };

  // Calculate percent earned
  const percentEarned = strategy.totalValueUsd > 0 
    ? (strategy.totalEarnedUsd / strategy.totalValueUsd) * 100 
    : 0;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{strategy.name}</CardTitle>
            <CardDescription className="text-sm mt-1">{strategy.description || "Cross-chain yield strategy"}</CardDescription>
          </div>
          {getStatusIndicator()}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p className="text-sm text-muted-foreground">Current Value</p>
            <p className="text-xl font-semibold">{formatCurrency(strategy.totalValueUsd)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrency(strategy.totalEarnedUsd)}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-muted-foreground">Yield Performance</span>
            <span className="text-sm font-medium">{percentEarned.toFixed(2)}%</span>
          </div>
          <Progress value={percentEarned} max={100} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            {getRiskBadge(strategy.riskLevel)}
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {strategy.currentApy?.toFixed(2)}% APY
            </Badge>
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {strategy.rebalanceFrequency.charAt(0).toUpperCase() + strategy.rebalanceFrequency.slice(1)} rebalance
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 pt-2">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Coins className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {Object.keys(strategy.chainAllocations || {}).length} chains &middot; {Object.keys(strategy.protocolAllocations || {}).length} protocols
            </span>
          </div>
          <Link href={`/dashboard/farms/${farmId}/strategies/${strategy.id}`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View Details
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
