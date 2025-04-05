import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { storageService } from '@/services/serviceFactory';
import { formatBytes } from '@/utils/supabase/mocks-helper';

interface StorageSectionProps {
  agentId?: string;
  farmId?: string;
}

export function StorageSection({ agentId, farmId }: StorageSectionProps) {
  const [storageData, setStorageData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStorageData() {
      setLoading(true);
      setError(null);
      
      try {
        let data: any[] = [];
        
        // Fetch data based on what's available - either agent or farm
        if (agentId) {
          data = await storageService.getAgentStoragesByAgentId(agentId);
        } else if (farmId) {
          data = await storageService.getFarmStoragesByFarmId(farmId);
        } else {
          throw new Error('Either agentId or farmId must be provided');
        }
        
        setStorageData(data);
      } catch (err) {
        console.error('Failed to fetch storage data:', err);
        setError('Unable to load storage information. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchStorageData();
  }, [agentId, farmId]);

  // Calculate health status based on used space percentage
  const getHealthStatus = (usedSpace: number, capacity: number) => {
    const usedPercentage = (usedSpace / capacity) * 100;
    
    if (usedPercentage > 90) return { status: 'critical', color: 'bg-red-600' };
    if (usedPercentage > 70) return { status: 'warning', color: 'bg-amber-500' };
    return { status: 'healthy', color: 'bg-green-500' };
  };

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (storageData.length === 0) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No storage resources found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Storage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {storageData.map((storage) => {
            const usedPercentage = (storage.used_space / storage.capacity) * 100;
            const health = getHealthStatus(storage.used_space, storage.capacity);
            
            return (
              <div key={storage.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{storage.name}</h3>
                  <Badge variant={health.status === 'critical' ? 'destructive' : 'outline'}>
                    {health.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{storage.storage_type}</span>
                  <span>
                    {formatBytes(storage.used_space)} / {formatBytes(storage.capacity)}
                  </span>
                </div>
                <Progress value={usedPercentage} className={health.color} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
