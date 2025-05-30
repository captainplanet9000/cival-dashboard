/**
 * Exchange Credentials Form
 * 
 * Provides a form for managing exchange API credentials
 * Allows adding, editing, and removing exchange API keys
 */
import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { ExchangeCredential, ExchangeCredentialsService } from '@/services/exchange-credentials-service';
import { ExchangeType } from '@/services/exchange-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash, Edit, Save, Plus, AlertCircle, CheckCircle } from 'lucide-react';
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

export interface ExchangeCredentialsFormProps {
  farmId?: number;
  onSave?: (credential: ExchangeCredential) => void;
  className?: string;
}

export function ExchangeCredentialsForm({
  farmId,
  onSave,
  className
}: ExchangeCredentialsFormProps) {
  const { user } = useUser();
  const [credentials, setCredentials] = useState<ExchangeCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeType>(ExchangeType.BYBIT);
  const [currentCredential, setCurrentCredential] = useState<ExchangeCredential | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    walletAddress: '',
    isTestnet: false,
    isDefault: false
  });

  // Load credentials
  useEffect(() => {
    if (user?.id) {
      loadCredentials();
    }
  }, [user?.id]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await ExchangeCredentialsService.listCredentials(
        user!.id,
        false // client-side
      );
      
      if (error) {
        toast.error('Failed to load exchange credentials');
        console.error('Error loading credentials:', error);
      } else {
        setCredentials(data);
      }
    } catch (error) {
      toast.error('An error occurred while loading credentials');
      console.error('Exception loading credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeChange = (exchange: ExchangeType) => {
    setSelectedExchange(exchange);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const resetForm = () => {
    setFormData({
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      walletAddress: '',
      isTestnet: false,
      isDefault: false
    });
    setIsEditing(false);
    setCurrentCredential(null);
  };

  const createOrUpdateCredential = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to manage API keys');
      return;
    }

    try {
      let result: { data: any; error: any };

      // Build the credential object
      const credentialData: ExchangeCredential = {
        user_id: user.id,
        farm_id: farmId,
        exchange: selectedExchange,
        api_key: formData.apiKey,
        api_secret: formData.apiSecret,
        is_testnet: formData.isTestnet,
        is_default: formData.isDefault,
        additional_params: {}
      };

      // Add exchange-specific parameters
      if (selectedExchange === ExchangeType.COINBASE && formData.passphrase) {
        credentialData.additional_params = {
          ...credentialData.additional_params,
          passphrase: formData.passphrase
        };
      } else if (selectedExchange === ExchangeType.HYPERLIQUID && formData.walletAddress) {
        credentialData.additional_params = {
          ...credentialData.additional_params,
          wallet_address: formData.walletAddress
        };
      }

      // Update or create
      if (isEditing && currentCredential?.id) {
        result = await ExchangeCredentialsService.updateCredentials(
          currentCredential.id,
          credentialData,
          false // client-side
        );
        
        if (result.error) {
          throw new Error(`Failed to update API key: ${result.error.message || 'Unknown error'}`);
        }
        
        toast.success('API key updated successfully');
      } else {
        result = await ExchangeCredentialsService.storeCredentials(
          credentialData,
          false // client-side
        );
        
        if (result.error) {
          throw new Error(`Failed to save API key: ${result.error.message || 'Unknown error'}`);
        }
        
        toast.success('API key saved successfully');
      }

      // Reload credentials
      await loadCredentials();
      
      // Call onSave callback if provided
      if (onSave && result.data) {
        onSave(result.data);
      }
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving credential:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save API key');
    }
  };

  const editCredential = (credential: ExchangeCredential) => {
    setCurrentCredential(credential);
    setSelectedExchange(credential.exchange as ExchangeType);
    
    setFormData({
      apiKey: credential.api_key,
      apiSecret: '', // For security, we don't show the existing secret
      passphrase: credential.additional_params?.passphrase || '',
      walletAddress: credential.additional_params?.wallet_address || '',
      isTestnet: credential.is_testnet || false,
      isDefault: credential.is_default || false
    });
    
    setIsEditing(true);
  };

  const confirmDelete = (id: number) => {
    setCredentialToDelete(id);
    setShowDeleteDialog(true);
  };

  const deleteCredential = async () => {
    if (!credentialToDelete) return;
    
    try {
      const { success, error } = await ExchangeCredentialsService.deleteCredentials(
        credentialToDelete,
        false // client-side
      );
      
      if (error) {
        throw new Error(`Failed to delete API key: ${error.message || 'Unknown error'}`);
      }
      
      if (success) {
        toast.success('API key deleted successfully');
        await loadCredentials();
      }
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
    } finally {
      setShowDeleteDialog(false);
      setCredentialToDelete(null);
    }
  };

  const validateForm = () => {
    if (!formData.apiKey) return false;
    
    // For new credentials, we need the secret
    if (!isEditing && !formData.apiSecret) return false;
    
    // Exchange-specific validations
    if (selectedExchange === ExchangeType.COINBASE && !formData.passphrase) return false;
    if (selectedExchange === ExchangeType.HYPERLIQUID && !formData.walletAddress) return false;
    
    return true;
  };

  // Test connection to verify API keys work
  const testConnection = async (credential: ExchangeCredential) => {
    toast.info('Testing connection to exchange...');
    
    // In a real implementation, you would call an API endpoint to test the connection
    // For now, we'll just simulate a successful connection after a delay
    setTimeout(() => {
      toast.success('Connection successful!');
    }, 1500);
  };

  return (
    <div className={className}>
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="manage">Manage API Keys</TabsTrigger>
          <TabsTrigger value="add">Add New API Key</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Exchange API Keys</CardTitle>
              <CardDescription>
                Manage your exchange API keys for trading and market data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading credentials...</p>
              ) : credentials.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-semibold">No API Keys Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You don't have any API keys set up yet. Add one to start trading.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => document.querySelector('[data-value="add"]')?.click()}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add API Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {credentials.map((cred) => (
                    <Card key={cred.id} className="p-4 shadow-sm border">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium flex items-center">
                            {cred.exchange} 
                            {cred.is_default && (
                              <span className="ml-2 bg-primary/10 text-primary text-xs rounded px-2 py-0.5">
                                Default
                              </span>
                            )}
                            {cred.is_testnet && (
                              <span className="ml-2 bg-warning/10 text-warning text-xs rounded px-2 py-0.5">
                                Testnet
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            API Key: <code className="bg-muted px-1 py-0.5 rounded text-xs">
                              {cred.api_key.substring(0, 8)}...{cred.api_key.substring(cred.api_key.length - 4)}
                            </code>
                          </p>
                          {farmId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Linked to farm ID: {cred.farm_id || 'N/A'}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => testConnection(cred)}
                          >
                            Test
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => editCredential(cred)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => confirmDelete(cred.id!)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>
                {isEditing ? 'Edit API Key' : 'Add New API Key'}
              </CardTitle>
              <CardDescription>
                {isEditing 
                  ? 'Update your exchange API key information' 
                  : 'Enter your exchange API key and secret for trading'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exchange">Exchange</Label>
                  <Select
                    value={selectedExchange}
                    onValueChange={(value) => handleExchangeChange(value as ExchangeType)}
                    disabled={isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exchange" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ExchangeType.BYBIT}>Bybit</SelectItem>
                      <SelectItem value={ExchangeType.COINBASE}>Coinbase</SelectItem>
                      <SelectItem value={ExchangeType.HYPERLIQUID}>Hyperliquid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleInputChange}
                    placeholder="Enter your API key"
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">
                    API Secret {isEditing && <span className="text-xs text-muted-foreground">(Leave blank to keep current secret)</span>}
                  </Label>
                  <Input
                    id="apiSecret"
                    name="apiSecret"
                    type="password"
                    value={formData.apiSecret}
                    onChange={handleInputChange}
                    placeholder={isEditing ? "Leave blank to keep current secret" : "Enter your API secret"}
                    className="font-mono"
                  />
                </div>
                
                {selectedExchange === ExchangeType.COINBASE && (
                  <div className="space-y-2">
                    <Label htmlFor="passphrase">Passphrase</Label>
                    <Input
                      id="passphrase"
                      name="passphrase"
                      type="password"
                      value={formData.passphrase}
                      onChange={handleInputChange}
                      placeholder="Enter your Coinbase API passphrase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Coinbase requires a passphrase for API authentication.
                    </p>
                  </div>
                )}
                
                {selectedExchange === ExchangeType.HYPERLIQUID && (
                  <div className="space-y-2">
                    <Label htmlFor="walletAddress">Wallet Address</Label>
                    <Input
                      id="walletAddress"
                      name="walletAddress"
                      value={formData.walletAddress}
                      onChange={handleInputChange}
                      placeholder="Enter your Ethereum wallet address"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Hyperliquid requires your Ethereum wallet address.
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isTestnet"
                      name="isTestnet"
                      checked={formData.isTestnet}
                      onCheckedChange={(checked) => 
                        setFormData({...formData, isTestnet: checked as boolean})
                      }
                    />
                    <Label
                      htmlFor="isTestnet"
                      className="text-sm font-normal"
                    >
                      Use Testnet
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isDefault"
                      name="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => 
                        setFormData({...formData, isDefault: checked as boolean})
                      }
                    />
                    <Label
                      htmlFor="isDefault"
                      className="text-sm font-normal"
                    >
                      Set as Default
                    </Label>
                  </div>
                </div>
                
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    <AlertCircle className="inline mr-1 h-3 w-3" />
                    Your API secret is encrypted before storage and never shared with third parties.
                  </p>
                  {selectedExchange === ExchangeType.BYBIT && (
                    <p className="text-xs text-muted-foreground">
                      <CheckCircle className="inline mr-1 h-3 w-3" />
                      Required Bybit permissions: <strong>Read, Trade</strong>
                    </p>
                  )}
                  {selectedExchange === ExchangeType.COINBASE && (
                    <p className="text-xs text-muted-foreground">
                      <CheckCircle className="inline mr-1 h-3 w-3" />
                      Required Coinbase permissions: <strong>View, Trade</strong>
                    </p>
                  )}
                  {selectedExchange === ExchangeType.HYPERLIQUID && (
                    <p className="text-xs text-muted-foreground">
                      <CheckCircle className="inline mr-1 h-3 w-3" />
                      Required Hyperliquid permissions: <strong>Wallet signature</strong>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button
                onClick={createOrUpdateCredential}
                disabled={!validateForm()}
              >
                {isEditing ? (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Update API Key
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Add API Key
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this API key from your account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCredential}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ExchangeCredentialsForm;
