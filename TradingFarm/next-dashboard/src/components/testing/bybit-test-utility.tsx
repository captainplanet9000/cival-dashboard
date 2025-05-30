'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { bybitTradingService } from '@/services/bybit-trading-service';

export function BybitTestUtility() {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [loading, setLoading] = useState<{
    connection: boolean;
    account: boolean;
    instruments: boolean;
  }>({
    connection: false,
    account: false,
    instruments: false,
  });
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test API connectivity
  const testApiConnection = async () => {
    setLoading(prev => ({ ...prev, connection: true }));
    setError(null);
    
    try {
      if (!selectedExchangeId) {
        throw new Error('Please select an exchange first');
      }
      
      // Get exchange credentials
      const credentialsResponse = await bybitTradingService.getCredentials(selectedExchangeId);
      
      if (!credentialsResponse.success || !credentialsResponse.data) {
        throw new Error('Failed to get exchange credentials');
      }
      
      // Simple test request - get instrument info
      const response = await bybitTradingService.getInstrumentInfo(
        credentialsResponse.data,
        'linear',
        'BTCUSDT'
      );
      
      setApiConnected(response.success);
      
      toast({
        title: response.success ? 'API Connection Successful' : 'API Connection Failed',
        description: response.success 
          ? 'Successfully connected to Bybit API' 
          : `Failed to connect: ${response.error}`,
        variant: response.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('API connection test error:', error);
      setApiConnected(false);
      setError(error.message || 'Failed to test API connection');
      
      toast({
        title: 'API Connection Failed',
        description: error.message || 'Failed to test API connection',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, connection: false }));
    }
  };

  // Fetch account information
  const fetchAccountInfo = async () => {
    setLoading(prev => ({ ...prev, account: true }));
    setError(null);
    
    try {
      if (!selectedExchangeId) {
        throw new Error('Please select an exchange first');
      }
      
      // Get exchange credentials
      const credentialsResponse = await bybitTradingService.getCredentials(selectedExchangeId);
      
      if (!credentialsResponse.success || !credentialsResponse.data) {
        throw new Error('Failed to get exchange credentials');
      }
      
      // Get account info
      const response = await bybitTradingService.getAccountInfo(credentialsResponse.data);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch account information');
      }
      
      setAccountInfo(response.data);
      
      toast({
        title: 'Account Information Retrieved',
        description: 'Successfully fetched account details',
      });
    } catch (error: any) {
      console.error('Fetch account info error:', error);
      setError(error.message || 'Failed to fetch account information');
      
      toast({
        title: 'Account Information Failed',
        description: error.message || 'Failed to fetch account information',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, account: false }));
    }
  };

  // Fetch available trading pairs
  const fetchInstruments = async () => {
    setLoading(prev => ({ ...prev, instruments: true }));
    setError(null);
    
    try {
      if (!selectedExchangeId) {
        throw new Error('Please select an exchange first');
      }
      
      // Get exchange credentials
      const credentialsResponse = await bybitTradingService.getCredentials(selectedExchangeId);
      
      if (!credentialsResponse.success || !credentialsResponse.data) {
        throw new Error('Failed to get exchange credentials');
      }
      
      // Get instrument info
      const response = await bybitTradingService.getInstrumentInfo(
        credentialsResponse.data,
        'linear'
      );
      
      if (!response.success || !response.data || !response.data.list) {
        throw new Error('Failed to fetch instruments');
      }
      
      setInstruments(response.data.list.slice(0, 20)); // Limit to 20 instruments for display
      
      toast({
        title: 'Instruments Retrieved',
        description: `Successfully fetched ${response.data.list.length} instruments`,
      });
    } catch (error: any) {
      console.error('Fetch instruments error:', error);
      setError(error.message || 'Failed to fetch instruments');
      
      toast({
        title: 'Instruments Fetch Failed',
        description: error.message || 'Failed to fetch instruments',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, instruments: false }));
    }
  };

  // Fetch available exchanges
  const fetchExchanges = async () => {
    setLoadingExchanges(true);
    setError(null);
    
    try {
      const response = await fetch('/api/exchange/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchanges');
      }
      
      const data = await response.json();
      
      // Filter only testnet exchanges for testing
      const testnetExchanges = data.exchanges.filter((e: any) => e.testnet === true);
      
      setExchanges(testnetExchanges);
      
      // Auto-select first testnet exchange if available
      if (testnetExchanges.length > 0) {
        setSelectedExchangeId(testnetExchanges[0].id);
      }
      
      toast({
        title: 'Exchanges Retrieved',
        description: `Found ${testnetExchanges.length} testnet exchanges`,
      });
    } catch (error: any) {
      console.error('Fetch exchanges error:', error);
      setError(error.message || 'Failed to fetch exchanges');
      
      toast({
        title: 'Exchanges Fetch Failed',
        description: error.message || 'Failed to fetch exchanges',
        variant: 'destructive',
      });
    } finally {
      setLoadingExchanges(false);
    }
  };

  // Handle exchange selection
  const handleExchangeChange = (exchangeId: string) => {
    setSelectedExchangeId(exchangeId);
    // Reset state when exchange changes
    setApiConnected(null);
    setAccountInfo(null);
    setInstruments([]);
    setError(null);
  };

  // Initialize component
  React.useEffect(() => {
    fetchExchanges();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bybit API Test Utility</CardTitle>
        <CardDescription>
          Verify Bybit API connectivity and functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Exchange Selection */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Test Environment</h3>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Testnet Exchange</label>
                {loadingExchanges ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading exchanges...</span>
                  </div>
                ) : exchanges.length > 0 ? (
                  <select 
                    className="w-full border rounded-md p-2"
                    value={selectedExchangeId}
                    onChange={(e) => handleExchangeChange(e.target.value)}
                  >
                    <option value="">Select an exchange</option>
                    {exchanges.map((exchange) => (
                      <option key={exchange.id} value={exchange.id}>
                        {exchange.name} ({exchange.exchange_type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Testnet Exchanges Found</AlertTitle>
                    <AlertDescription>
                      Add a testnet exchange in the Exchange Management section first.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
          
          <Separator />

          {/* Test Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test API Functionality</h3>
            
            <div className="grid gap-4 md:grid-cols-3">
              <Button 
                onClick={testApiConnection}
                disabled={loading.connection || !selectedExchangeId}
                className="w-full"
              >
                {loading.connection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection
                  </>
                ) : (
                  'Test API Connection'
                )}
              </Button>
              
              <Button 
                onClick={fetchAccountInfo}
                disabled={loading.account || !selectedExchangeId}
                className="w-full"
              >
                {loading.account ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching Account
                  </>
                ) : (
                  'Fetch Account Info'
                )}
              </Button>
              
              <Button 
                onClick={fetchInstruments}
                disabled={loading.instruments || !selectedExchangeId}
                className="w-full"
              >
                {loading.instruments ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fetching Instruments
                  </>
                ) : (
                  'Fetch Trading Pairs'
                )}
              </Button>
            </div>
            
            {/* Status Display */}
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">API Status:</h4>
              <div className="flex items-center gap-2">
                {apiConnected === null ? (
                  <Badge variant="outline" className="bg-gray-100">
                    Not Tested
                  </Badge>
                ) : apiConnected ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Results Display */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Results</h3>
            
            <Tabs defaultValue="account">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Account Info</TabsTrigger>
                <TabsTrigger value="instruments">Instruments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="account">
                {accountInfo ? (
                  <div className="rounded-md border p-4">
                    <h4 className="text-sm font-medium mb-2">Account Balance:</h4>
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Equity:</span>
                        <span className="font-medium">${parseFloat(accountInfo.totalEquity || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Available Balance:</span>
                        <span className="font-medium">${parseFloat(accountInfo.totalAvailableBalance || '0').toFixed(2)}</span>
                      </div>
                      
                      {accountInfo.coin && (
                        <>
                          <h4 className="text-sm font-medium mt-4 mb-2">Assets:</h4>
                          <div className="space-y-2">
                            {accountInfo.coin.map((coin: any, index: number) => (
                              <div key={index} className="flex justify-between">
                                <span className="text-sm">{coin.coin}:</span>
                                <span className="font-medium">
                                  {parseFloat(coin.walletBalance).toFixed(6)} (${parseFloat(coin.usdValue).toFixed(2)})
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Data</AlertTitle>
                    <AlertDescription>
                      Click "Fetch Account Info" to retrieve account details
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="instruments">
                {instruments.length > 0 ? (
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-left font-medium">Symbol</th>
                          <th className="py-2 px-4 text-right font-medium">Base Coin</th>
                          <th className="py-2 px-4 text-right font-medium">Quote Coin</th>
                          <th className="py-2 px-4 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {instruments.map((instrument: any, index: number) => (
                          <tr key={index} className={index < instruments.length - 1 ? 'border-b' : ''}>
                            <td className="py-2 px-4 font-medium">{instrument.symbol}</td>
                            <td className="py-2 px-4 text-right">{instrument.baseCoin}</td>
                            <td className="py-2 px-4 text-right">{instrument.quoteCoin}</td>
                            <td className="py-2 px-4 text-right">
                              <Badge 
                                variant="outline" 
                                className={instrument.status === 'Trading' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                              >
                                {instrument.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Data</AlertTitle>
                    <AlertDescription>
                      Click "Fetch Trading Pairs" to retrieve instrument details
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          Testing with Bybit Testnet API. No real assets are at risk.
        </div>
      </CardFooter>
    </Card>
  );
}
