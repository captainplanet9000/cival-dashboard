"use client";

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { storageService } from '@/services/storageService';
import { AllocationFilter, StorageAllocation, StorageType } from '@/types/storage';
import { formatBytes, formatDate } from '@/lib/utils';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface StorageAllocationTableProps {
  storageId: string;
  storageType: StorageType;
  onAllocationChanged?: () => void;
}

export default function StorageAllocationTable({
  storageId,
  storageType,
  onAllocationChanged
}: StorageAllocationTableProps) {
  const [allocations, setAllocations] = useState<StorageAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    loadAllocations();
  }, [storageId, storageType]);

  const loadAllocations = async () => {
    try {
      setLoading(true);
      const filter: AllocationFilter = {
        storageId,
        storageType
      };
      const data = await storageService.getStorageAllocations(filter);
      setAllocations(data);
    } catch (error) {
      console.error('Error loading allocations:', error);
      toast({
        title: "Error",
        description: "Failed to load storage allocations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAllocation = async (allocationId: string) => {
    try {
      setDeactivatingId(allocationId);
      await storageService.updateStorageAllocation(allocationId, false);
      toast({
        title: "Allocation Deactivated",
        description: "The storage allocation has been successfully deactivated"
      });
      loadAllocations();
      
      if (onAllocationChanged) {
        onAllocationChanged();
      }
    } catch (error) {
      console.error('Error deactivating allocation:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate allocation",
        variant: "destructive"
      });
    } finally {
      setDeactivatingId(null);
    }
  };

  if (loading && allocations.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No storage allocations found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Allocated To</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allocations.map(allocation => (
            <TableRow key={allocation.id}>
              <TableCell className="font-medium">
                {allocation.allocatedToId.substring(0, 8)}...
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {allocation.allocatedToType}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatBytes(allocation.amount)}
              </TableCell>
              <TableCell>{allocation.purpose || 'General'}</TableCell>
              <TableCell>{formatDate(allocation.createdAt)}</TableCell>
              <TableCell>
                <Badge className={allocation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {allocation.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {allocation.isActive && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeactivateAllocation(allocation.id)}
                    disabled={deactivatingId === allocation.id}
                  >
                    {deactivatingId === allocation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 