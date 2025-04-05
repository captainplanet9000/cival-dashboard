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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { storageService } from '@/services/storageService';
import { AllocationFilter, StorageAllocation, StorageType } from '@/types/storage';
import { formatBytes, formatDate } from '@/lib/utils';
import { Loader2, Trash2, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtering state
  const [filter, setFilter] = useState<{
    isActive?: boolean;
    allocatedToType?: string;
    search?: string;
  }>({ isActive: true });
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    allocationId: string;
    allocationName: string;
  }>({
    isOpen: false,
    allocationId: '',
    allocationName: ''
  });

  useEffect(() => {
    loadAllocations();
  }, [storageId, storageType, page, itemsPerPage, filter]);

  const loadAllocations = async () => {
    try {
      setLoading(true);
      setLoadingError(null);
      
      const fullFilter: AllocationFilter = {
        storageId,
        storageType,
        ...filter,
        offset: (page - 1) * itemsPerPage,
        limit: itemsPerPage
      };
      
      // First get the total count for pagination
      const totalCount = await storageService.getStorageAllocationsCount(fullFilter);
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      
      // Now get the actual allocations for this page
      const data = await storageService.getStorageAllocations(fullFilter);
      setAllocations(data);
    } catch (error) {
      console.error('Error loading allocations:', error);
      setLoadingError((error as Error).message || 'Failed to load storage allocations');
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
      setConfirmDialog({ isOpen: false, allocationId: '', allocationName: '' });
    }
  };

  const openConfirmDialog = (allocation: StorageAllocation) => {
    const allocationName = allocation.purpose || allocation.allocatedToId.substring(0, 8);
    setConfirmDialog({
      isOpen: true,
      allocationId: allocation.id,
      allocationName
    });
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(1); // Reset to first page when filter changes
  };

  const resetFilters = () => {
    setFilter({ isActive: true });
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  if (loading && allocations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Storage Allocations</h3>
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
        
        <div className="border rounded-md">
          <div className="p-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading storage allocations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Storage Allocations</h3>
          <Button variant="outline" size="sm" onClick={loadAllocations}>
            <Loader2 className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <div className="border border-destructive/50 rounded-md bg-destructive/10 p-8 text-center">
          <p className="text-sm text-destructive">Error loading allocations: {loadingError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4" 
            onClick={loadAllocations}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Storage Allocations</h3>
          <div className="flex gap-2">
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Filter Allocations</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                      Status
                    </Label>
                    <Select 
                      value={filter.isActive?.toString() || 'all'}
                      onValueChange={(value) => handleFilterChange('isActive', value === 'all' ? undefined : value === 'true')}
                      className="col-span-3"
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">
                      Type
                    </Label>
                    <Select 
                      value={filter.allocatedToType || 'all'}
                      onValueChange={(value) => handleFilterChange('allocatedToType', value === 'all' ? undefined : value)}
                      className="col-span-3"
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="strategy">Strategy</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="model">Model</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="search" className="text-right">
                      Search
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Input
                        id="search"
                        value={filter.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Search allocations"
                      />
                      {filter.search && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="ml-1"
                          onClick={() => handleFilterChange('search', '')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                  <Button onClick={() => setFilterOpen(false)}>
                    Apply Filters
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm" onClick={loadAllocations} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Loader2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground mb-2">No storage allocations found</p>
          <p className="text-xs text-muted-foreground">
            {Object.keys(filter).length > 1 || (filter.isActive !== true) ? 
              'Try adjusting your filter criteria' : 
              'No allocations have been created for this storage volume yet'}
          </p>
          {Object.keys(filter).length > 1 || (filter.isActive !== true) ? (
            <Button variant="link" onClick={resetFilters} className="mt-2">
              Reset Filters
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Storage Allocations</h3>
        <div className="flex gap-2">
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {Object.keys(filter).length > 1 || (filter.isActive !== true) ? (
                  <Badge className="ml-2 bg-primary">
                    {Object.keys(filter).length - (filter.isActive !== undefined ? 1 : 0)}
                  </Badge>
                ) : null}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Filter Allocations</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select 
                    value={filter.isActive?.toString() || 'all'}
                    onValueChange={(value) => handleFilterChange('isActive', value === 'all' ? undefined : value === 'true')}
                    className="col-span-3"
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <Select 
                    value={filter.allocatedToType || 'all'}
                    onValueChange={(value) => handleFilterChange('allocatedToType', value === 'all' ? undefined : value)}
                    className="col-span-3"
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="strategy">Strategy</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="model">Model</SelectItem>
                      <SelectItem value="data">Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="search" className="text-right">
                    Search
                  </Label>
                  <div className="col-span-3 flex items-center">
                    <Input
                      id="search"
                      value={filter.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Search allocations"
                    />
                    {filter.search && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="ml-1"
                        onClick={() => handleFilterChange('search', '')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <Button onClick={() => setFilterOpen(false)}>
                  Apply Filters
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={loadAllocations} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Loader2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
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
            {loading && allocations.length > 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <span className="text-sm text-muted-foreground block mt-2">Loading allocations...</span>
                </TableCell>
              </TableRow>
            ) : (
              allocations.map(allocation => (
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
                        onClick={() => openConfirmDialog(allocation)}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, isOpen: open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Storage Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the allocation for {confirmDialog.allocationName}? 
              This will revoke access to the allocated storage space.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeactivateAllocation(confirmDialog.allocationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 