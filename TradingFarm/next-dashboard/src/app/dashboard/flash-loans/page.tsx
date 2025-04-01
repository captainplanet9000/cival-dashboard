'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast, useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Form schema for Flash Loan
const flashLoanSchema = z.object({
  asset: z.string().min(1, "Asset is required"),
  amount: z.string().min(1, "Amount is required"),
  protocolId: z.string().min(1, "Protocol is required"),
  farmId: z.string().min(1, "Farm is required"),
  useStrategy: z.boolean().optional(),
  strategyId: z.string().optional()
});

type FlashLoan = {
  id: number;
  asset: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  createdAt: string;
  protocol: string;
  farm: string;
  profitLoss?: string;
  strategyUsed?: string;
};

export default function FlashLoansPage() {
  const [flashLoans, setFlashLoans] = useState<FlashLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [farms, setFarms] = useState<{id: string, name: string}[]>([]);
  const [protocols, setProtocols] = useState([
    { id: 'aave', name: 'Aave' },
    { id: 'compound', name: 'Compound' },
    { id: 'maker', name: 'MakerDAO' },
    { id: 'uniswap', name: 'Uniswap' }
  ]);
  const [strategies, setStrategies] = useState<{id: string, name: string}[]>([]);
  const [activeTab, setActiveTab] = useState('history');
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createBrowserClient();

  // Setup form 
  const form = useForm<z.infer<typeof flashLoanSchema>>({
    resolver: zodResolver(flashLoanSchema),
    defaultValues: {
      asset: '',
      amount: '',
      protocolId: '',
      farmId: '',
      useStrategy: false,
      strategyId: ''
    },
  });

  // Load flash loans history
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load farms
        const { data: farmsData, error: farmsError } = await supabase
          .from('farms')
          .select('id, name');
        
        if (farmsError) throw farmsError;
        setFarms(farmsData || []);
        
        // Load strategies
        const { data: strategiesData, error: strategiesError } = await supabase
          .from('strategies')
          .select('id, name');
        
        if (strategiesError) throw strategiesError;
        setStrategies(strategiesData || []);
        
        // For demo purposes, creating mock data since we don't have a real flash loans table yet
        setFlashLoans([
          {
            id: 1,
            asset: 'ETH',
            amount: '10.0',
            status: 'completed',
            transactionHash: '0x123...abc',
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            protocol: 'Aave',
            farm: 'Alpha Farm',
            profitLoss: '+0.05 ETH',
            strategyUsed: 'Arbitrage Strategy #1'
          },
          {
            id: 2,
            asset: 'USDC',
            amount: '5000',
            status: 'completed',
            transactionHash: '0x456...def',
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            protocol: 'Compound',
            farm: 'Beta Farm',
            profitLoss: '+120 USDC',
            strategyUsed: 'Liquidation Strategy #2'
          },
          {
            id: 3,
            asset: 'DAI',
            amount: '2500',
            status: 'failed',
            createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            protocol: 'MakerDAO',
            farm: 'Alpha Farm',
            strategyUsed: 'Market Making Strategy'
          },
          {
            id: 4,
            asset: 'WBTC',
            amount: '0.5',
            status: 'pending',
            createdAt: new Date().toISOString(),
            protocol: 'Uniswap',
            farm: 'Alpha Farm',
            strategyUsed: 'Cross-DEX Arbitrage'
          }
        ]);
      } catch (error) {
        console.error('Error loading flash loans data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load flash loans data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof flashLoanSchema>) => {
    try {
      toast({
        title: 'Processing Flash Loan',
        description: 'Your flash loan request is being processed...'
      });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo, just add to the local state
      const newFlashLoan: FlashLoan = {
        id: flashLoans.length + 1,
        asset: values.asset,
        amount: values.amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        protocol: protocols.find(p => p.id === values.protocolId)?.name || values.protocolId,
        farm: farms.find(f => f.id === values.farmId)?.name || values.farmId,
        strategyUsed: values.useStrategy && values.strategyId 
          ? strategies.find(s => s.id === values.strategyId)?.name || values.strategyId
          : undefined
      };
      
      setFlashLoans([newFlashLoan, ...flashLoans]);
      
      toast({
        title: 'Flash Loan Initiated',
        description: 'Your flash loan has been submitted successfully',
        variant: 'default'
      });
      
      // Reset form and switch to history tab
      form.reset();
      setActiveTab('history');
      
    } catch (error) {
      console.error('Error processing flash loan:', error);
      toast({
        title: 'Error',
        description: 'Failed to process flash loan request',
        variant: 'destructive'
      });
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: FlashLoan['status'] }) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Flash Loans</h1>
          <p className="text-muted-foreground">Create and manage flash loans for arbitrage and liquidations</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="new">New Flash Loan</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="new" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Flash Loan</CardTitle>
                <CardDescription>
                  Set up a new flash loan for arbitrage, liquidations, or other DeFi strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center p-4 mb-4 bg-blue-50 border border-blue-200 rounded-md">
                  <Info className="w-5 h-5 text-blue-500 mr-2" />
                  <p className="text-sm text-blue-700">
                    Flash loans allow you to borrow assets without collateral, as long as they are returned within the same transaction.
                  </p>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="asset"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select asset" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ETH">ETH</SelectItem>
                                <SelectItem value="USDC">USDC</SelectItem>
                                <SelectItem value="DAI">DAI</SelectItem>
                                <SelectItem value="WBTC">WBTC</SelectItem>
                                <SelectItem value="USDT">USDT</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter amount" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="protocolId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Protocol</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select protocol" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {protocols.map(protocol => (
                                  <SelectItem key={protocol.id} value={protocol.id}>
                                    {protocol.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="farmId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Farm</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select farm" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {farms.map(farm => (
                                  <SelectItem key={farm.id} value={farm.id}>
                                    {farm.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <FormField
                        control={form.control}
                        name="useStrategy"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Use Trading Strategy</FormLabel>
                              <FormDescription>
                                Apply an automated trading strategy for this flash loan
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch('useStrategy') && (
                        <FormField
                          control={form.control}
                          name="strategyId"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Strategy</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select strategy" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {strategies.map(strategy => (
                                    <SelectItem key={strategy.id} value={strategy.id}>
                                      {strategy.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full">
                      <Zap className="w-4 h-4 mr-2" /> Create Flash Loan
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Flash Loan History</CardTitle>
                <CardDescription>
                  View all your flash loan transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <span>Loading flash loans...</span>
                  </div>
                ) : flashLoans.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Farm</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>P/L</TableHead>
                        <TableHead>Strategy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flashLoans.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.asset}</TableCell>
                          <TableCell>{loan.amount}</TableCell>
                          <TableCell>{loan.protocol}</TableCell>
                          <TableCell>{loan.farm}</TableCell>
                          <TableCell>
                            <StatusBadge status={loan.status} />
                          </TableCell>
                          <TableCell>{new Date(loan.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className={loan.profitLoss?.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                            {loan.profitLoss || '-'}
                          </TableCell>
                          <TableCell>{loan.strategyUsed || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No flash loans found</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setActiveTab('new')}
                    >
                      Create your first flash loan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
