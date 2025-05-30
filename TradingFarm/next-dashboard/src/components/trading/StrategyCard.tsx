import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChartLineUp, Pulse, Gauge, ArrowRight } from 'lucide-react';
import { StrategyConfig } from '@/utils/trading/decision-engine';
import { useRouter } from 'next/navigation';

interface StrategyCardProps {
  strategy: StrategyConfig;
  onToggleActive: (id: string, active: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  performance?: {
    winRate: number;
    profitFactor: number;
    totalReturns: number;
    maxDrawdown: number;
  };
}

export function StrategyCard({ 
  strategy, 
  onToggleActive, 
  onEdit, 
  onDelete,
  performance
}: StrategyCardProps) {
  const [isActive, setIsActive] = useState(strategy.enabled);
  const router = useRouter();
  
  const handleToggle = (checked: boolean) => {
    setIsActive(checked);
    onToggleActive(strategy.id, checked);
  };
  
  const handleViewDetails = () => {
    router.push(`/dashboard/trading/strategies/${strategy.id}`);
  };
  
  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{strategy.name}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {strategy.type === 'trend_following' && <span className="flex items-center"><ChartLineUp className="h-3.5 w-3.5 mr-1" /> Trend Following</span>}
              {strategy.type === 'mean_reversion' && <span className="flex items-center"><Pulse className="h-3.5 w-3.5 mr-1" /> Mean Reversion</span>}
              {strategy.type === 'breakout' && <span className="flex items-center"><Gauge className="h-3.5 w-3.5 mr-1" /> Breakout</span>}
              {strategy.type === 'custom' && <span className="flex items-center"><Pulse className="h-3.5 w-3.5 mr-1" /> Custom</span>}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={isActive} 
              onCheckedChange={handleToggle} 
              aria-label="Toggle strategy active"
            />
            <Badge variant={isActive ? "default" : "outline"}>
              {isActive ? "Active" : "Disabled"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Exchange</p>
            <p className="font-medium">{strategy.exchange}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Timeframes</p>
            <p className="font-medium">
              {strategy.timeframes.slice(0, 3).join(', ')}
              {strategy.timeframes.length > 3 && '...'}
            </p>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Trading Pairs</p>
          <div className="flex flex-wrap gap-1.5">
            {strategy.symbols.slice(0, 3).map((symbol) => (
              <Badge key={symbol} variant="secondary" className="text-xs">
                {symbol}
              </Badge>
            ))}
            {strategy.symbols.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{strategy.symbols.length - 3} more
              </Badge>
            )}
          </div>
        </div>
        
        {performance && (
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="bg-background/50 p-2 rounded-md">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className={`font-semibold ${performance.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {performance.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-background/50 p-2 rounded-md">
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={`font-semibold ${performance.profitFactor >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                {performance.profitFactor.toFixed(2)}
              </p>
            </div>
            <div className="bg-background/50 p-2 rounded-md">
              <p className="text-xs text-muted-foreground">Return</p>
              <p className={`font-semibold ${performance.totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performance.totalReturns.toFixed(2)}%
              </p>
            </div>
            <div className="bg-background/50 p-2 rounded-md">
              <p className="text-xs text-muted-foreground">Drawdown</p>
              <p className="font-semibold text-red-600">
                {performance.maxDrawdown.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" onClick={() => onEdit(strategy.id)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(strategy.id)}>
            Delete
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="flex items-center" onClick={handleViewDetails}>
          Details
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
