"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Brain, HardDrive } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { storageService } from '@/services/storageService';
import { vaultService } from '@/services/vaultService';
import { integrationService } from '@/services/integrationService';
import { toast } from '@/components/ui/use-toast';
import { formatBytes } from '@/lib/utils';

interface StorageCreationPageProps {
  params: {
    agentId: string;
  };
}

export default function StorageCreationPage({ params }: StorageCreationPageProps) {
  const router = useRouter();
  const { agentId } = params;
  
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [vaultMasters, setVaultMasters] = useState<Array<{ id: string; name: string }>>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [storageType, setStorageType] = useState('autonomous');
  const [capacity, setCapacity] = useState(1024 * 1024 * 1024); // 1GB
  const [selectedVaultMaster, setSelectedVaultMaster] = useState<string>('');
  const [initialFunding, setInitialFunding] = useState(10);
  const [createVault, setCreateVault] = useState(true);
  const [encryption, setEncryption] = useState(true);
  const [backup, setBackup] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);
  
  useEffect(() => {
    const loadVaultMasters = async () => {
      try {
        const masters = await vaultService.getVaultMastersByOwnerId();
        setVaultMasters(masters);
        
        if (masters.length > 0) {
          setSelectedVaultMaster(masters[0].id);
        }
      } catch (error) {
        console.error("Error loading vault masters:", error);
        toast({
          title: "Error",
          description: "Failed to load vault data",
          variant: "destructive"
        });
      } finally {
        setInitializing(false);
      }
    };
    
    loadVaultMasters();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast({
        title: "Validation Error",
        description: "Storage name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (createVault && !selectedVaultMaster) {
      toast({
        title: "Validation Error",
        description: "Please select a vault master account",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      let storageId;
      
      if (createVault) {
        // Create storage with integrated vault account
        const result = await integrationService.createAgentStorageWithVault(
          agentId,
          selectedVaultMaster,
          name,
          capacity,
          {
            description,
            storageType,
            initialDeposit: initialFunding
          }
        );
        
        storageId = result.storageId;
      } else {
        // Create storage only
        const storage = await storageService.createAgentStorage(
          agentId,
          name,
          capacity,
          {
            description,
            storageType,
            settings: {
              autoExpand,
              expansionThresholdPercent: 80,
              maxCapacity: capacity * 2,
              backupEnabled: backup,
              encryptionEnabled: encryption
            }
          }
        );
        
        storageId = storage.id;
      }
      
      toast({
        title: "Storage Created",
        description: `Successfully created ${name} storage`
      });
      
      // Redirect to the storage dashboard
      router.push(`/dashboard/storage/agents/${agentId}`);
      
    } catch (error) {
      console.error("Error creating storage:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create storage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    router.push(`/dashboard/storage/agents/${agentId}`);
  };
  
  if (initializing) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Agent Storage</h1>
          <p className="text-muted-foreground">Set up a new storage volume for your agent</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Storage Details</CardTitle>
                <CardDescription>
                  Configure the basic properties of your storage volume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Storage Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter storage name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the purpose of this storage"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storageType">Storage Type</Label>
                      <Select
                        value={storageType}
                        onValueChange={setStorageType}
                      >
                        <SelectTrigger id="storageType">
                          <SelectValue placeholder="Select storage type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="autonomous">Autonomous (Agent-managed)</SelectItem>
                          <SelectItem value="managed">Managed (User-controlled)</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Shared control)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Storage Capacity</Label>
                      <div className="pt-2">
                        <Slider
                          id="capacity"
                          min={100 * 1024 * 1024} // 100MB
                          max={50 * 1024 * 1024 * 1024} // 50GB
                          step={100 * 1024 * 1024} // 100MB steps
                          value={[capacity]}
                          onValueChange={(values) => setCapacity(values[0])}
                        />
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-muted-foreground">100MB</span>
                          <span className="text-sm font-medium">{formatBytes(capacity)}</span>
                          <span className="text-xs text-muted-foreground">50GB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardHeader className="pb-2">
                <CardTitle>Vault Integration</CardTitle>
                <CardDescription>
                  Link this storage to a vault account for payments and subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="createVault"
                    checked={createVault}
                    onCheckedChange={setCreateVault}
                  />
                  <Label htmlFor="createVault">Create associated vault account</Label>
                </div>
                
                {createVault && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="vaultMaster">Vault Master Account</Label>
                      <Select
                        value={selectedVaultMaster}
                        onValueChange={setSelectedVaultMaster}
                        disabled={vaultMasters.length === 0}
                      >
                        <SelectTrigger id="vaultMaster">
                          <SelectValue placeholder="Select vault master" />
                        </SelectTrigger>
                        <SelectContent>
                          {vaultMasters.map(master => (
                            <SelectItem key={master.id} value={master.id}>
                              {master.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {vaultMasters.length === 0 && (
                        <p className="text-xs text-destructive mt-1">
                          No vault masters available. Please create one first.
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="initialFunding">Initial Funding (USD)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="initialFunding"
                          type="number"
                          min="0"
                          step="0.01"
                          value={initialFunding.toString()}
                          onChange={(e) => setInitialFunding(parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-muted-foreground">USD</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardHeader className="pb-2">
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Configure additional storage features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="encryption"
                      checked={encryption}
                      onCheckedChange={setEncryption}
                    />
                    <Label htmlFor="encryption">Enable encryption</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="backup"
                      checked={backup}
                      onCheckedChange={setBackup}
                    />
                    <Label htmlFor="backup">Enable automatic backups</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoExpand"
                      checked={autoExpand}
                      onCheckedChange={setAutoExpand}
                    />
                    <Label htmlFor="autoExpand">Auto-expand when reaching capacity</Label>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Storage'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>About Agent Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center py-6">
                <Brain className="h-16 w-16 text-primary/80 mb-4" />
                <h3 className="text-lg font-medium">Agent-Optimized Storage</h3>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Storage Types</h4>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Autonomous:</span> Gives your agent full control over storage management.
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Managed:</span> You maintain control over storage allocations.
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Hybrid:</span> Shared control between you and your agent.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Vault Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Linking storage to a vault enables automatic payments for expansions and allocations.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Advanced Features</h4>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Encryption:</span> Enhances security for sensitive data.
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Backups:</span> Automatically protect against data loss.
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Auto-expand:</span> Growing storage as needs increase.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 