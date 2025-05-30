import React from 'react';
import { Metadata } from 'next';
import { createServerClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, 
  Filter, 
  Download, 
  Search, 
  ChevronDown, 
  RefreshCw,
  AlertTriangle,
  Brain
} from 'lucide-react';
import PositionsTable from '@/components/positions/positions-table';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Positions | Trading Farm',
  description: 'Manage and monitor your trading positions',
};

// Function to fetch positions with optional filtering
async function getPositions(params: {
  farm_id?: string;
  agent_id?: string;
  symbol?: string;
  exchange?: string;
  side?: 'long' | 'short';
  reconciliation_status?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerClient();
  
  // Start building the query
  let query = supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (params.farm_id) query = query.eq('farm_id', params.farm_id);
  if (params.agent_id) query = query.eq('agent_id', params.agent_id);
  if (params.symbol) query = query.eq('symbol', params.symbol);
  if (params.exchange) query = query.eq('exchange', params.exchange);
  if (params.side) query = query.eq('side', params.side);
  if (params.reconciliation_status) query = query.eq('reconciliation_status', params.reconciliation_status);
  
  // Apply pagination
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
  
  return data || [];
}

// Function to fetch farms for the dropdown
async function getFarms() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('farms')
    .select('id, name')
    .order('name');
  
  if (error) {
    console.error('Error fetching farms:', error);
    return [];
  }
  
  return data || [];
}

// Function to fetch agents for a specific farm
async function getAgents(farmId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('agents')
    .select('id, name')
    .eq('farm_id', farmId)
    .order('name');
  
  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
  
  return data || [];
}

// Function to fetch exchanges
async function getExchanges() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('exchanges')
    .select('id, name')
    .order('name');
  
  if (error) {
    console.error('Error fetching exchanges:', error);
    return [];
  }
  
  return data || [];
}

// Function to get reconciliation status
async function getReconciliationStatus() {
  const supabase = await createServerClient();
  
  // Get reconciliation stats
  const { data, error } = await supabase.rpc('get_reconciliation_stats');
  
  if (error) {
    console.error('Error fetching reconciliation stats:', error);
    return {
      total_positions: 0,
      positions_reconciled: 0,
      positions_with_discrepancies: 0,
      last_reconciliation: null
    };
  }
  
  return data || {
    total_positions: 0,
    positions_reconciled: 0,
    positions_with_discrepancies: 0,
    last_reconciliation: null
  };
}

// Function to get portfolio summary
async function getPortfolioSummary(farmId?: string) {
  const supabase = await createServerClient();
  
  let query = supabase.rpc('get_portfolio_summary');
  
  if (farmId) {
    query = supabase.rpc('get_farm_portfolio_summary', { p_farm_id: farmId });
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching portfolio summary:', error);
    return {
      total_value: 0,
      total_cost: 0,
      total_pnl: 0,
      total_pnl_percentage: 0,
      long_exposure: 0,
      short_exposure: 0,
      net_exposure: 0,
      top_positions: []
    };
  }
  
  return data || {
    total_value: 0,
    total_cost: 0,
    total_pnl: 0,
    total_pnl_percentage: 0,
    long_exposure: 0,
    short_exposure: 0,
    net_exposure: 0,
    top_positions: []
  };
}

