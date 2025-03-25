"use client";

import { useEffect, useState } from "react";
import { useSocketTrades, TradeExecution } from "@/hooks/use-socket-trades";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight, RotateCw } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { formatTime } from "@/utils/date-utils";

interface LiveTradesFeedProps {
  maxItems?: number;
  showAgentInfo?: boolean;
  showExchange?: boolean;
  className?: string;
  onTradeClick?: (trade: TradeExecution) => void;
}

export function LiveTradesFeed({
  maxItems = 10,
  showAgentInfo = true,
  showExchange = true,
  className,
  onTradeClick,
}: LiveTradesFeedProps) {
  const { trades, isLoading, isConnected } = useSocketTrades();
  const [displayedTrades, setDisplayedTrades] = useState<TradeExecution[]>([]);
  const [newTradeHighlight, setNewTradeHighlight] = useState<string | null>(null);

  // Animate new trades appearing
  useEffect(() => {
    if (trades.length === 0) return;
    
    setDisplayedTrades(trades.slice(0, maxItems));
    
    // Highlight the newest trade
    if (trades[0] && trades[0].id !== displayedTrades[0]?.id) {
      setNewTradeHighlight(trades[0].id);
      
      // Remove highlight after animation
      const timer = setTimeout(() => {
        setNewTradeHighlight(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [trades, maxItems, displayedTrades]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Live Trades</CardTitle>
            <CardDescription>Real-time trading activity</CardDescription>
          </div>
          {isConnected ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              Connecting...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayedTrades.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No trades yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Waiting for trading activity...
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="divide-y">
              {displayedTrades.map((trade) => (
                <div 
                  key={trade.id}
                  onClick={() => onTradeClick?.(trade)}
                  className={cn(
                    "flex items-start gap-3 py-3 px-4 hover:bg-muted/50 transition-all",
                    onTradeClick && "cursor-pointer",
                    trade.id === newTradeHighlight && "bg-primary/5 animate-pulse"
                  )}
                >
                  <div 
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      trade.side === 'buy' 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}
                  >
                    {trade.side === 'buy' ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trade.symbol}</span>
                        <Badge variant={trade.status === 'executed' ? "outline" : "secondary"}>
                          {trade.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatTime(new Date(trade.timestamp))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className={trade.side === 'buy' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        {trade.side === 'buy' ? 'Buy' : 'Sell'} {trade.amount.toFixed(4)}
                      </span>
                      <span className="font-mono">
                        ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      {showAgentInfo && trade.agentId && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          Agent: {trade.agentId}
                        </span>
                      )}
                      {showExchange && trade.exchange && (
                        <span className="text-xs text-muted-foreground">
                          {trade.exchange}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/50">
        <Button variant="outline" size="sm" className="w-full flex gap-1.5 items-center">
          <RotateCw className="h-3.5 w-3.5" />
          View Trade History
        </Button>
      </CardFooter>
    </Card>
  );
}
