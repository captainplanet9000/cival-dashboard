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
  ArrowDown, 
  ArrowUp, 
  Database, 
  HardDrive, 
  Plus, 
  ServerOff, 
  Sliders, 
  HardDriveDownload,
  HardDriveUpload,
  RefreshCw
} from 'lucide-react';
import { storageService } from '@/services/storageService';
import { integrationService } from '@/services/integrationService';
import { FarmStorage, StorageStats, StorageType, StorageStatus } from '@/types/storage';
import { formatBytes } from '@/lib/utils';
import StorageAllocationTable from './StorageAllocationTable';
import StorageTransactionList from './StorageTransactionList';
import { toast } from '@/components/ui/use-toast';
import StorageExpansionDialog from './StorageExpansionDialog';
import StorageUsageChart from './StorageUsageChart';

interface FarmStorageDashboardProps {
  farmId: string;
  userId: string;
}

export default function FarmStorageDashboard({ farmId, userId }: FarmStorageDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [storages, setStorages] = useState<FarmStorage[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<FarmStorage | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpansionDialogOpen, setIsExpansionDialogOpen] = useState(false);

  // Storage usage history for chart
  const [usageHistory, setUsageHistory] = useState<{ date: string; used: number; reserved: number }[]>([]);

  useEffect(() => {
    loadFarmStorages();
  }, [farmId]);

  useEffect(() => {
    if (selectedStorage) {
      loadStorageStats();
      loadUsageHistory();
    }
  }, [selectedStorage]);

  const loadFarmStorages = async () => {
    try {
      setLoading(true);
      const farmStorages = await storageService.getFarmStorageByFarm(farmId);
      
      setStorages(farmStorages);
      
      if (farmStorages.length > 0) {
        setSelectedStorage(farmStorages[0]);
      } else {
        setSelectedStorage(null);
      }
    } catch (error) {
      console.error('Error loading farm storages:', error);
      toast({
        title: "Error",
        description: "Failed to load farm storage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    if (!selectedStorage) return;
    
    try {
      const stats = await storageService.getFarmStorageStats(farmId);
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
      const baseUsage = selectedStorage.capacity * 0.3; // Start at 30% capacity
      const dayMultiplier = 1 + (i / 60); // Gradually increase
      const used = Math.min(baseUsage * dayMultiplier, selectedStorage.usedSpace);
      
      // Reserved space starts higher and decreases
      const reservedBase = selectedStorage.capacity * 0.15;
      const reservedMultiplier = 1 - (i / 200);
      const reserved = Math.max(reservedBase * reservedMultiplier, selectedStorage.reservedSpace);
      
      return {
        date: date.toISOString().split('T')[0],
        used: Math.round(used),
        reserved: Math.round(reserved)
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
    await loadFarmStorages();
    toast({
      title: "Refreshed",
      description: "Storage data has been updated",
    });
  };

  const handleCreateStorage = () => {
    router.push(`/dashboard/storage/farms/${farmId}/new`);
  };

  const handleExpandStorage = async (additionalCapacity: number) => {
    if (!selectedStorage) return;
    
    try {
      setLoading(true);
      
      // Fixed cost per unit for storage expansion
      const costPerUnit = 0.01; // $0.01 per unit
      
      await integrationService.expandStorageWithPayment(
        selectedStorage.id,
        StorageType.FARM,
        additionalCapacity,
        costPerUnit
      );
      
      toast({
        title: "Storage Expanded",
        description: `Added ${formatBytes(additionalCapacity)} of storage capacity`,
      });
      
      // Reload storage data
      await loadFarmStorages();
      
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

  if (loading && !selectedStorage) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Farm Storage</h1>
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
          <h1 className="text-2xl font-bold">Farm Storage</h1>
          <Button onClick={handleCreateStorage}>
            <Plus className="h-4 w-4 mr-2" />
            Create Storage
          </Button>
        </div>
        
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No Storage Volumes</CardTitle>
            <CardDescription>
              This farm doesn't have any storage volumes yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Create your first storage volume</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Storage volumes allow your farm to allocate space for trading data, strategies, and market analysis.
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
          <h1 className="text-2xl font-bold">Farm Storage</h1>
          <p className="text-muted-foreground">Manage storage volumes for your farm</p>
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
                    value={((selectedStorage.usedSpace + selectedStorage.reservedSpace) / selectedStorage.capacity) * 100} 
                    className="h-2 mt-2"
                  />
                  <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-muted-foreground">
                    <div>
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                      Used: {formatBytes(selectedStorage.usedSpace)}
                    </div>
                    <div>
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                      Reserved: {formatBytes(selectedStorage.reservedSpace)}
                    </div>
                    <div>
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      Free: {formatBytes(selectedStorage.capacity - selectedStorage.usedSpace - selectedStorage.reservedSpace)}
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
                  <Button variant="outline" size="sm" className="w-full">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Health Check
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
                      Active allocations
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(selectedStorage.usedSpace / selectedStorage.capacity) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatBytes(selectedStorage.usedSpace)} allocated of {formatBytes(selectedStorage.capacity)}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setActiveTab('allocations')}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Manage Allocations
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Storage Usage History</CardTitle>
                <CardDescription>
                  30-day view of storage utilization
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <StorageUsageChart 
                  data={usageHistory} 
                  capacity={selectedStorage.capacity}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="allocations">
            <StorageAllocationTable 
              storageId={selectedStorage?.id || ''} 
              storageType={StorageType.FARM}
              onUpdate={handleRefresh}
            />
          </TabsContent>
          
          <TabsContent value="transactions">
            <StorageTransactionList 
              storageId={selectedStorage?.id || ''} 
              storageType={StorageType.FARM}
            />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Storage Settings</CardTitle>
                <CardDescription>
                  Manage settings for your storage volume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="text-sm font-medium">{selectedStorage.name}</div>
                      
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div className="text-sm font-medium">{selectedStorage.storageType}</div>
                      
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="text-sm">
                        <Badge className={getStatusColor(selectedStorage.status)}>
                          {selectedStorage.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="text-sm">{new Date(selectedStorage.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Advanced Settings</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-muted-foreground">Auto-expand</div>
                      <div className="text-sm font-medium">
                        {selectedStorage.settings.autoExpand ? 'Enabled' : 'Disabled'}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Expansion Threshold</div>
                      <div className="text-sm font-medium">
                        {selectedStorage.settings.expansionThresholdPercent || 80}%
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Max Capacity</div>
                      <div className="text-sm font-medium">
                        {formatBytes(selectedStorage.settings.maxCapacity || selectedStorage.capacity * 2)}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">Backup Enabled</div>
                      <div className="text-sm font-medium">
                        {selectedStorage.settings.backupEnabled ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">Linked Resources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Vault Account</span>
                      <span className="text-sm">
                        {selectedStorage.vaultAccountId ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {selectedStorage.vaultAccountId.substring(0, 8)}...
                          </Badge>
                        ) : 'None'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Farm ID</span>
                      <span className="text-sm">
                        <Badge variant="outline" className="font-mono text-xs">
                          {selectedStorage.farmId.substring(0, 8)}...
                        </Badge>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline">
                  <Sliders className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
                <Button variant="destructive">
                  <ServerOff className="h-4 w-4 mr-2" />
                  Deactivate Storage
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      <StorageExpansionDialog
        open={isExpansionDialogOpen}
        onOpenChange={setIsExpansionDialogOpen}
        currentCapacity={selectedStorage?.capacity || 0}
        onExpand={handleExpandStorage}
      />
    </div>
  );
} 