'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { RiskManager } from '@/lib/risk/risk-manager';
import { PortfolioRiskSnapshot } from '@/lib/risk/types';
import { createBrowserClient } from '@/utils/supabase/client';
import {
  AlertTriangle,
  AlertCircle,
  BarChart4,
  PieChart,
  TrendingDown,
  ShieldAlert,
  RefreshCw,
  Download,
  Activity,
  BarChart,
  DollarSign,
  Percent,
  Target,
  Layers,
  PieChartIcon,
  NetworkIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Order, MarketData } from '@/types/exchange';
import { HeatmapGrid } from './HeatmapGrid';
import { RiskGauge } from './RiskGauge';

interface PortfolioRiskDashboardProps {
  userId: string;
  farmId?: string;
}

export function PortfolioRiskDashboard({ userId, farmId }: PortfolioRiskDashboardProps) {
  const [riskSnapshot, setRiskSnapshot] = React.useState<PortfolioRiskSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshInterval, setRefreshInterval] = React.useState<number | null>(30000); // 30s refresh by default
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Create RiskManager instance
  const riskManagerRef = React.useRef<RiskManager | null>(null);
  
  // Initialize RiskManager
  React.useEffect(() => {
    riskManagerRef.current = new RiskManager(userId);
    
    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId]);
  
  // Create a function to fetch portfolio data and update the risk snapshot
  const updateRiskSnapshot = React.useCallback(async () => {
    try {
      setLoading(true);
      
      if (!riskManagerRef.current) {
        console.error('RiskManager not initialized');
        return;
      }
      
      const supabase = createBrowserClient();
      
      // Fetch account information
      const { data: accountData, error: accountError } = await supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (accountError) {
        console.error('Error fetching account data:', accountError);
        return;
      }
      
      // Fetch open positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open');
      
      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
        return;
      }
      
      // Fetch market data for open positions
      const symbols = positionsData.map((pos: any) => pos.symbol);
      const marketData: Record<string, MarketData> = {};
      
      if (symbols.length > 0) {
        const { data: marketDataResult, error: marketDataError } = await supabase
          .from('market_data')
          .select('*')
          .in('symbol', symbols);
          
        if (marketDataError) {
          console.error('Error fetching market data:', marketDataError);
        } else if (marketDataResult) {
          // Convert array to record by symbol
          marketDataResult.forEach((item: any) => {
            marketData[item.symbol] = {
              symbol: item.symbol,
              exchange: item.exchange,
              price: item.price,
              bid: item.bid,
              ask: item.ask,
              volume24h: item.volume_24h,
              change24h: item.change_24h,
              high24h: item.high_24h,
              low24h: item.low_24h,
              timestamp: item.timestamp
            };
          });
        }
      }
      
      // Fetch sector mapping data
      const { data: sectorData, error: sectorError } = await supabase
        .from('asset_sectors')
        .select('symbol, sector');
        
      const sectorMapping: Record<string, string> = {};
      if (!sectorError && sectorData) {
        sectorData.forEach((item: any) => {
          sectorMapping[item.symbol] = item.sector;
        });
      }
      
      // Map database positions to Order type
      const openPositions: Order[] = positionsData.map((pos: any) => ({
        id: pos.id,
        symbol: pos.symbol,
        side: pos.side,
        type: pos.type,
        status: pos.status,
        price: pos.entry_price,
        quantity: pos.size,
        size: pos.size,
        value: pos.size * (marketData[pos.symbol]?.price || pos.entry_price),
        createdAt: new Date(pos.created_at).getTime(),
        updatedAt: new Date(pos.updated_at).getTime()
      }));
      
      // Update RiskManager with portfolio state
      await riskManagerRef.current.updatePortfolioState(
        accountData.equity,
        openPositions,
        accountData.available_balance,
        marketData,
        sectorMapping
      );
      
      // Generate risk snapshot
      const snapshot = riskManagerRef.current.createPortfolioRiskSnapshot();
      
      // Store snapshot in database for historical analysis
      await supabase
        .from('portfolio_risk_snapshots')
        .insert({
          user_id: userId,
          farm_id: farmId,
          total_equity: snapshot.totalEquity,
          total_exposure: snapshot.totalExposure,
          current_drawdown: snapshot.currentDrawdown,
          exposure_by_symbol: snapshot.exposureBySymbol,
          exposure_by_sector: snapshot.exposureBySector,
          leverage_utilization: snapshot.leverageUtilization,
          risk_score: snapshot.riskScore,
          diversification_score: snapshot.diversificationScore,
          correlation_matrix: snapshot.correlationMatrix,
          circuit_breaker_warnings: snapshot.circuitBreakerWarnings
        });
      
      setRiskSnapshot(snapshot);
    } catch (error) {
      console.error('Error updating risk snapshot:', error);
      toast({
        title: 'Error',
        description: 'Failed to update risk snapshot. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, farmId, toast]);
  
  // Set up refresh interval
  React.useEffect(() => {
    if (refreshInterval) {
      updateRiskSnapshot();
      
      intervalRef.current = setInterval(() => {
        updateRiskSnapshot();
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, updateRiskSnapshot]);
  
  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percentage for display
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Get color based on risk level
  const getRiskColor = (value: number, thresholds: [number, number, number]) => {
    if (value < thresholds[0]) return 'text-green-500';
    if (value < thresholds[1]) return 'text-yellow-500';
    if (value < thresholds[2]) return 'text-orange-500';
    return 'text-red-500';
  };
  
  // Risk score background color
  const getRiskScoreBackground = (score: number) => {
    if (score < 25) return 'bg-green-100';
    if (score < 50) return 'bg-yellow-100';
    if (score < 75) return 'bg-orange-100';
    return 'bg-red-100';
  };
  
  // Get risk score text color
  const getRiskScoreText = (score: number) => {
    if (score < 25) return 'text-green-800';
    if (score < 50) return 'text-yellow-800';
    if (score < 75) return 'text-orange-800';
    return 'text-red-800';
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Portfolio Risk Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of trading risk exposure
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => updateRiskSnapshot()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" disabled={!riskSnapshot}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {riskSnapshot?.circuitBreakerWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Circuit Breaker Triggered</AlertTitle>
          <AlertDescription>
            {riskSnapshot.circuitBreakerWarnings.map((warning, i) => (
              <div key={i}>{warning}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}
      
      {loading && !riskSnapshot ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded-md w-1/3 mb-1"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded-md w-1/2 mb-4"></div>
                <div className="h-4 bg-muted rounded-md w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riskSnapshot ? formatCurrency(riskSnapshot.totalEquity) : '-'}
              </div>
              {riskSnapshot && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className={riskSnapshot.currentDrawdown > 0 ? 'text-red-500' : 'text-green-500'}>
                    {riskSnapshot.currentDrawdown > 0 
                      ? `↓ ${formatPercent(riskSnapshot.currentDrawdown)} drawdown` 
                      : 'No current drawdown'}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riskSnapshot ? formatCurrency(riskSnapshot.totalExposure) : '-'}
              </div>
              {riskSnapshot && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className={
                    getRiskColor(riskSnapshot.leverageUtilization, [50, 70, 90])
                  }>
                    {formatPercent(riskSnapshot.leverageUtilization)} of portfolio
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">
                  {riskSnapshot ? riskSnapshot.riskScore : '-'}
                </div>
                {riskSnapshot && (
                  <Badge 
                    className={`ml-2 ${getRiskScoreBackground(riskSnapshot.riskScore)} ${getRiskScoreText(riskSnapshot.riskScore)}`}
                  >
                    {riskSnapshot.riskScore < 25 ? 'Low' : 
                     riskSnapshot.riskScore < 50 ? 'Moderate' : 
                     riskSnapshot.riskScore < 75 ? 'High' : 'Very High'}
                  </Badge>
                )}
              </div>
              {riskSnapshot && (
                <Progress 
                  value={riskSnapshot.riskScore} 
                  max={100} 
                  className="h-2 mt-2" 
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {riskSnapshot && (
        <Tabs defaultValue="exposure" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exposure">Exposure Analysis</TabsTrigger>
            <TabsTrigger value="correlations">Position Correlations</TabsTrigger>
            <TabsTrigger value="diversification">Diversification</TabsTrigger>
            <TabsTrigger value="metrics">Risk Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="exposure" className="mt-4">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Exposure by Symbol</CardTitle>
                  <CardDescription>
                    Breakdown of capital allocation by trading instrument
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.entries(riskSnapshot.exposureBySymbol).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(riskSnapshot.exposureBySymbol)
                        .sort(([, valueA], [, valueB]) => valueB - valueA)
                        .map(([symbol, exposure]) => {
                          const percentage = (exposure / riskSnapshot.totalEquity) * 100;
                          return (
                            <div key={symbol} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{symbol}</span>
                                <span>{formatCurrency(exposure)} ({formatPercent(percentage)})</span>
                              </div>
                              <Progress 
                                value={percentage} 
                                max={100} 
                                className={`h-2 ${getRiskColor(percentage, [15, 30, 50])}`} 
                              />
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <Layers className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-medium">No Open Positions</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mt-1">
                        You don't have any open positions at the moment. Your exposure data will appear here once you start trading.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exposure by Sector</CardTitle>
                  <CardDescription>
                    Industry sector diversification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.entries(riskSnapshot.exposureBySector).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(riskSnapshot.exposureBySector)
                        .sort(([, valueA], [, valueB]) => valueB - valueA)
                        .map(([sector, exposure]) => {
                          const percentage = (exposure / riskSnapshot.totalEquity) * 100;
                          return (
                            <div key={sector} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{sector}</span>
                                <span>{formatPercent(percentage)}</span>
                              </div>
                              <Progress 
                                value={percentage} 
                                max={100} 
                                className={`h-2 ${getRiskColor(percentage, [25, 40, 60])}`} 
                              />
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <PieChartIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-medium">No Sector Data</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mt-1">
                        Sector analysis will be available when you have open positions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="correlations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Position Correlations</CardTitle>
                <CardDescription>
                  Analysis of how your positions correlate with each other
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(riskSnapshot.correlationMatrix).length > 0 ? (
                  <div>
                    <HeatmapGrid 
                      data={riskSnapshot.correlationMatrix} 
                      minValue={-1} 
                      maxValue={1} 
                    />
                    <p className="text-sm text-muted-foreground mt-4">
                      High correlation (red) indicates positions that tend to move together, which can increase overall portfolio risk during market downturns. Negative correlation (green) provides diversification benefits.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <NetworkIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">Insufficient Data</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mt-1">
                      Correlation analysis requires at least two open positions. Add more positions to see correlation data.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="diversification" className="mt-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Diversification Score</CardTitle>
                  <CardDescription>
                    How well diversified your portfolio is
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center">
                    <RiskGauge 
                      value={riskSnapshot.diversificationScore} 
                      maxValue={100} 
                      threshold={[40, 60, 80]}
                      size={180}
                      reverseColors
                    />
                    <div className="mt-4 text-center">
                      <h4 className="font-medium">
                        {riskSnapshot.diversificationScore < 40 ? 'Poor' :
                         riskSnapshot.diversificationScore < 60 ? 'Fair' :
                         riskSnapshot.diversificationScore < 80 ? 'Good' : 'Excellent'} Diversification
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {riskSnapshot.diversificationScore < 60 
                          ? 'Consider adding more variety to your portfolio.'
                          : 'Your portfolio has a healthy level of diversification.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Diversification Metrics</CardTitle>
                  <CardDescription>
                    Key metrics affecting portfolio diversification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Asset Count</span>
                        <span className="text-sm">{Object.keys(riskSnapshot.exposureBySymbol).length}</span>
                      </div>
                      <Progress 
                        value={Object.keys(riskSnapshot.exposureBySymbol).length} 
                        max={10} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Sector Count</span>
                        <span className="text-sm">{Object.keys(riskSnapshot.exposureBySector).length}</span>
                      </div>
                      <Progress 
                        value={Object.keys(riskSnapshot.exposureBySector).length} 
                        max={5} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Max Symbol Exposure</span>
                        <span className="text-sm">
                          {Object.entries(riskSnapshot.exposureBySymbol).length > 0
                            ? formatPercent(Math.max(...Object.values(riskSnapshot.exposureBySymbol).map(
                                v => (v / riskSnapshot.totalEquity) * 100
                              )))
                            : '0%'}
                        </span>
                      </div>
                      <Progress 
                        value={Object.entries(riskSnapshot.exposureBySymbol).length > 0
                          ? Math.max(...Object.values(riskSnapshot.exposureBySymbol).map(
                              v => (v / riskSnapshot.totalEquity) * 100
                            ))
                          : 0} 
                        max={100} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Max Sector Exposure</span>
                        <span className="text-sm">
                          {Object.entries(riskSnapshot.exposureBySector).length > 0
                            ? formatPercent(Math.max(...Object.values(riskSnapshot.exposureBySector).map(
                                v => (v / riskSnapshot.totalEquity) * 100
                              )))
                            : '0%'}
                        </span>
                      </div>
                      <Progress 
                        value={Object.entries(riskSnapshot.exposureBySector).length > 0
                          ? Math.max(...Object.values(riskSnapshot.exposureBySector).map(
                              v => (v / riskSnapshot.totalEquity) * 100
                            ))
                          : 0} 
                        max={100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="mt-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <CardTitle className="text-sm">Risk Score</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{riskSnapshot.riskScore}/100</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Overall portfolio risk rating
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <BarChart className="h-4 w-4 mr-2 text-muted-foreground" />
                    <CardTitle className="text-sm">Leverage Utilization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercent(riskSnapshot.leverageUtilization)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Of maximum allowed leverage
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <CardTitle className="text-sm">Exposure Ratio</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercent((riskSnapshot.totalExposure / riskSnapshot.totalEquity) * 100)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total exposure relative to equity
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2 text-muted-foreground" />
                    <CardTitle className="text-sm">Current Drawdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${riskSnapshot.currentDrawdown > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatPercent(riskSnapshot.currentDrawdown)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From account peak value
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      <div className="mt-2 text-right text-xs text-muted-foreground">
        {riskSnapshot && (
          <>
            Last updated: {new Date(riskSnapshot.timestamp).toLocaleTimeString()} · 
            <Button variant="link" className="text-xs p-0 h-auto" onClick={() => updateRiskSnapshot()}>
              Refresh Now
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