// Function to get ElizaOS position insights
async function getElizaOSInsights(farmId?: string) {
  const supabase = await createServerClient();
  
  let query = supabase
    .from('ai_insights')
    .select('*')
    .eq('reference_type', 'portfolio');
    
  if (farmId) {
    query = query.eq('reference_id', farmId);
  }
    
  query = query
    .order('created_at', { ascending: false })
    .limit(3);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching ElizaOS insights:', error);
    return [];
  }
  
  return data || [];
}

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: {
    farm_id?: string;
    agent_id?: string;
    tab?: string;
    symbol?: string;
    exchange?: string;
    side?: 'long' | 'short';
    reconciliation_status?: string;
    page?: string;
  };
}) {
  const {
    farm_id,
    agent_id,
    tab = 'all',
    symbol,
    exchange,
    side,
    reconciliation_status,
    page = '1'
  } = searchParams;
  
  const pageSize = 20;
  const pageNumber = parseInt(page, 10) || 1;
  const offset = (pageNumber - 1) * pageSize;
  
  // Fetch farms for filter dropdown
  const farms = await getFarms();
  
  // If farm_id is provided, fetch agents for that farm
  let agents: { id: string; name: string }[] = [];
  if (farm_id) {
    agents = await getAgents(farm_id);
  }
  
  // Fetch exchanges for filter dropdown
  const exchanges = await getExchanges();
  
  // Construct filter parameters
  const filterParams = {
    farm_id,
    agent_id,
    symbol,
    exchange,
    side,
    reconciliation_status: tab !== 'all' ? tab : reconciliation_status,
    limit: pageSize,
    offset
  };
  
  // Fetch positions based on filters
  const positions = await getPositions(filterParams);
  
  // Fetch reconciliation status
  const reconciliationStats = await getReconciliationStatus();
  
  // Fetch portfolio summary
  const portfolioSummary = await getPortfolioSummary(farm_id);
  
  // Fetch ElizaOS insights
  const elizaOSInsights = await getElizaOSInsights(farm_id);
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  return (
    <main className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/trading">Trading</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>Positions</BreadcrumbItem>
        </Breadcrumb>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="default" size="sm" asChild>
            <a href="/trading/orders/create">Create Order</a>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(portfolioSummary.total_value)}
            </div>
            <div className={`text-sm mt-1 ${portfolioSummary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(portfolioSummary.total_pnl)} ({formatPercentage(portfolioSummary.total_pnl_percentage)})
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Cost Basis:</div>
              <div className="text-right">{formatCurrency(portfolioSummary.total_cost)}</div>
              
              <div className="text-muted-foreground">Long Exposure:</div>
              <div className="text-right text-green-600">{formatCurrency(portfolioSummary.long_exposure)}</div>
              
              <div className="text-muted-foreground">Short Exposure:</div>
              <div className="text-right text-red-600">{formatCurrency(portfolioSummary.short_exposure)}</div>
              
              <div className="text-muted-foreground">Net Exposure:</div>
              <div className={`text-right ${portfolioSummary.net_exposure >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolioSummary.net_exposure)}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Reconciliation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted rounded-md p-3">
                <div className="text-sm text-muted-foreground">Positions Reconciled</div>
                <div className="text-xl font-bold">
                  {reconciliationStats.positions_reconciled} / {reconciliationStats.total_positions}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {Math.round((reconciliationStats.positions_reconciled / 
                    (reconciliationStats.total_positions || 1)) * 100)}% verified
                </div>
              </div>
              
              <div className="bg-muted rounded-md p-3">
                <div className="text-sm text-muted-foreground">Discrepancies</div>
                <div className="text-xl font-bold text-amber-600">
                  {reconciliationStats.positions_with_discrepancies}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Require attention
                </div>
              </div>
            </div>
            
            {reconciliationStats.positions_with_discrepancies > 0 && (
              <Alert variant="warning" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Position Discrepancies Detected</AlertTitle>
                <AlertDescription>
                  {reconciliationStats.positions_with_discrepancies} positions have discrepancies between local records and exchange data.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="text-sm text-muted-foreground mt-4">
              Last reconciliation: {reconciliationStats.last_reconciliation ? 
                new Date(reconciliationStats.last_reconciliation).toLocaleString() : 
                'Never'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <Brain className="h-4 w-4 mr-2" />
                ElizaOS Insights
              </CardTitle>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {elizaOSInsights.length > 0 ? (
              <div className="space-y-3">
                {elizaOSInsights.map((insight, index) => (
                  <div key={index} className="bg-muted rounded-md p-3">
                    <div className="font-medium">{insight.title}</div>
                    <div className="text-sm mt-1">{insight.content.substring(0, 100)}...</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(insight.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                <Button variant="link" size="sm" className="px-0">
                  View all insights
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Brain className="h-12 w-12 mx-auto opacity-20 mb-2" />
                <p className="text-muted-foreground">No insights available</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Generate Insights
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Positions</CardTitle>
                <CardDescription>
                  Manage and monitor your trading positions
                </CardDescription>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="default" size="sm" asChild>
                  <a href="/trading/positions/reconcile">Reconcile Positions</a>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>Filter Positions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <a href="/trading/positions">Reset All Filters</a>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted p-4 rounded-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Farm</label>
                  <Select
                    defaultValue={farm_id}
                    onValueChange={(value) => {
                      window.location.href = `/trading/positions?farm_id=${value}`;
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a farm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Farms</SelectItem>
                      {farms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent</label>
                  <Select
                    defaultValue={agent_id}
                    disabled={!farm_id || agents.length === 0}
                    onValueChange={(value) => {
                      window.location.href = `/trading/positions?farm_id=${farm_id}&agent_id=${value}`;
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={farm_id ? "Select an agent" : "Select a farm first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Agents</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g. BTCUSDT"
                      value={symbol || ''}
                      onChange={(e) => {
                        // This would be handled by client-side JS in a real implementation
                      }}
                    />
                    <Button variant="secondary" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Side</label>
                  <Select
                    defaultValue={side}
                    onValueChange={(value: any) => {
                      // This would be handled by client-side JS in a real implementation
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Sides" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sides</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Position Tabs */}
              <Tabs defaultValue={tab} className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all" asChild>
                    <a href={`/trading/positions?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=all`}>
                      All
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="verified" asChild>
                    <a href={`/trading/positions?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=verified`}>
                      Verified
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="discrepancy" asChild>
                    <a href={`/trading/positions?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=discrepancy`}>
                      Discrepancies
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="pending" asChild>
                    <a href={`/trading/positions?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=pending`}>
                      Pending
                    </a>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="pt-4">
                  <PositionsTable
                    positions={positions}
                    farmId={farm_id}
                    agentId={agent_id}
                    onRefresh={() => {
                      // This would be handled client-side in a real implementation
                    }}
                  />
                </TabsContent>
                {['verified', 'discrepancy', 'pending'].map(tabValue => (
                  <TabsContent key={tabValue} value={tabValue} className="pt-4">
                    <PositionsTable
                      positions={positions}
                      farmId={farm_id}
                      agentId={agent_id}
                      onRefresh={() => {
                        // This would be handled client-side in a real implementation
                      }}
                    />
                  </TabsContent>
                ))}
              </Tabs>
              
              {/* Pagination - Would be implemented client-side in a real app */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {positions.length} of {positions.length} positions
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageNumber <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={positions.length < pageSize}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
