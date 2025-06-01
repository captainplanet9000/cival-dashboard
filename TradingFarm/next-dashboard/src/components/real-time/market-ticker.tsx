"use client";

import { useEffect, useState } from "react";
import { useSocketMarket, MarketUpdate } from "@/hooks/use-socket-market";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface MarketTickerProps {
  symbols?: string[];
  refreshInterval?: number;
  className?: string;
}

export function MarketTicker({
  symbols = ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"],
  refreshInterval = 1000,
  className,
}: MarketTickerProps) {
  const { marketData, isLoading, isConnected } = useSocketMarket(symbols);
  const [activeTab, setActiveTab] = useState("all");
  const [visibleData, setVisibleData] = useState<Record<string, MarketUpdate>>({});

  // Smooth price transition animation
  useEffect(() => {
    setVisibleData(marketData);
  }, [marketData]);

  // Group assets by category
  const categories = {
    all: symbols,
    majors: ["BTC/USD", "ETH/USD"],
    alts: ["SOL/USD", "BNB/USD", "XRP/USD"],
  };

  // Filter symbols by selected category
  const filteredSymbols = categories[activeTab as keyof typeof categories] || categories.all;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Market Overview</CardTitle>
            <CardDescription>Real-time cryptocurrency prices</CardDescription>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 py-2 border-b">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Assets</TabsTrigger>
              <TabsTrigger value="majors">Major Coins</TabsTrigger>
              <TabsTrigger value="alts">Altcoins</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={activeTab} className="mt-0 pt-0">
            <div className="divide-y">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                filteredSymbols.map((symbol) => {
                  const data = visibleData[symbol];
                  const isPositive = data?.change && data.change >= 0;
                  
                  return (
                    <div key={symbol} className="flex justify-between items-center py-3 px-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{symbol.split('/')[0]}</div>
                        <div className="text-xs text-muted-foreground">{symbol.split('/')[1]}</div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="font-medium">
                          {data ? `$${data.price.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: data.price < 1 ? 4 : 2 
                          })}` : "-"}
                        </div>
                        
                        {data && (
                          <div className={cn(
                            "flex items-center text-xs gap-1",
                            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            <span>{Math.abs(data.changePercent).toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
