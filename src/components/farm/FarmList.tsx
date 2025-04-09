'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LineIcon from 'lineicons-react';
import { AssignAgentDialog } from './AssignAgentDialog';
import { farmService, Farm } from '@/services/farm-service';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function FarmList() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  useEffect(() => {
    const fetchFarms = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await farmService.getFarms();
        if (response.error) {
          setError(response.error);
        } else {
          const numericFarms = response.data?.map((farm: Farm) => ({ ...farm, id: Number(farm.id) })) || [];
          setFarms(numericFarms);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFarms();
  }, []);

  const getStatusColor = (status: Farm['status']) => {
    const lowerStatus = status?.toLowerCase() ?? '';
    switch (lowerStatus) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'stopped':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleAssignAgent = (farmId: number) => {
    const farm = farms.find(f => f.id === farmId);
    setSelectedFarm(farm || null);
    setIsAssignDialogOpen(true);
  };

  const handleToggleStatus = (farmId: number, currentStatus: string | undefined) => {
    console.log(`Toggle status for farm ${farmId}, current: ${currentStatus}`);
  };

  const handleFarmSettings = (farmId: number) => {
    console.log(`Navigate to settings for farm ${farmId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <LineIcon name="spinner" className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading farms...</span>
      </div>
    );
  }

  if (error) {
    return (
       <Alert variant="destructive">
        <LineIcon name="terminal" className="h-4 w-4" />
        <AlertTitle>Error Fetching Farms</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Farm Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Agents</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {farms.map((farm: Farm) => (
            <TableRow key={farm.id}>
              <TableCell className="font-medium">{farm.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={getStatusColor(farm.status)}>
                  {farm.status ? farm.status.charAt(0).toUpperCase() + farm.status.slice(1) : 'Unknown'}
                </Badge>
              </TableCell>
              <TableCell>{farm.agents_count ?? 'N/A'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(farm.id, farm.status)} title={farm.status === 'active' ? 'Pause Farm' : 'Activate Farm'}>
                    {farm.status === 'active' ? (
                      <LineIcon name="pause" className="h-4 w-4" />
                    ) : (
                      <LineIcon name="play" className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleAssignAgent(farm.id)}
                    title="Assign Agents"
                  >
                    <LineIcon name="users" className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleFarmSettings(farm.id)} title="Farm Settings">
                    <LineIcon name="cog" className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="View Details">
                    <Link href={`/dashboard/farms/${farm.id}`}>
                      <LineIcon name="chevron-right" className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedFarm && (
        <AssignAgentDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          farm={selectedFarm}
        />
      )}
    </div>
  );
} 