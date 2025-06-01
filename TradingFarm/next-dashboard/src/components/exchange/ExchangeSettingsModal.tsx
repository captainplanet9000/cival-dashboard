'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircleIcon, RefreshCw, Trash2, Key, ShieldAlert, Shield, Settings, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExchangeCredential {
  id: number;
  exchange: string;
  name: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
  passphrase?: string;
  testnet: boolean;
  is_active: boolean;
  last_used?: string;
  last_failed?: string;
  created_at: string;
  updated_at: string;
}

interface ExchangeSettingsModalProps {
  credential: ExchangeCredential;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ExchangeSettingsModal({ credential, isOpen, onClose, onUpdate }: ExchangeSettingsModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  
  // Settings state
  const [settings, setSettings] = useState({
    name: '',
    isActive: true,
    testnet: false,
  });
  
  useEffect(() => {
    if (isOpen && credential) {
      setSettings({
        name: credential.name || credential.exchange,
        isActive: credential.is_active,
        testnet: credential.testnet,
      });
      loadExchangeData();
    }
  }, [isOpen, credential]);
  
  async function loadExchangeData() {
    if (!credential) return;
    
    try {
      // Fetch balances
      const balanceResponse = await fetch(`/api/exchange/balances?exchangeId=${credential.id}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalances(balanceData.balances || []);
      }
      
      // Get permissions
      const permissionResponse = await fetch(`/api/exchange/permissions?exchangeId=${credential.id}`);
      if (permissionResponse.ok) {
        const permissionData = await permissionResponse.json();
        setPermissions(permissionData.permissions || []);
      }
    } catch (error) {
      console.error('Error loading exchange data:', error);
    }
  }
  
  async function handleTestConnection() {
    setIsTestingConnection(true);
    setError(null);
    
    try {
      const response = await fetch('/api/exchange/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeId: credential.id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test connection');
      }
      
      toast({
        title: 'Connection Successful',
        description: 'Your exchange credentials are valid and working correctly.',
      });
      
      // Refresh balances
      loadExchangeData();
    } catch (err: any) {
      setError(err.message || 'Failed to test connection');
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err.message || 'An error occurred while testing the connection',
      });
    } finally {
      setIsTestingConnection(false);
    }
  }
  
  async function handleUpdateSettings() {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/exchange/update-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          name: settings.name,
          is_active: settings.isActive,
          testnet: settings.testnet,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }
      
      toast({
        title: 'Settings Updated',
        description: 'Exchange settings have been updated successfully.',
      });
      
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleDeleteCredential() {
    setIsLoading(true);
    
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('exchange_credentials')
        .delete()
        .eq('id', credential.id);
        
      if (error) throw error;
      
      toast({
        title: 'Credential Deleted',
        description: 'Exchange credentials have been removed successfully.',
      });
      
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete exchange credentials',
      });
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  }
  
  async function handleRefreshBalances() {
    try {
      const response = await fetch('/api/wallet/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeId: credential.id }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to refresh balances');
      }
      
      toast({
        title: 'Refreshing Balances',
        description: 'Your wallet balances are being updated in the background.',
      });
      
      // Wait a moment then reload the data
      setTimeout(() => {
        loadExchangeData();
      }, 2000);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: err.message || 'Failed to refresh wallet balances',
      });
    }
  }
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exchange Settings</DialogTitle>
            <DialogDescription>
              Manage your connection to {credential?.exchange}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Connection Settings</CardTitle>
                  <CardDescription>
                    Configure your exchange connection settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="name">Connection Name</Label>
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isActive">Active Status</Label>
                      <Switch
                        id="isActive"
                        checked={settings.isActive}
                        onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      When disabled, this connection won't be used for trading operations
                    </p>
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="testnet">Testnet Mode</Label>
                      <Switch
                        id="testnet"
                        checked={settings.testnet}
                        onCheckedChange={(checked) => setSettings({ ...settings, testnet: checked })}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use testnet environment for testing without real funds
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">API Key</span>
                      <span>••••••••{credential?.api_key_encrypted.slice(-4)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Used</span>
                      <span>{credential?.last_used ? new Date(credential.last_used).toLocaleString() : 'Never'}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created On</span>
                      <span>{new Date(credential?.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="destructive" 
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                    >
                      {isTestingConnection ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircleIcon className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                    <Button onClick={handleUpdateSettings} disabled={isLoading}>
                      Save Changes
                    </Button>
                  </div>
                </CardFooter>
              </Card>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="balances" className="py-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Wallet Balances</CardTitle>
                    <CardDescription>
                      Current balances in your {credential?.exchange} account
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline" 
                    size="sm"
                    onClick={handleRefreshBalances}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {balances.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-4 border-b bg-muted/50 p-2 text-sm font-medium">
                        <div>Currency</div>
                        <div>Available</div>
                        <div>Locked</div>
                        <div>Total</div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {balances
                          .sort((a, b) => (b.free + b.locked) - (a.free + a.locked))
                          .map((balance, i) => (
                            <div 
                              key={i} 
                              className="grid grid-cols-4 p-2 text-sm border-b last:border-0 hover:bg-muted/50"
                            >
                              <div className="font-medium">{balance.currency}</div>
                              <div>{parseFloat(balance.free).toFixed(6)}</div>
                              <div>{parseFloat(balance.locked).toFixed(6)}</div>
                              <div>{(parseFloat(balance.free) + parseFloat(balance.locked)).toFixed(6)}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <RefreshCw className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mb-1 text-sm font-medium">No balances found</p>
                      <p className="text-sm text-muted-foreground">
                        Click refresh to fetch your current balances
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="permissions" className="py-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Permissions</CardTitle>
                  <CardDescription>
                    Permissions detected for your API key
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {permissions.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { name: 'Read Account', key: 'read' },
                          { name: 'Spot Trading', key: 'spot' },
                          { name: 'Futures Trading', key: 'futures' },
                          { name: 'Margin Trading', key: 'margin' },
                          { name: 'Withdrawals', key: 'withdraw' },
                          { name: 'Wallet Access', key: 'wallet' },
                        ].map((perm) => {
                          const hasPermission = permissions.includes(perm.key);
                          return (
                            <div key={perm.key} className="flex items-center space-x-2 rounded-md border p-3">
                              {hasPermission ? (
                                <Shield className="h-5 w-5 text-green-500" />
                              ) : (
                                <ShieldAlert className="h-5 w-5 text-red-500" />
                              )}
                              <div className="flex-1">
                                <div className="text-sm font-medium">{perm.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {hasPermission ? 'Enabled' : 'Not Allowed'}
                                </div>
                              </div>
                              <Badge variant={hasPermission ? 'default' : 'outline'}>
                                {hasPermission ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                      
                      {!permissions.includes('spot') && (
                        <Alert variant="warning">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Spot trading permission is required for basic operations
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {permissions.includes('withdraw') && (
                        <Alert variant="warning">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Withdraw permission is enabled. For security, consider creating a trading-only API key.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <Key className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mb-1 text-sm font-medium">No permission data available</p>
                      <p className="text-sm text-muted-foreground">
                        Test the connection to detect available permissions
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={handleTestConnection}
                        disabled={isTestingConnection}
                      >
                        {isTestingConnection ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Settings className="mr-2 h-4 w-4" />
                        )}
                        Test API Permissions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exchange Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exchange connection? This action cannot be undone
              and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCredential}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Connection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
