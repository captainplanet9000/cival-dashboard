'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, ActivityIcon, RefreshCw as RefreshCwwIcon, ServerIcon, BarChart2Icon, LineChartIcon, ArrowRightIcon } from 'lucide-react';
import { DashboardHeader } from '@/components/header';
import { DashboardShell } from '@/components/shell';
import { MarketAnalysisCard } from '@/components/mcp/MarketAnalysisCard';

// Placeholder for the MCP services we would normally import
// In a real implementation, these would be proper imports
const mcpManager = {
  getServerStatus: () => ({
    'heurist-mesh': { name: 'Heurist Mesh', category: 'blockchain', status: true, priority: 'high' },
    'uniswap-trader': { name: 'Uniswap Trader', category: 'defi', status: true, priority: 'high' },
    'crypto-indicators': { name: 'Crypto Indicators', category: 'market-data', status: true, priority: 'high' },
    'crypto-sentiment': { name: 'Crypto Sentiment', category: 'market-data', status: true, priority: 'medium' },
    'alpha-vantage': { name: 'Alpha Vantage', category: 'market-data', status: false, priority: 'high' }
  }),
  getMcpServersByCategory: (category: string) => {
    const allServers = {
      'blockchain': ['heurist-mesh'],
      'defi': ['uniswap-trader'],
      'market-data': ['crypto-indicators', 'crypto-sentiment', 'alpha-vantage'],
    };
    return allServers[category as keyof typeof allServers] || [];
  }
};

