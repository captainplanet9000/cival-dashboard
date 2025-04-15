'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  PlusCircle, 
  KeyRound, 
  Edit, 
  Trash, 
  ShieldAlert, 
  ShieldCheck,
  AlertCircle 
} from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ApiKeyForm, { Exchange, Farm } from './api-key-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ApiKey {
  id: string;
  name: string;
  exchange_id: string;
  farm_id: string;
  created_at: string;
  updated_at: string;
  testnet: boolean;
  read_only: boolean;
  trading_enabled: boolean;
}

export default function ApiKeyManager() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  // Get exchanges
  const { data: exchanges = [] } = useQuery<Exchange[]>({
    queryKey: ['exchanges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchanges')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Get farms
  const { data: farms = [] } = useQuery<Farm[]>({
    queryKey: ['farms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farms')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Get API keys
  const { data: apiKeys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_connections')
        .select(`
          id, 
          name, 
          exchange_id, 
          farm_id,
          created_at,
          updated_at,
          testnet,
          read_only,
          trading_enabled
        `);
      
      if (error) throw error;
      return data;
    }
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from('exchange_connections')
        .delete()
        .eq('id', keyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast({
        title: 'API Key Deleted',
        description: 'The API key was successfully deleted.',
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete API key: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Find exchange and farm names
  const getExchangeName = (id: string) => {
    const exchange = exchanges.find(e => e.id === id);
    return exchange?.name || 'Unknown Exchange';
  };

  const getFarmName = (id: string) => {
    const farm = farms.find(f => f.id === id);
    return farm?.name || 'Unknown Farm';
  };

  // Handle API key CRUD
  const handleAddSuccess = () => {
    setIsAddOpen(false);
    queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setSelectedApiKey(null);
    queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
  };

  const handleEditClick = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedApiKey) {
      deleteApiKeyMutation.mutate(selectedApiKey.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Exchange API Keys</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Add Exchange API Key</DialogTitle>
              <DialogDescription>
                Connect a trading venue to your account. API keys are securely stored and never exposed to the frontend.
              </DialogDescription>
            </DialogHeader>
            <ApiKeyForm 
              exchanges={exchanges} 
              farms={farms}
              onSuccess={handleAddSuccess} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-10 text-center">Loading API keys...</div>
      ) : apiKeys.length === 0 ? (
        <Card className="border-dashed bg-muted/50">
          <CardContent className="py-10 text-center">
            <KeyRound className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-4 text-sm text-muted-foreground">
              No API keys have been added yet. Add your first API key to start trading.
            </p>
            <Button onClick={() => setIsAddOpen(true)} variant="outline" className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{apiKey.name}</CardTitle>
                    <CardDescription>{getExchangeName(apiKey.exchange_id)}</CardDescription>
                  </div>
                  {apiKey.testnet && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Testnet
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <span className="w-24 text-muted-foreground">Farm:</span>
                    <span>{getFarmName(apiKey.farm_id)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-24 text-muted-foreground">Created:</span>
                    <span>{new Date(apiKey.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {apiKey.read_only ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Read-only
                      </Badge>
                    ) : apiKey.trading_enabled ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <ShieldAlert className="mr-1 h-3 w-3" />
                        Trading
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Limited
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEditClick(apiKey)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteClick(apiKey)}>
                  <Trash className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update your API key settings. Note: For security reasons, API secrets cannot be viewed after creation.
            </DialogDescription>
          </DialogHeader>
          {selectedApiKey && (
            <ApiKeyForm 
              exchanges={exchanges} 
              farms={farms}
              initialValues={{
                exchange_id: selectedApiKey.exchange_id,
                farm_id: selectedApiKey.farm_id,
                name: selectedApiKey.name,
                api_key: '', // Will be required from user again
                api_secret: '', // Will be required from user again
                passphrase: '',
                testnet: selectedApiKey.testnet,
                read_only: selectedApiKey.read_only,
                trading_enabled: selectedApiKey.trading_enabled
              }}
              onSuccess={handleEditSuccess}
              editMode={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the API key "{selectedApiKey?.name}" for {selectedApiKey ? getExchangeName(selectedApiKey.exchange_id) : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
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
