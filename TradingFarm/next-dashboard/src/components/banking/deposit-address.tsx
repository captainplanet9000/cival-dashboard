'use client';

import * as React from 'react';
import Image from 'next/image';
import { QrCode, Copy, Share2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { DepositAddressInfo, VaultCurrency, getDepositAddress, getVaultCurrencies } from '@/services/vault-service';

export interface DepositAddressProps {
  userId: string;
  initialCurrencyId?: string;
  onClose?: () => void;
  className?: string;
}

export function DepositAddress({ 
  userId, 
  initialCurrencyId,
  onClose,
  className 
}: DepositAddressProps) {
  const [loading, setLoading] = React.useState(true);
  const [loadingAddress, setLoadingAddress] = React.useState(false);
  const [currencies, setCurrencies] = React.useState<VaultCurrency[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = React.useState<string>(initialCurrencyId || '');
  const [depositAddress, setDepositAddress] = React.useState<DepositAddressInfo | null>(null);
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();
  
  // Load available currencies
  React.useEffect(() => {
    async function fetchCurrencies() {
      setLoading(true);
      try {
        const result = await getVaultCurrencies();
        setCurrencies(result);
        
        // If no initial currency is selected and we have currencies, select the first one
        if (!initialCurrencyId && result.length > 0 && !selectedCurrencyId) {
          setSelectedCurrencyId(result[0].id);
        }
      } catch (error) {
        console.error('Error fetching currencies:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load available currencies"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchCurrencies();
  }, [initialCurrencyId, selectedCurrencyId, toast]);
  
  // Load deposit address when currency changes
  React.useEffect(() => {
    async function fetchDepositAddress() {
      if (!selectedCurrencyId) return;
      
      setLoadingAddress(true);
      try {
        const address = await getDepositAddress(userId, selectedCurrencyId);
        setDepositAddress(address);
      } catch (error) {
        console.error('Error fetching deposit address:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load deposit address"
        });
      } finally {
        setLoadingAddress(false);
      }
    }
    
    if (selectedCurrencyId) {
      fetchDepositAddress();
    }
  }, [selectedCurrencyId, userId, toast]);
  
  const handleCurrencyChange = (value: string) => {
    setSelectedCurrencyId(value);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard"
    });
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  const selectedCurrency = currencies.find(c => c.id === selectedCurrencyId);
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Deposit Funds</CardTitle>
        <CardDescription>
          Deposit funds into your account using one of the available methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="currency-select" className="text-sm font-medium">
              Select Currency
            </label>
            <Select
              value={selectedCurrencyId}
              onValueChange={handleCurrencyChange}
              disabled={loading || currencies.length === 0}
            >
              <SelectTrigger id="currency-select">
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    <div className="flex items-center">
                      {currency.icon_url && (
                        <span className="mr-2 w-5 h-5 relative">
                          <Image 
                            src={currency.icon_url} 
                            alt={currency.code} 
                            fill
                            style={{ objectFit: 'contain' }} 
                          />
                        </span>
                      )}
                      <span>{currency.name} ({currency.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {loadingAddress ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : depositAddress ? (
            <Tabs defaultValue="address" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="qr">QR Code</TabsTrigger>
              </TabsList>
              <TabsContent value="address" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Deposit Address</label>
                  <div className="flex">
                    <Input
                      readOnly
                      value={depositAddress.address}
                      className="flex-grow"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="ml-2"
                      onClick={() => copyToClipboard(depositAddress.address)}
                    >
                      {copied ? <Copy className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {depositAddress.memo && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Memo (Required)</label>
                    <div className="flex">
                      <Input
                        readOnly
                        value={depositAddress.memo}
                        className="flex-grow"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="ml-2"
                        onClick={() => copyToClipboard(depositAddress.memo || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <Alert variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Only send {selectedCurrency?.name} ({selectedCurrency?.code}) to this address.
                      {depositAddress.network && (
                        <> Use the {depositAddress.network} network only.</>
                      )}
                      {depositAddress.min_deposit && (
                        <> Minimum deposit: {selectedCurrency?.symbol}{depositAddress.min_deposit}</>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
              
              <TabsContent value="qr" className="pt-4">
                <div className="flex flex-col items-center justify-center space-y-4">
                  {depositAddress.qr_code ? (
                    <div className="bg-white p-4 rounded-lg">
                      <Image 
                        src={depositAddress.qr_code} 
                        alt="QR Code" 
                        width={200} 
                        height={200} 
                      />
                    </div>
                  ) : (
                    <div className="bg-muted/20 rounded-lg flex items-center justify-center" style={{ width: 200, height: 200 }}>
                      <QrCode className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="text-sm text-center max-w-xs">
                    Scan this QR code with your wallet app to copy the deposit address automatically
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {selectedCurrencyId ? 
                "No deposit address available for this currency." : 
                "Select a currency to view deposit address."
              }
            </div>
          )}
          
          {depositAddress?.fee_info && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Fee information:</p>
              <p>{depositAddress.fee_info}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="default" onClick={() => copyToClipboard(depositAddress?.address || '')}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </Button>
      </CardFooter>
    </Card>
  );
}