export default function McpDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [servers, setServers] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Fetch MCP server status
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setServers(mcpManager.getServerStatus());
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Simulate getting vault accounts
  const vaultAccounts = [
    { id: 'acc1', name: 'Main Trading', balance: 10000, currency: 'USDT' },
    { id: 'acc2', name: 'DeFi Account', balance: 5000, currency: 'USDC' },
    { id: 'acc3', name: 'ETH Reserve', balance: 2.5, currency: 'ETH' }
  ];

  return (
    <DashboardShell>
      <DashboardHeader
        heading="MCP Integration Dashboard"
        description="Manage Model Context Protocol (MCP) servers and integrations with the Trading Farm platform."
      >
        <div className="flex items-center space-x-2">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
              <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
              <SelectItem value="SOL">Solana (SOL)</SelectItem>
              <SelectItem value="AVAX">Avalanche (AVAX)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCwwIcon className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </DashboardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="market-analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="defi">DeFi Integration</TabsTrigger>
          <TabsTrigger value="server-management">Server Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active MCP Servers
                </CardTitle>
                <ServerIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="text-2xl font-bold">
                    {Object.values(servers).filter(server => server.status).length} / {Object.values(servers).length}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  MCP servers currently connected and operational
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Trading Signals
                </CardTitle>
                <BarChart2Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="text-2xl font-bold">3</div>
                )}
                <p className="text-xs text-muted-foreground">
                  Active trading signals from MCP analysis
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  DeFi Opportunities
                </CardTitle>
                <LineChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="text-2xl font-bold">5</div>
                )}
                <p className="text-xs text-muted-foreground">
                  DeFi opportunities detected by MCP servers
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>MCP Server Status</CardTitle>
                <CardDescription>
                  Current status of all connected MCP servers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(servers).map(([serverId, server]: [string, any]) => (
                      <div key={serverId} className="flex items-center justify-between py-1">
                        <div className="flex items-center">
                          <div className={`h-2.5 w-2.5 rounded-full mr-2 ${server.status ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="font-medium">{server.name}</span>
                        </div>
                        <div className="flex items-center">
                          <Badge variant="outline">{server.category}</Badge>
                          <Badge 
                            variant={server.priority === 'high' ? 'destructive' : 'secondary'} 
                            className="ml-2"
                          >
                            {server.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <ActivityIcon className="h-4 w-4 mr-2" />
                  View Activity Logs
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common MCP operations with the vault banking system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="w-full">
                      Execute Swap
                    </Button>
                    <Button variant="outline" className="w-full">
                      Analyze Contract
                    </Button>
                  </div>
                  
                  <div className="rounded-md border p-4">
                    <div className="font-medium mb-2">Sync DeFi Positions with Vault</div>
                    <div className="flex space-x-2 mb-3">
                      <Select defaultValue="acc2">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {vaultAccounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.balance} {account.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button>
                        <ArrowRightIcon className="h-4 w-4 mr-2" />
                        Sync
                      </Button>
                    </div>
                  </div>
                  
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Integration Status</AlertTitle>
                    <AlertDescription>
                      MCP servers are successfully integrated with your vault banking system.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="market-analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="col-span-2 md:col-span-1">
              <MarketAnalysisCard 
                symbol={selectedSymbol} 
                onRecommendationSelect={(rec) => console.log('Selected recommendation:', rec)}
              />
            </div>
            
            <Card className="col-span-2 md:col-span-1">
              <CardHeader>
                <CardTitle>Market Analysis Providers</CardTitle>
                <CardDescription>MCP servers providing market analysis data</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Alpha Vantage</TableCell>
                      <TableCell>Price Data</TableCell>
                      <TableCell>
                        <Badge variant={servers['alpha-vantage']?.status ? 'outline' : 'destructive'}>
                          {servers['alpha-vantage']?.status ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">2 mins ago</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Crypto Indicators</TableCell>
                      <TableCell>Technical Analysis</TableCell>
                      <TableCell>
                        <Badge variant={servers['crypto-indicators']?.status ? 'outline' : 'destructive'}>
                          {servers['crypto-indicators']?.status ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">5 mins ago</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Crypto Sentiment</TableCell>
                      <TableCell>Market Sentiment</TableCell>
                      <TableCell>
                        <Badge variant={servers['crypto-sentiment']?.status ? 'outline' : 'destructive'}>
                          {servers['crypto-sentiment']?.status ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">8 mins ago</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Configure Data Sources</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="defi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DeFi Protocol Integration</CardTitle>
              <CardDescription>
                Integration with DeFi protocols via MCP servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="text-lg font-medium mb-2">Uniswap Integration</h3>
                    <div className="text-sm mb-4">
                      Execute swaps and manage positions with Uniswap via the MCP server.
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Amount" />
                        <Select defaultValue="ETH">
                          <SelectTrigger>
                            <SelectValue placeholder="From" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="USDC">USDC</SelectItem>
                            <SelectItem value="USDT">USDT</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="USDC">
                          <SelectTrigger>
                            <SelectValue placeholder="To" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="USDC">USDC</SelectItem>
                            <SelectItem value="USDT">USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full">
                        Get Quote
                      </Button>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <h3 className="text-lg font-medium mb-2">Heurist Mesh Analysis</h3>
                    <div className="text-sm mb-4">
                      Analyze smart contracts and DeFi protocols for security and opportunities.
                    </div>
                    <div className="space-y-2">
                      <Input placeholder="Contract Address" />
                      <Select defaultValue="1">
                        <SelectTrigger>
                          <SelectValue placeholder="Chain" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Ethereum</SelectItem>
                          <SelectItem value="56">BSC</SelectItem>
                          <SelectItem value="137">Polygon</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button className="w-full">
                        Analyze Contract
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Integration Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Uniswap</TableCell>
                      <TableCell>DEX</TableCell>
                      <TableCell>
                        <Badge variant="outline">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">AAVE</TableCell>
                      <TableCell>Lending</TableCell>
                      <TableCell>
                        <Badge variant="outline">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Curve</TableCell>
                      <TableCell>DEX</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Pending</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Configure</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="server-management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Server Management</CardTitle>
              <CardDescription>
                Manage and configure Model Context Protocol servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Base URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    Object.entries(servers).map(([serverId, server]: [string, any]) => (
                      <TableRow key={serverId}>
                        <TableCell className="font-medium">{server.name}</TableCell>
                        <TableCell>{server.category}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {serverId === 'heurist-mesh' ? 'http://localhost:3456' : 
                           serverId === 'uniswap-trader' ? 'http://localhost:3457' : 
                           serverId === 'crypto-indicators' ? 'http://localhost:3458' : 
                           serverId === 'crypto-sentiment' ? 'http://localhost:3459' : 
                           'http://localhost:3460'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={server.status ? 'outline' : 'destructive'}>
                            {server.status ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            {server.status ? 'Disconnect' : 'Connect'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Add New MCP Server</Button>
              <Button>Refresh Connections</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
