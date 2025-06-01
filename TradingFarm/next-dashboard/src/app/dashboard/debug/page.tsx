'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Bug, CheckCircle, RefreshCw, Loader2, Wallet, List, RotateCcw, Settings, FileText, Zap } from 'lucide-react';
import { FarmFunding } from '@/components/farm/farm-funding';
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button';
import { WalletDetails } from '@/components/wallet/wallet-details';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useToast } from "@/components/ui/use-toast";

// Standalone error boundary component that doesn't rely on the existing one
const SimpleErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error('Captured in window error handler:', error);
      setHasError(true);
      setError(new Error(error.message));
      return true; // Prevent default error handling
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error?.message || 'An unexpected error occurred'}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

// Mock transaction type for debugging
type DebugTransaction = {
  id: string;
  type: 'fund' | 'withdraw';
  farmId: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: Date;
  error?: string;
};

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState("wallet");
  const [componentStatus, setComponentStatus] = useState<{[key: string]: 'loading' | 'success' | 'error'}>({
    wallet: 'loading',
    farmFunding: 'loading'
  });
  const [debugTransactions, setDebugTransactions] = useState<DebugTransaction[]>([]);
  const [mockLatencyMs, setMockLatencyMs] = useState(1000);
  const [showVerboseLogs, setShowVerboseLogs] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  
  // Mock farm data for testing
  const mockFarms = [
    { id: "farm-1", name: "Corn Production Farm", allocation: "5,000 USDT" },
    { id: "farm-2", name: "Wheat Futures Farm", allocation: "10,000 USDT" },
    { id: "farm-3", name: "Automated Trading Farm", allocation: "25,000 USDT" }
  ];
  
  useEffect(() => {
    // Simulate checking component loads
    const checkComponents = async () => {
      try {
        setComponentStatus(prev => ({ ...prev, wallet: 'loading' }));
        // Wait a bit to simulate checking
        await new Promise(r => setTimeout(r, mockLatencyMs));
        setComponentStatus(prev => ({ ...prev, wallet: 'success' }));
      } catch (error) {
        setComponentStatus(prev => ({ ...prev, wallet: 'error' }));
      }
      
      try {
        setComponentStatus(prev => ({ ...prev, farmFunding: 'loading' }));
        await new Promise(r => setTimeout(r, mockLatencyMs * 1.5));
        setComponentStatus(prev => ({ ...prev, farmFunding: 'success' }));
      } catch (error) {
        setComponentStatus(prev => ({ ...prev, farmFunding: 'error' }));
      }
    };
    
    checkComponents();
  }, [mockLatencyMs]);

  const StatusBadge = ({ status }: { status: 'loading' | 'success' | 'error' }) => {
    return (
      <Badge variant={
        status === 'success' ? 'default' : 
        status === 'error' ? 'destructive' : 
        'outline'
      }>
        {status === 'loading' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
        {status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Mock function to simulate a transaction
  const simulateTransaction = (type: 'fund' | 'withdraw', farmId: string, amount: string) => {
    // Create a new transaction
    const newTx: DebugTransaction = {
      id: `tx-${Date.now()}`,
      type,
      farmId,
      amount,
      status: 'pending',
      timestamp: new Date()
    };
    
    setDebugTransactions(prev => [newTx, ...prev]);
    
    // Simulate transaction processing
    setTimeout(() => {
      setDebugTransactions(prev => {
        return prev.map(tx => {
          if (tx.id === newTx.id) {
            // Randomly succeed or fail for testing purposes
            const success = Math.random() > 0.3;
            return {
              ...tx,
              status: success ? 'success' : 'failed',
              error: success ? undefined : 'Simulated transaction failure for testing'
            };
          }
          return tx;
        });
      });
      
      toast({
        title: `Test ${type} transaction ${Math.random() > 0.3 ? 'completed' : 'failed'}`,
        description: `Farm: ${mockFarms.find(f => f.id === farmId)?.name}, Amount: ${amount}`,
        variant: Math.random() > 0.3 ? 'default' : 'destructive',
      });
    }, mockLatencyMs * 2);
  };

  // Debug control to simulate an error
  const simulateError = (component: 'wallet' | 'farmFunding') => {
    setComponentStatus(prev => ({ ...prev, [component]: 'error' }));
    toast({
      title: "Error Simulation",
      description: `Simulated error for ${component} component`,
      variant: "destructive",
    });
  };

  // Reset components status
  const resetComponentStatus = () => {
    setComponentStatus({
      wallet: 'loading',
      farmFunding: 'loading'
    });
    
    setTimeout(() => {
      setComponentStatus({
        wallet: 'success',
        farmFunding: 'success'
      });
    }, mockLatencyMs);
    
    toast({
      title: "Components Reset",
      description: "All components have been reset to their initial state"
    });
  };

  // Clear transaction history
  const clearTransactions = () => {
    setDebugTransactions([]);
    toast({
      title: "Transactions Cleared",
      description: "Debug transaction history has been cleared"
    });
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Debug Page</h1>
        <p className="text-muted-foreground">
          Testing environment for wallet integration and farm funding functionality
        </p>
      </div>
      
      <SimpleErrorBoundary>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bug className="mr-2 h-5 w-5" />
              Debug Controls
            </CardTitle>
            <CardDescription>
              Test and troubleshoot wallet and farm funding components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="components" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="actions">Test Actions</TabsTrigger>
                <TabsTrigger value="settings">Debug Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="components" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-md border p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Wallet Component</h3>
                      <StatusBadge status={componentStatus.wallet} />
                    </div>
                    <div className="space-y-2">
                      <WalletConnectButton />
                      {isConnected && <WalletDetails />}
                    </div>
                  </div>
                  
                  <div className="rounded-md border p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Debug Actions</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => simulateError('wallet')}
                        className="h-8"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Simulate Error
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {isConnected && (
                        <Button 
                          variant="outline" 
                          onClick={() => disconnect()}
                          className="w-full"
                        >
                          Force Disconnect
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={resetComponentStatus}
                        className="w-full"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reset Components
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Farm Funding Component</h3>
                    <StatusBadge status={componentStatus.farmFunding} />
                  </div>
                  <FarmFunding />
                </div>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4 mt-4">
                <div className="rounded-md border p-4">
                  <h3 className="font-medium mb-3">Test Transactions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-farm">Select Farm</Label>
                      <select 
                        id="test-farm"
                        className="w-full p-2 border rounded-md bg-background"
                      >
                        {mockFarms.map(farm => (
                          <option key={farm.id} value={farm.id}>{farm.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="test-amount">Amount</Label>
                      <Input 
                        id="test-amount"
                        type="text" 
                        placeholder="0.5 ETH"
                        defaultValue="0.5 ETH"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => simulateTransaction('fund', mockFarms[0].id, '0.5 ETH')}
                      className="flex-1"
                    >
                      Test Fund
                    </Button>
                    <Button 
                      onClick={() => simulateTransaction('withdraw', mockFarms[0].id, '0.25 ETH')}
                      variant="outline"
                      className="flex-1"
                    >
                      Test Withdraw
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Transaction Log</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearTransactions}
                      >
                        Clear Log
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {debugTransactions.length > 0 ? (
                      <div className="space-y-3">
                        {debugTransactions.map(tx => (
                          <div key={tx.id} className="text-sm border rounded-md p-3">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">{tx.type === 'fund' ? 'Test Fund' : 'Test Withdraw'}</span>
                              <Badge variant={
                                tx.status === 'success' ? 'default' : 
                                tx.status === 'pending' ? 'outline' : 
                                'destructive'
                              }>
                                {tx.status}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                              <span>Farm:</span>
                              <span>{mockFarms.find(f => f.id === tx.farmId)?.name}</span>
                              <span>Amount:</span>
                              <span>{tx.amount}</span>
                              <span>Time:</span>
                              <span>{tx.timestamp.toLocaleTimeString()}</span>
                              {tx.error && (
                                <>
                                  <span>Error:</span>
                                  <span className="text-destructive">{tx.error}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No transactions recorded</p>
                        <p className="text-sm">Use the test actions above to generate transaction logs</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="rounded-md border p-4 space-y-4">
                  <div>
                    <Label htmlFor="mock-latency">Mock Latency (ms)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        id="mock-latency"
                        type="number" 
                        value={mockLatencyMs}
                        onChange={(e) => setMockLatencyMs(Number(e.target.value))}
                      />
                      <Button variant="outline" onClick={() => setMockLatencyMs(1000)}>
                        Reset
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Simulates network/processing delay for testing loading states
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="verbose-logs"
                      checked={showVerboseLogs}
                      onChange={(e) => setShowVerboseLogs(e.target.checked)}
                      className="rounded border-muted"
                    />
                    <Label htmlFor="verbose-logs">Show Verbose Logs</Label>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        localStorage.clear();
                        toast({
                          title: "Local Storage Cleared",
                          description: "All local storage data has been removed"
                        });
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Clear All Local Storage
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </SimpleErrorBoundary>
      
      {showVerboseLogs && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Debug Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted p-4 font-mono text-xs overflow-auto max-h-48">
              <div className="text-success">● Wallet component connected</div>
              <div className="text-warning">⚠ Farm funding mock data loaded</div>
              <div className="text-muted-foreground">→ Component status: {JSON.stringify(componentStatus)}</div>
              <div className="text-muted-foreground">→ Connected address: {address || 'none'}</div>
              <div className="text-muted-foreground">→ Transaction count: {debugTransactions.length}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
