/**
 * Exchange Credential Manager Component
 * 
 * UI component for managing exchange API credentials securely
 * Part of the Trading Farm live trading infrastructure
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Types for available exchanges
interface ExchangeOption {
  id: string;
  name: string;
  logo: string;
  supportsTestnet: boolean;
}

// List of supported exchanges
const SUPPORTED_EXCHANGES: ExchangeOption[] = [
  {
    id: 'coinbase',
    name: 'Coinbase',
    logo: '/images/exchanges/coinbase.svg',
    supportsTestnet: true
  },
  {
    id: 'binance',
    name: 'Binance',
    logo: '/images/exchanges/binance.svg',
    supportsTestnet: true
  },
  {
    id: 'kraken',
    name: 'Kraken',
    logo: '/images/exchanges/kraken.svg',
    supportsTestnet: true
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    logo: '/images/exchanges/kucoin.svg',
    supportsTestnet: true
  }
];

// Credential display interface for UI
interface CredentialDisplay {
  id: string;
  exchange: string;
  exchangeName: string;
  name: string;
  isTestnet: boolean;
  farmId: string;
  farmName: string;
  createdAt: string;
  updatedAt: string;
}

// Create new credential form state
interface CredentialFormState {
  farmId: string;
  exchangeId: string;
  name: string;
  isTestnet: boolean;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

// Component props
interface ExchangeCredentialManagerProps {
  userId: string;
  farms: { id: string; name: string; }[];
  initialFarmId?: string;
}

export const ExchangeCredentialManager = ({ 
  userId, 
  farms, 
  initialFarmId 
}: ExchangeCredentialManagerProps) => {
  // State
  const [credentials, setCredentials] = useState<CredentialDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formState, setFormState] = useState<CredentialFormState>({
    farmId: initialFarmId || (farms.length > 0 ? farms[0].id : ''),
    exchangeId: SUPPORTED_EXCHANGES[0].id,
    name: '',
    isTestnet: true,
    apiKey: '',
    apiSecret: '',
    passphrase: ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ status: 'untested' | 'success' | 'failed'; message?: string }>({ status: 'untested' });

  const router = useRouter();
  
  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [userId]);
  
  // Toggle secret visibility
  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Fetch credentials from API
  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      // Get credentials from database (only metadata, not the actual secrets)
      const { data, error } = await supabase
        .from('exchange_credentials')
        .select(`
          id, 
          exchange_id, 
          name, 
          is_testnet, 
          farm_id, 
          created_at, 
          updated_at,
          farms(name)
        `)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      // Format for display
      const formattedData: CredentialDisplay[] = data.map(cred => {
        const exchange = SUPPORTED_EXCHANGES.find(e => e.id === cred.exchange_id) || { 
          id: cred.exchange_id, 
          name: cred.exchange_id.charAt(0).toUpperCase() + cred.exchange_id.slice(1),
          logo: '',
          supportsTestnet: true
        };
        
        return {
          id: cred.id,
          exchange: cred.exchange_id,
          exchangeName: exchange.name,
          name: cred.name,
          isTestnet: cred.is_testnet,
          farmId: cred.farm_id,
          farmName: cred.farms?.name || 'Unknown Farm',
          createdAt: new Date(cred.created_at).toLocaleString(),
          updatedAt: new Date(cred.updated_at).toLocaleString()
        };
      });
      
      setCredentials(formattedData);
    } catch (err) {
      console.error('Error fetching credentials:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load exchange credentials."
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form input changes
  const handleFormChange = (field: keyof CredentialFormState, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset connection test on form change
    setConnectionStatus({ status: 'untested' });
  };
  
  // Test the exchange connection
  const testConnection = async () => {
    try {
      setTestingConnection(true);
      
      // For implementation, we would call an API endpoint here
      // This is a placeholder for the actual API call
      const response = await fetch('/api/exchange/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exchangeId: formState.exchangeId,
          isTestnet: formState.isTestnet,
          credentials: {
            apiKey: formState.apiKey,
            apiSecret: formState.apiSecret,
            passphrase: formState.passphrase
          }
        })
      });
      
      // Parse the response
      const result = await response.json();
      
      if (response.ok) {
        setConnectionStatus({ 
          status: 'success', 
          message: `Successfully connected to ${getExchangeName(formState.exchangeId)}` 
        });
      } else {
        setConnectionStatus({ 
          status: 'failed', 
          message: result.error || 'Connection failed' 
        });
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setConnectionStatus({ 
        status: 'failed', 
        message: 'Connection test failed. Please check your credentials and try again.' 
      });
    } finally {
      setTestingConnection(false);
    }
  };
  
  // Save new credentials
  const saveCredentials = async () => {
    try {
      if (!formState.name || !formState.apiKey || !formState.apiSecret) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please fill in all required fields."
        });
        return;
      }
      
      const supabase = createBrowserClient();
      
      // Send to API
      const { data, error } = await supabase.functions.invoke('save-exchange-credentials', {
        body: {
          farmId: formState.farmId,
          exchangeId: formState.exchangeId,
          name: formState.name,
          isTestnet: formState.isTestnet,
          credentials: {
            apiKey: formState.apiKey,
            apiSecret: formState.apiSecret,
            passphrase: formState.passphrase
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Exchange credentials saved successfully."
      });
      
      // Close dialog and refresh data
      setShowAddDialog(false);
      fetchCredentials();
      
      // Reset form
      setFormState({
        farmId: initialFarmId || (farms.length > 0 ? farms[0].id : ''),
        exchangeId: SUPPORTED_EXCHANGES[0].id,
        name: '',
        isTestnet: true,
        apiKey: '',
        apiSecret: '',
        passphrase: ''
      });
      setConnectionStatus({ status: 'untested' });
      
    } catch (err) {
      console.error('Error saving credentials:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save exchange credentials."
      });
    }
  };
  
  // Delete credentials
  const deleteCredentials = async (id: string) => {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('exchange_credentials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Exchange credentials deleted successfully."
      });
      
      // Clear delete confirm state and refresh data
      setShowDeleteConfirm(null);
      fetchCredentials();
      
    } catch (err) {
      console.error('Error deleting credentials:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete exchange credentials."
      });
    }
  };
  
  // Helper to get exchange name from ID
  const getExchangeName = (id: string): string => {
    const exchange = SUPPORTED_EXCHANGES.find(e => e.id === id);
    return exchange ? exchange.name : id;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Exchange Credentials</h2>
          <p className="text-muted-foreground">
            Manage your exchange API credentials securely
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Exchange API
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary rounded-full border-t-transparent"></div>
        </div>
      ) : credentials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="rounded-full bg-muted p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Exchange APIs Configured</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              You need to add exchange API credentials to enable live trading.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Exchange API
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {credentials.map((cred) => (
            <Card key={cred.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>{cred.name}</CardTitle>
                  <CardDescription>
                    {cred.exchangeName} {cred.isTestnet ? '(Testnet)' : '(Live)'}
                  </CardDescription>
                </div>
                <div className={cn(
                  "rounded-full w-10 h-10 bg-muted flex items-center justify-center",
                  cred.isTestnet ? "bg-amber-100" : "bg-green-100"
                )}>
                  {cred.isTestnet ? (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Farm:</span>
                    <span>{cred.farmName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Added:</span>
                    <span>{cred.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated:</span>
                    <span>{cred.updatedAt}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-muted/50 flex justify-between">
                <Button variant="outline" size="sm" onClick={() => toggleSecretVisibility(cred.id)}>
                  {showSecrets[cred.id] ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Hide API
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      View API
                    </>
                  )}
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteConfirm(cred.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
              
              {/* API Key Reveal Section */}
              {showSecrets[cred.id] && (
                <div className="border-t p-4 bg-muted/20">
                  <div className="space-y-2">
                    <div>
                      <Label>API Key</Label>
                      <div className="p-2 mt-1 bg-muted rounded text-xs font-mono">
                        •••••••••••••••••• (Hidden for security)
                      </div>
                    </div>
                    <div>
                      <Label>API Secret</Label>
                      <div className="p-2 mt-1 bg-muted rounded text-xs font-mono">
                        •••••••••••••••••• (Hidden for security)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Exchange Credentials Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Exchange API Credentials</DialogTitle>
            <DialogDescription>
              Enter your exchange API credentials to enable live trading. 
              Your API key and secret will be encrypted before storage.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General Settings</TabsTrigger>
              <TabsTrigger value="api">API Credentials</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="farmId">Farm</Label>
                  <Select
                    value={formState.farmId}
                    onValueChange={(value) => handleFormChange('farmId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Farm" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map(farm => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="exchangeId">Exchange</Label>
                  <Select
                    value={formState.exchangeId}
                    onValueChange={(value) => handleFormChange('exchangeId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Exchange" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_EXCHANGES.map(exchange => (
                        <SelectItem key={exchange.id} value={exchange.id}>
                          {exchange.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="name">Credentials Name</Label>
                  <Input
                    id="name"
                    placeholder="My Coinbase Account"
                    value={formState.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    A descriptive name to identify these credentials
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isTestnet">Testnet Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use sandbox/testnet environment (recommended for testing)
                    </p>
                  </div>
                  <Switch
                    id="isTestnet"
                    checked={formState.isTestnet}
                    onCheckedChange={(checked) => handleFormChange('isTestnet', checked)}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="api" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="Enter your exchange API key"
                    value={formState.apiKey}
                    onChange={(e) => handleFormChange('apiKey', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    placeholder="Enter your exchange API secret"
                    value={formState.apiSecret}
                    onChange={(e) => handleFormChange('apiSecret', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="passphrase">
                    API Passphrase <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="passphrase"
                    type="password"
                    placeholder="Enter your exchange API passphrase if required"
                    value={formState.passphrase}
                    onChange={(e) => handleFormChange('passphrase', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Only required for some exchanges like Coinbase
                  </p>
                </div>
                
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={testConnection}
                    disabled={testingConnection || !formState.apiKey || !formState.apiSecret}
                    className="w-full"
                  >
                    {testingConnection ? (
                      <>
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-current rounded-full border-t-transparent"></div>
                        Testing Connection...
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                  
                  {connectionStatus.status !== 'untested' && (
                    <div className={cn(
                      "mt-3 p-3 rounded-md text-sm flex items-center",
                      connectionStatus.status === 'success' 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {connectionStatus.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      {connectionStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveCredentials} 
              disabled={!formState.name || !formState.apiKey || !formState.apiSecret}
            >
              Save Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete these exchange credentials? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteConfirm && deleteCredentials(showDeleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExchangeCredentialManager;
