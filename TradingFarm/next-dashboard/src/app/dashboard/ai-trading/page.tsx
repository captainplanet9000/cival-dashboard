import React from 'react';
import { Metadata } from 'next';
import { AIPredictionPanel } from '@/components/analytics/AIPredictionPanel';
import { PerformanceAnalyticsDashboard } from '@/components/analytics/PerformanceAnalyticsDashboard';
import { createServerClient } from '@/utils/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ChevronRight, Cpu, LineChart, PieChart, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Trading - Trading Farm',
  description: 'AI-powered trading analytics and automated trading strategies',
};

async function getSymbolsList() {
  const supabase = await createServerClient();
  
  // In a real application, this would fetch from the database or exchange API
  // For demonstration, we'll return a hardcoded list
  return [
    'BTC/USDT',
    'ETH/USDT',
    'SOL/USDT',
    'XRP/USDT',
    'BNB/USDT',
    'ADA/USDT',
    'DOGE/USDT',
    'AVAX/USDT',
  ];
}

async function getUserId() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || '';
}

export default async function AITradingPage() {
  const symbols = await getSymbolsList();
  const userId = await getUserId();
  
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">AI Trading Suite</h2>
          <p className="text-muted-foreground">
            Advanced market analysis and AI-powered trading signals
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Cpu className="mr-2 h-4 w-4" />
            Create Bot
          </Button>
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            New Signal
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +6 from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">76.3%</div>
            <p className="text-xs text-muted-foreground">
              +2.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active AI Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              2 profitable this month
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Predictions
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Performance Analysis
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            AI Trading Agents
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="predictions" className="space-y-4 py-4">
          <AIPredictionPanel userId={userId} symbols={symbols} />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4 py-4">
          <PerformanceAnalyticsDashboard userId={parseInt(userId)} timeRange="month" />
        </TabsContent>
        
        <TabsContent value="agents" className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">AI Trading Agents</h3>
              <Button variant="outline" size="sm">
                <Cpu className="mr-2 h-4 w-4" />
                Create New Agent
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Agent 1 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-blue-700" />
                      </div>
                      <CardTitle>BTC Momentum Trader</CardTitle>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <CardDescription>
                    AI-powered momentum trading strategy for Bitcoin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Profit</p>
                      <p className="text-2xl font-bold text-green-600">+12.4%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Win Rate</p>
                      <p className="text-2xl font-bold">68%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active Since</p>
                      <p className="text-2xl font-bold">14d</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recent Trades</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                            <ChevronRight className="h-3 w-3 text-green-600" />
                          </div>
                          <span>BTC/USDT Long</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>$68,245</span>
                          <span className="text-green-600">+2.1%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center mr-2">
                            <ChevronRight className="h-3 w-3 text-red-600" />
                          </div>
                          <span>BTC/USDT Short</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>$66,780</span>
                          <span className="text-red-600">-0.8%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm" className="ml-2">Edit Strategy</Button>
                    <Button variant="default" size="sm" className="ml-2">Stop Agent</Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Agent 2 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-purple-700" />
                      </div>
                      <CardTitle>ETH Breakout Detector</CardTitle>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <CardDescription>
                    Identifies and trades ETH breakout patterns with high confidence
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Profit</p>
                      <p className="text-2xl font-bold text-green-600">+8.7%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Win Rate</p>
                      <p className="text-2xl font-bold">72%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active Since</p>
                      <p className="text-2xl font-bold">21d</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recent Trades</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                            <ChevronRight className="h-3 w-3 text-green-600" />
                          </div>
                          <span>ETH/USDT Long</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>$3,481</span>
                          <span className="text-green-600">+4.3%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                            <ChevronRight className="h-3 w-3 text-green-600" />
                          </div>
                          <span>ETH/USDT Long</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>$3,245</span>
                          <span className="text-green-600">+1.9%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm" className="ml-2">Edit Strategy</Button>
                    <Button variant="default" size="sm" className="ml-2">Stop Agent</Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Agent 3 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-green-700" />
                      </div>
                      <CardTitle>Altcoin Sentiment Trader</CardTitle>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <CardDescription>
                    Analyzes social sentiment and trades high-potential altcoins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Total Profit</p>
                      <p className="text-2xl font-bold text-green-600">+22.1%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Win Rate</p>
                      <p className="text-2xl font-bold">59%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Active Since</p>
                      <p className="text-2xl font-bold">7d</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recent Trades</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                            <ChevronRight className="h-3 w-3 text-green-600" />
                          </div>
                          <span>SOL/USDT Long</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>$147.23</span>
                          <span className="text-green-600">+12.5%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center mr-2">
                            <ChevronRight className="h-3 w-3 text-red-600" />
                          </div>
                          <span>AVAX/USDT Long</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>$34.56</span>
                          <span className="text-red-600">-5.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm" className="ml-2">Edit Strategy</Button>
                    <Button variant="default" size="sm" className="ml-2">Stop Agent</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component for the Agent cards status badge
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
