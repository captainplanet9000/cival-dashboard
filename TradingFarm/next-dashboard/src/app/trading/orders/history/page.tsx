import React from 'react';
import { Metadata } from 'next';
import { createServerClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Filter, Download, Search, ChevronDown } from 'lucide-react';
import OrderHistoryTable from '@/components/orders/order-history-table';
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
import { DateTimePicker } from '@/components/ui/date-time-picker';

export const metadata: Metadata = {
  title: 'Order History | Trading Farm',
  description: 'View and analyze your trading orders',
};

// Function to fetch orders with optional filtering
async function getOrders(params: {
  farm_id?: string;
  agent_id?: string;
  symbol?: string;
  status?: string;
  order_type?: string;
  side?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createServerClient();
  
  // Start building the query
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (params.farm_id) query = query.eq('farm_id', params.farm_id);
  if (params.agent_id) query = query.eq('agent_id', params.agent_id);
  if (params.symbol) query = query.eq('symbol', params.symbol);
  if (params.status) query = query.eq('status', params.status);
  if (params.order_type) query = query.eq('order_type', params.order_type);
  if (params.side) query = query.eq('side', params.side);
  if (params.start_date) query = query.gte('created_at', params.start_date);
  if (params.end_date) query = query.lte('created_at', params.end_date);
  
  // Apply pagination
  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching orders:', error);
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

// Function to fetch order performance metrics
async function getOrderPerformanceMetrics(params: {
  farm_id?: string;
  agent_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  const supabase = await createServerClient();
  
  // This would call a database function in a real implementation
  const { data, error } = await supabase.rpc('get_order_performance_metrics', {
    p_farm_id: params.farm_id,
    p_agent_id: params.agent_id,
    p_start_date: params.start_date,
    p_end_date: params.end_date
  });
  
  if (error) {
    console.error('Error fetching order performance metrics:', error);
    return {
      total_orders: 0,
      filled_orders: 0,
      canceled_orders: 0,
      rejected_orders: 0,
      avg_execution_time: 0,
      avg_slippage: 0,
      avg_market_impact: 0,
      win_rate: 0,
      profit_loss: 0
    };
  }
  
  return data || {
    total_orders: 0,
    filled_orders: 0,
    canceled_orders: 0,
    rejected_orders: 0,
    avg_execution_time: 0,
    avg_slippage: 0,
    avg_market_impact: 0,
    win_rate: 0,
    profit_loss: 0
  };
}

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: {
    farm_id?: string;
    agent_id?: string;
    tab?: string;
    symbol?: string;
    status?: string;
    order_type?: string;
    side?: string;
    start_date?: string;
    end_date?: string;
    page?: string;
  };
}) {
  const {
    farm_id,
    agent_id,
    tab = 'all',
    symbol,
    status,
    order_type,
    side,
    start_date,
    end_date,
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
  
  // Construct filter parameters
  const filterParams = {
    farm_id,
    agent_id,
    symbol,
    status: tab !== 'all' ? tab : status, // If tab is specified, use that as status filter
    order_type,
    side,
    start_date,
    end_date,
    limit: pageSize,
    offset
  };
  
  // Fetch orders based on filters
  const orders = await getOrders(filterParams);
  
  // Fetch order performance metrics
  const performanceMetrics = await getOrderPerformanceMetrics({
    farm_id,
    agent_id,
    start_date,
    end_date
  });
  
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
          <BreadcrumbItem>
            <BreadcrumbLink href="/trading/orders">Orders</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>Order History</BreadcrumbItem>
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
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Order History</CardTitle>
                <CardDescription>
                  View and analyze your trading orders
                </CardDescription>
              </div>
              
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>Filter Orders</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <a href="/trading/orders/history">Reset All Filters</a>
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
                      window.location.href = `/trading/orders/history?farm_id=${value}`;
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
                      window.location.href = `/trading/orders/history?farm_id=${farm_id}&agent_id=${value}`;
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
                  <label className="text-sm font-medium">Order Type</label>
                  <Select
                    defaultValue={order_type}
                    onValueChange={(value) => {
                      // This would be handled by client-side JS in a real implementation
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                      <SelectItem value="stop_limit">Stop Limit</SelectItem>
                      <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
                      <SelectItem value="oco">OCO</SelectItem>
                      <SelectItem value="bracket">Bracket</SelectItem>
                      <SelectItem value="iceberg">Iceberg</SelectItem>
                      <SelectItem value="twap">TWAP</SelectItem>
                      <SelectItem value="vwap">VWAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Order Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                  <div className="text-2xl font-bold">{performanceMetrics.total_orders}</div>
                </div>
                
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Fill Rate</div>
                  <div className="text-2xl font-bold">
                    {performanceMetrics.total_orders > 0
                      ? ((performanceMetrics.filled_orders / performanceMetrics.total_orders) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
                
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Avg. Execution Time</div>
                  <div className="text-2xl font-bold">{performanceMetrics.avg_execution_time.toFixed(1)}s</div>
                </div>
                
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Avg. Slippage</div>
                  <div className={`text-2xl font-bold ${performanceMetrics.avg_slippage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {performanceMetrics.avg_slippage > 0 ? '+' : ''}{performanceMetrics.avg_slippage.toFixed(2)}%
                  </div>
                </div>
                
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">P&L</div>
                  <div className={`text-2xl font-bold ${performanceMetrics.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performanceMetrics.profit_loss >= 0 ? '+' : ''}{performanceMetrics.profit_loss.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              {/* Order Tabs */}
              <Tabs defaultValue={tab} className="w-full">
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger value="all" asChild>
                    <a href={`/trading/orders/history?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=all`}>
                      All
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="new" asChild>
                    <a href={`/trading/orders/history?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=new`}>
                      New
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="open" asChild>
                    <a href={`/trading/orders/history?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=open`}>
                      Open
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="filled" asChild>
                    <a href={`/trading/orders/history?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=filled`}>
                      Filled
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="canceled" asChild>
                    <a href={`/trading/orders/history?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=canceled`}>
                      Canceled
                    </a>
                  </TabsTrigger>
                  <TabsTrigger value="rejected" asChild>
                    <a href={`/trading/orders/history?farm_id=${farm_id || ''}&agent_id=${agent_id || ''}&tab=rejected`}>
                      Rejected
                    </a>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="pt-4">
                  <OrderHistoryTable
                    orders={orders}
                    farmId={farm_id}
                    agentId={agent_id}
                    onRefresh={() => {
                      // This would be handled client-side in a real implementation
                    }}
                  />
                </TabsContent>
                <TabsContent value="new" className="pt-4">
                  <OrderHistoryTable
                    orders={orders}
                    farmId={farm_id}
                    agentId={agent_id}
                    onRefresh={() => {
                      // This would be handled client-side in a real implementation
                    }}
                  />
                </TabsContent>
                <TabsContent value="open" className="pt-4">
                  <OrderHistoryTable
                    orders={orders}
                    farmId={farm_id}
                    agentId={agent_id}
                    onRefresh={() => {
                      // This would be handled client-side in a real implementation
                    }}
                  />
                </TabsContent>
                <TabsContent value="filled" className="pt-4">
                  <OrderHistoryTable
                    orders={orders}
                    farmId={farm_id}
                    agentId={agent_id}
                    onRefresh={() => {
                      // This would be handled client-side in a real implementation
                    }}
                  />
                </TabsContent>
                <TabsContent value="canceled" className="pt-4">
                  <OrderHistoryTable
                    orders={orders}
                    farmId={farm_id}
                    agentId={agent_id}
                    onRefresh={() => {
                      // This would be handled client-side in a real implementation
                    }}
                  />
                </TabsContent>
                <TabsContent value="rejected" className="pt-4">
                  <OrderHistoryTable
                    orders={orders}
                    farmId={farm_id}
                    agentId={agent_id}
                    onRefresh={() => {
                      // This would be handled client-side in a real implementation
                    }}
                  />
                </TabsContent>
              </Tabs>
              
              {/* Pagination - Would be implemented client-side in a real app */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {orders.length} of {performanceMetrics.total_orders} orders
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
                    disabled={orders.length < pageSize}
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
