'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Code, FileDown, FileUp, Eye, Play, Pause, Copy, Trash, ArrowUpDown, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

interface Strategy {
  id: number;
  name: string;
  category: string;
  status: 'active' | 'paused' | 'testing' | 'failed';
  type: string;
  performance: number;
  created_at: string;
}

export default function StrategyLibraryPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');
  const [strategies, setStrategies] = React.useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  React.useEffect(() => {
    async function fetchStrategies() {
      setIsLoading(true);
      setConnectionError(null);
      
      try {
        // Attempt to fetch strategies from the trading_strategies table
        const { data, error } = await supabase
          .from('trading_strategies')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching trading strategies:', error);
          
          // Check if this is a timeout error
          if (error.message?.includes('timeout') || error.message?.includes('deadline exceeded')) {
            throw new Error('Connection to Supabase timed out. Using demo data instead.');
          } else {
            throw error;
          }
        }
        
        if (data && data.length > 0) {
          setStrategies(data as Strategy[]);
          setConnectionError(null);
          toast({
            title: "Data loaded successfully",
            description: `Loaded ${data.length} strategies from database`,
          });
        } else {
          // No strategies found, set demo data with notification
          setDemoData();
          setConnectionError("No strategies found in the database. Showing demo data instead.");
        }
      } catch (error: any) {
        console.error('Failed to fetch trading strategies:', error);
        
        const errorMessage = error.message || 'Unknown error occurred';
        setConnectionError(errorMessage);
        
        // Set demo data
        setDemoData();
        
        // Attempt retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, RETRY_DELAY);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchStrategies();
  }, [supabase, retryCount, toast]);

  const setDemoData = () => {
    // Set some dummy data if we can't connect to the actual database
    setStrategies([
      { id: 1, name: 'EMA Crossover', category: 'momentum', status: 'active', type: 'Technical', performance: 12.5, created_at: new Date().toISOString() },
      { id: 2, name: 'RSI Reversal', category: 'reversal', status: 'active', type: 'Technical', performance: 8.2, created_at: new Date().toISOString() },
      { id: 3, name: 'Bollinger Squeeze', category: 'volatility', status: 'paused', type: 'Technical', performance: 15.7, created_at: new Date().toISOString() },
      { id: 4, name: 'News Sentiment', category: 'fundamental', status: 'active', type: 'AI', performance: 9.1, created_at: new Date().toISOString() },
      { id: 5, name: 'Volume Profile', category: 'order-flow', status: 'testing', type: 'Technical', performance: 7.3, created_at: new Date().toISOString() },
    ]);
  };

  const handleRetryConnection = () => {
    setRetryCount(0);
  };

  // Filter strategies based on search query and active tab
  const filteredStrategies = strategies.filter(strategy => {
    const matchesSearch = strategy.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || strategy.category === activeTab;
    return matchesSearch && matchesTab;
  });

  // Status badge color mappings
  const statusColors = {
    active: "bg-green-500",
    paused: "bg-amber-500",
    testing: "bg-blue-500",
    failed: "bg-red-500"
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Strategy Library</h1>
        <p className="text-muted-foreground">
          Browse, manage, and deploy trading strategies
        </p>
      </div>

      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{connectionError}</span>
            <Button variant="outline" size="sm" onClick={handleRetryConnection}>Retry Connection</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search strategies..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button asChild>
          <a href="/dashboard/brain/builder">
            <Plus className="mr-2 h-4 w-4" />
            New Strategy
          </a>
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Strategy</DialogTitle>
              <DialogDescription>
                Upload a strategy file or paste strategy code
              </DialogDescription>
            </DialogHeader>
            {/* Import strategy form would go here */}
            <div className="grid gap-4 py-4">
              <Button>
                <FileUp className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <div className="relative">
                <Code className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Paste strategy code here..." className="pl-8 h-24" />
              </div>
              <Button>Import Strategy</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Strategies</TabsTrigger>
          <TabsTrigger value="momentum">Momentum</TabsTrigger>
          <TabsTrigger value="reversal">Reversal</TabsTrigger>
          <TabsTrigger value="volatility">Volatility</TabsTrigger>
          <TabsTrigger value="fundamental">Fundamental</TabsTrigger>
          <TabsTrigger value="order-flow">Order Flow</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Strategies</CardTitle>
              <CardDescription>Browse and manage your trading strategy library</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted rounded w-full"></div>
                    ))}
                  </div>
                </div>
              ) : filteredStrategies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center">
                          Name
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStrategies.map((strategy) => (
                      <TableRow key={strategy.id}>
                        <TableCell className="font-medium">{strategy.name}</TableCell>
                        <TableCell>{strategy.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[strategy.status]}>
                            {strategy.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={strategy.performance > 0 ? "text-green-500" : "text-red-500"}>
                            {strategy.performance > 0 ? '+' : ''}{strategy.performance}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              {strategy.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No strategies found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
