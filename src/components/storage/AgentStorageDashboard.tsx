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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  Brain, 
  Cpu, 
  Database, 
  HardDrive, 
  Plus, 
  ServerOff, 
  Sliders, 
  HardDriveUpload,
  RefreshCw,
  CreditCard,
  Loader2
} from 'lucide-react';
import { storageService } from '@/services/storageService';
import { integrationService } from '@/services/integrationService';
import { AgentStorage, StorageStats, StorageType, StorageStatus } from '@/types/storage';
import { formatBytes, formatDate } from '@/lib/utils';
import StorageAllocationTable from './StorageAllocationTable';
import StorageTransactionList from './StorageTransactionList';
import { toast } from '@/components/ui/use-toast';
import StorageExpansionDialog from './StorageExpansionDialog';
import StorageUsageChart from './StorageUsageChart';
import {
  Label,
  Input,
  Textarea,
  Switch,
  Slider,
  Separator
} from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface AgentStorageDashboardProps {
  agentId: string;
  userId: string;
}

export default function AgentStorageDashboard({ agentId, userId }: AgentStorageDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [storages, setStorages] = useState<AgentStorage[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<AgentStorage | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpansionDialogOpen, setIsExpansionDialogOpen] = useState(false);

  // Storage usage history for chart
  const [usageHistory, setUsageHistory] = useState<{ date: string; used: number }[]>([]);

  // New state for settings
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<{
    name: string;
    description: string;
    autoExpand: boolean;
    expansionThreshold: number;
    maxCapacity: number;
    backupEnabled: boolean;
    encryptionEnabled: boolean;
  }>({
    name: '',
    description: '',
    autoExpand: false,
    expansionThreshold: 80,
    maxCapacity: 0,
    backupEnabled: false,
    encryptionEnabled: false
  });

  // Add health check state
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [healthCheckResults, setHealthCheckResults] = useState<{
    status: 'good' | 'warning' | 'critical';
    details: {
      consistencyCheck: boolean;
      performanceIssues: boolean;
      encryptionStatus: boolean;
      backupStatus: boolean;
      utilizationStatus: 'good' | 'warning' | 'critical';
      recentErrors: number;
      recommendations: string[];
    };
  } | null>(null);
  const [showHealthResults, setShowHealthResults] = useState(false);

  useEffect(() => {
    loadAgentStorages();
  }, [agentId]);

  useEffect(() => {
    if (selectedStorage) {
      loadStorageStats();
      loadUsageHistory();
    }
  }, [selectedStorage]);

  useEffect(() => {
    if (selectedStorage) {
      setSettingsForm({
        name: selectedStorage.name,
        description: selectedStorage.description || '',
        autoExpand: selectedStorage.settings.autoExpand || false,
        expansionThreshold: selectedStorage.settings.expansionThresholdPercent || 80,
        maxCapacity: selectedStorage.settings.maxCapacity || selectedStorage.capacity * 2,
        backupEnabled: selectedStorage.settings.backupEnabled || false,
        encryptionEnabled: selectedStorage.settings.encryptionEnabled || false
      });
      setSettingsChanged(false);
    }
  }, [selectedStorage]);

  const loadAgentStorages = async () => {
    try {
      setLoading(true);
      const agentStorages = await storageService.getAgentStorageByAgent(agentId);
      
      setStorages(agentStorages);
      
      if (agentStorages.length > 0) {
        setSelectedStorage(agentStorages[0]);
      } else {
        setSelectedStorage(null);
      }
    } catch (error) {
      console.error('Error loading agent storages:', error);
      toast({
        title: "Error",
        description: "Failed to load agent storage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    if (!selectedStorage) return;
    
    try {
      const stats = await storageService.getAgentStorageStats(agentId);
      setStorageStats(stats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
      toast({
        title: "Error",
        description: "Failed to load storage statistics",
        variant: "destructive"
      });
    }
  };

  const loadUsageHistory = async () => {
    if (!selectedStorage) return;
    
    // This would typically come from an API endpoint
    // For now, we'll generate sample data
    const today = new Date();
    const history = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - i));
      
      // Calculate a value that grows over time
      const baseUsage = selectedStorage.capacity * 0.2; // Start at 20% capacity
      const dayMultiplier = 1 + (i / 50); // Gradually increase
      const used = Math.min(baseUsage * dayMultiplier, selectedStorage.usedSpace);
      
      return {
        date: date.toISOString().split('T')[0],
        used: Math.round(used)
      };
    });
    
    setUsageHistory(history);
  };

  const handleStorageChange = (storageId: string) => {
    const storage = storages.find(s => s.id === storageId);
    if (storage) {
      setSelectedStorage(storage);
    }
  };

  const handleRefresh = async () => {
    await loadAgentStorages();
    toast({
      title: "Refreshed",
      description: "Storage data has been updated",
    });
  };

  const handleCreateStorage = () => {
    router.push(`/dashboard/storage/agents/${agentId}/new`);
  };

  const handleExpandStorage = async (additionalCapacity: number) => {
    if (!selectedStorage) return;
    
    try {
      setLoading(true);
      
      // Fixed cost per unit for storage expansion
      const costPerUnit = 0.015; // $0.015 per unit (higher for agent storage)
      
      await integrationService.expandStorageWithPayment(
        selectedStorage.id,
        StorageType.AGENT,
        additionalCapacity,
        costPerUnit
      );
      
      toast({
        title: "Storage Expanded",
        description: `Added ${formatBytes(additionalCapacity)} of storage capacity`,
      });
      
      // Reload storage data
      await loadAgentStorages();
      
    } catch (error) {
      console.error('Error expanding storage:', error);
      toast({
        title: "Expansion Failed",
        description: (error as Error).message || "Could not expand storage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsExpansionDialogOpen(false);
    }
  };

  const getStorageHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-500 bg-green-100';
      case 'warning': return 'text-yellow-500 bg-yellow-100';
      case 'critical': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStatusColor = (status: StorageStatus | string) => {
    switch (status) {
      case StorageStatus.ACTIVE: return 'text-green-500 bg-green-100';
      case StorageStatus.INACTIVE: return 'text-gray-500 bg-gray-100';
      case StorageStatus.SUSPENDED: return 'text-red-500 bg-red-100';
      case StorageStatus.FULL: return 'text-yellow-500 bg-yellow-100';
      case StorageStatus.MAINTENANCE: return 'text-blue-500 bg-blue-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  // Handle settings changes
  const handleSettingChange = (field: string, value: any) => {
    setSettingsForm(prev => ({
      ...prev,
      [field]: value
    }));
    setSettingsChanged(true);
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!selectedStorage) return;
    
    try {
      setUpdatingSettings(true);
      
      const updates = {
        name: settingsForm.name,
        description: settingsForm.description,
        settings: {
          ...selectedStorage.settings,
          autoExpand: settingsForm.autoExpand,
          expansionThresholdPercent: settingsForm.expansionThreshold,
          maxCapacity: settingsForm.maxCapacity,
          backupEnabled: settingsForm.backupEnabled,
          encryptionEnabled: settingsForm.encryptionEnabled
        }
      };
      
      await storageService.updateAgentStorage(selectedStorage.id, updates);
      
      toast({
        title: "Settings Updated",
        description: "Storage settings have been successfully updated"
      });
      
      setSettingsChanged(false);
      
      // Reload storage data
      await loadAgentStorages();
      
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Update Failed",
        description: (error as Error).message || "Could not update settings",
        variant: "destructive"
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Add health check function
  const handleHealthCheck = async () => {
    if (!selectedStorage) return;
    
    try {
      setRunningHealthCheck(true);
      
      const results = await storageService.runAgentStorageHealthCheck(selectedStorage.id);
      
      setHealthCheckResults(results);
      setShowHealthResults(true);
      
      // Update storage stats to reflect current health
      loadStorageStats();
      
      toast({
        title: "Health Check Complete",
        description: `Storage health: ${results.status.toUpperCase()}`,
        variant: results.status === 'good' ? 'default' : 
               (results.status === 'warning' ? 'warning' : 'destructive')
      });
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: "Health Check Failed",
        description: (error as Error).message || "Could not complete health check",
        variant: "destructive"
      });
    } finally {
      setRunningHealthCheck(false);
    }
  };

  // Add function to close health results
  const handleCloseHealthResults = () => {
    setShowHealthResults(false);
  };

  if (loading && !selectedStorage) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Agent Storage</h1>
          <div className="animate-pulse w-32 h-10 bg-secondary rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="animate-pulse h-[180px] bg-secondary rounded-lg"></div>
          <div className="animate-pulse h-[180px] bg-secondary rounded-lg"></div>
          <div className="animate-pulse h-[180px] bg-secondary rounded-lg"></div>
        </div>
        <div className="animate-pulse h-[300px] bg-secondary rounded-lg mt-4"></div>
      </div>
    );
  }

  if (storages.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Agent Storage</h1>
          <Button onClick={handleCreateStorage}>
            <Plus className="h-4 w-4 mr-2" />
            Create Storage
          </Button>
        </div>
        
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No Storage Volumes</CardTitle>
            <CardDescription>
              This agent doesn't have any storage volumes yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Create your first agent storage</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Agent storage enables your trading agents to store models, historical data, and decision metrics.
              </p>
              <Button onClick={handleCreateStorage}>
                <Plus className="h-4 w-4 mr-2" />
                Create Storage Volume
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agent Storage</h1>
          <p className="text-muted-foreground">Manage storage volumes for your trading agent</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedStorage?.id} onValueChange={handleStorageChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Storage" />
            </SelectTrigger>
            <SelectContent>
              {storages.map(storage => (
                <SelectItem key={storage.id} value={storage.id}>
                  {storage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button onClick={handleCreateStorage}>
            <Plus className="h-4 w-4 mr-2" />
            New Volume
          </Button>
        </div>
      </div>
      
      {selectedStorage && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Storage Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatBytes(selectedStorage.capacity)}</div>
                  <Progress 
                    value={(selectedStorage.usedSpace / selectedStorage.capacity) * 100} 
                    className="h-2 mt-2"
                  />
                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
                    <div>
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                      Used: {formatBytes(selectedStorage.usedSpace)}
                    </div>
                    <div>
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      Free: {formatBytes(selectedStorage.capacity - selectedStorage.usedSpace)}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setIsExpansionDialogOpen(true)}
                  >
                    <HardDriveUpload className="h-4 w-4 mr-2" />
                    Expand Capacity
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status & Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Status:</span>
                      <Badge className={getStatusColor(selectedStorage.status)}>
                        {selectedStorage.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Storage Type:</span>
                      <span className="text-sm font-medium">{selectedStorage.storageType}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Health:</span>
                      <Badge className={getStorageHealthColor(storageStats?.storageHealth || 'good')}>
                        {storageStats?.storageHealth || 'Good'}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Utilization:</span>
                      <span className="text-sm font-medium">
                        {storageStats ? Math.round(storageStats.utilizationPercentage) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleHealthCheck}
                    disabled={runningHealthCheck}
                  >
                    {runningHealthCheck ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Health Check
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Allocations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold">
                      {storageStats?.allocationCount || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(selectedStorage.usedSpace)} allocated of {formatBytes(selectedStorage.capacity)}
                    </div>
                    <div className="h-[100px] mt-4">
                      <div className="w-full h-full bg-secondary/30 relative rounded-lg overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1 p-1">
                          {/* Example allocation blocks */}
                          <div className="bg-blue-500/60 rounded col-span-2 row-span-2" title="Algorithm Data">
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-medium">
                              45%
                            </div>
                          </div>
                          <div className="bg-green-500/60 rounded col-span-1 row-span-1" title="Market Data">
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-medium">
                              30%
                            </div>
                          </div>
                          <div className="bg-yellow-500/60 rounded col-span-1 row-span-1" title="Models">
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-medium">
                              15%
                            </div>
                          </div>
                          <div className="bg-purple-500/60 rounded col-span-1 row-span-1" title="Logs">
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-medium">
                              5%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Allocation
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StorageUsageChart 
                usageHistory={usageHistory}
                title="Storage Usage Over Time"
                description="Historical view of storage utilization"
              />
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Storage Properties</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="border-b">
                    <div className="grid grid-cols-2 py-2 px-4">
                      <div className="text-sm font-medium">Created</div>
                      <div className="text-sm">{formatDate(selectedStorage.createdAt)}</div>
                    </div>
                  </div>
                  <div className="border-b">
                    <div className="grid grid-cols-2 py-2 px-4">
                      <div className="text-sm font-medium">Max Capacity</div>
                      <div className="text-sm">{formatBytes(selectedStorage.settings.maxCapacity || selectedStorage.capacity * 2)}</div>
                    </div>
                  </div>
                  <div className="border-b">
                    <div className="grid grid-cols-2 py-2 px-4">
                      <div className="text-sm font-medium">Auto-expand</div>
                      <div className="text-sm">{selectedStorage.settings.autoExpand ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                  <div className="border-b">
                    <div className="grid grid-cols-2 py-2 px-4">
                      <div className="text-sm font-medium">Encryption</div>
                      <div className="text-sm">{selectedStorage.settings.encryptionEnabled ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="grid grid-cols-2 py-2 px-4">
                      <div className="text-sm font-medium">Vault Account</div>
                      <div className="text-sm">
                        {selectedStorage.vaultAccountId ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {selectedStorage.vaultAccountId.substring(0, 8)}...
                          </Badge>
                        ) : 'None'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="allocations">
            <StorageAllocationTable 
              storageId={selectedStorage.id} 
              storageType={StorageType.AGENT}
              onAllocationChanged={loadAgentStorages}
            />
          </TabsContent>
          
          <TabsContent value="transactions">
            <StorageTransactionList 
              storageId={selectedStorage.id}
              storageType={StorageType.AGENT}
              limit={20}
            />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Storage Settings</CardTitle>
                <CardDescription>
                  Manage your storage configuration and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storageName">Storage Name</Label>
                    <Input 
                      id="storageName" 
                      value={settingsForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSettingChange('name', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="storageType">Storage Type</Label>
                    <Input 
                      id="storageType" 
                      value={selectedStorage.storageType}
                      disabled
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      rows={3}
                      value={settingsForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleSettingChange('description', e.target.value)}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Capacity Management</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoExpand">Auto-expansion</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically expand storage when capacity is reached
                        </p>
                      </div>
                      <Switch 
                        id="autoExpand"
                        checked={settingsForm.autoExpand}
                        onCheckedChange={(checked) => handleSettingChange('autoExpand', checked)}
                      />
                    </div>
                    
                    {settingsForm.autoExpand && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="expansionThreshold">Expansion Threshold</Label>
                            <span className="text-sm">{settingsForm.expansionThreshold}%</span>
                          </div>
                          <Slider
                            id="expansionThreshold"
                            min={50}
                            max={95}
                            step={5}
                            value={[settingsForm.expansionThreshold]}
                            onValueChange={(values) => handleSettingChange('expansionThreshold', values[0])}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Storage will expand when utilization exceeds this threshold
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="maxCapacity">Maximum Capacity</Label>
                          <div className="pt-2">
                            <Slider
                              id="maxCapacity"
                              min={selectedStorage.capacity}
                              max={selectedStorage.capacity * 10}
                              step={selectedStorage.capacity}
                              value={[settingsForm.maxCapacity]}
                              onValueChange={(values) => handleSettingChange('maxCapacity', values[0])}
                            />
                            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                              <span>Current: {formatBytes(selectedStorage.capacity)}</span>
                              <span>Max: {formatBytes(settingsForm.maxCapacity)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Storage will not expand beyond this limit
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Security & Backup</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="encryption">Encryption</Label>
                        <p className="text-sm text-muted-foreground">
                          Encrypt stored data for enhanced security
                        </p>
                      </div>
                      <Switch 
                        id="encryption"
                        checked={settingsForm.encryptionEnabled}
                        onCheckedChange={(checked) => handleSettingChange('encryptionEnabled', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="backup">Automatic Backups</Label>
                        <p className="text-sm text-muted-foreground">
                          Regularly back up your storage data
                        </p>
                      </div>
                      <Switch 
                        id="backup"
                        checked={settingsForm.backupEnabled}
                        onCheckedChange={(checked) => handleSettingChange('backupEnabled', checked)}
                      />
                    </div>
                  </div>
                </div>
                
                {selectedStorage.vaultAccountId && (
                  <>
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Linked Vault Account</h3>
                      
                      <div className="p-4 bg-secondary/20 rounded-md flex items-start gap-3">
                        <div className="text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            This storage is linked to a vault account
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {selectedStorage.vaultAccountId.substring(0, 8)}...
                          </p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="px-0 h-auto text-xs"
                            onClick={() => router.push(`/dashboard/vault/accounts/${selectedStorage.vaultAccountId}`)}
                          >
                            View Account Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (selectedStorage) {
                      // Reset form to current settings
                      setSettingsForm({
                        name: selectedStorage.name,
                        description: selectedStorage.description || '',
                        autoExpand: selectedStorage.settings.autoExpand || false,
                        expansionThreshold: selectedStorage.settings.expansionThresholdPercent || 80,
                        maxCapacity: selectedStorage.settings.maxCapacity || selectedStorage.capacity * 2,
                        backupEnabled: selectedStorage.settings.backupEnabled || false,
                        encryptionEnabled: selectedStorage.settings.encryptionEnabled || false
                      });
                      setSettingsChanged(false);
                    }
                  }}
                  disabled={!settingsChanged || updatingSettings}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveSettings}
                  disabled={!settingsChanged || updatingSettings}
                >
                  {updatingSettings ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedStorage && (
        <StorageExpansionDialog 
          open={isExpansionDialogOpen}
          onOpenChange={setIsExpansionDialogOpen}
          currentCapacity={selectedStorage.capacity}
          onExpand={handleExpandStorage}
        />
      )}

      {healthCheckResults && showHealthResults && (
        <Dialog open={showHealthResults} onOpenChange={setShowHealthResults}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Storage Health Check
                <Badge className={
                  healthCheckResults.status === 'good' ? 'bg-green-100 text-green-800' :
                  healthCheckResults.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {healthCheckResults.status.toUpperCase()}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Detailed health check results for {selectedStorage?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">System Status</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Data Consistency:</div>
                  <div className={healthCheckResults.details.consistencyCheck ? 'text-green-600' : 'text-red-600'}>
                    {healthCheckResults.details.consistencyCheck ? 'Verified' : 'Issues Detected'}
                  </div>
                  
                  <div className="text-muted-foreground">Performance:</div>
                  <div className={!healthCheckResults.details.performanceIssues ? 'text-green-600' : 'text-red-600'}>
                    {!healthCheckResults.details.performanceIssues ? 'Optimal' : 'Issues Detected'}
                  </div>
                  
                  <div className="text-muted-foreground">Encryption:</div>
                  <div className={healthCheckResults.details.encryptionStatus ? 'text-green-600' : 'text-yellow-600'}>
                    {healthCheckResults.details.encryptionStatus ? 'Enabled' : 'Disabled'}
                  </div>
                  
                  <div className="text-muted-foreground">Backups:</div>
                  <div className={healthCheckResults.details.backupStatus ? 'text-green-600' : 'text-yellow-600'}>
                    {healthCheckResults.details.backupStatus ? 'Enabled' : 'Disabled'}
                  </div>
                  
                  <div className="text-muted-foreground">Utilization:</div>
                  <div className={
                    healthCheckResults.details.utilizationStatus === 'good' ? 'text-green-600' :
                    healthCheckResults.details.utilizationStatus === 'warning' ? 'text-yellow-600' :
                    'text-red-600'
                  }>
                    {healthCheckResults.details.utilizationStatus.charAt(0).toUpperCase() + 
                     healthCheckResults.details.utilizationStatus.slice(1)}
                  </div>
                  
                  <div className="text-muted-foreground">Recent Errors:</div>
                  <div className={healthCheckResults.details.recentErrors === 0 ? 'text-green-600' : 'text-red-600'}>
                    {healthCheckResults.details.recentErrors}
                  </div>
                </div>
              </div>
              
              {healthCheckResults.details.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {healthCheckResults.details.recommendations.map((rec, i) => (
                      <li key={i} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex gap-2 justify-between sm:justify-end">
              <Button variant="outline" onClick={handleCloseHealthResults}>
                Close
              </Button>
              {healthCheckResults.status !== 'good' && (
                <Button onClick={() => {
                  setActiveTab('settings');
                  handleCloseHealthResults();
                }}>
                  Go to Settings
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 