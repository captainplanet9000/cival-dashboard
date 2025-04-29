'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, Power, Trash2, Play, PauseCircle } from 'lucide-react';
import { useFarms } from '@/hooks/use-farms';
import { useFarmErrorHandler } from '@/hooks/use-farm-fallback';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Farm Management Component
 * Allows users to create, edit, and manage trading farms
 */
export function FarmManagement() {
  // State for managing modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    risk_level: 'moderate',
    max_position_size: 0.1,
    markets: ['BTC/USD']
  });
  
  const { toast } = useToast();
  
  // Use our hooks with fallback for database issues
  const { data: farmsData, isLoading, error, refetch } = useFarms();
  const { getFarmFallbackData, createFarm, updateFarm, deleteFarm, toggleFarmActive } = useFarmErrorHandler();
  
  // Use fallback data if there's an error or no data yet
  const farms = error || !farmsData ? getFarmFallbackData() : farmsData;
  
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createFarm({
        name: formData.name,
        description: formData.description,
        config: {
          risk_level: formData.risk_level,
          max_position_size: parseFloat(formData.max_position_size.toString()),
          markets: formData.markets
        }
      });
      
      toast({
        title: "Farm created",
        description: "Your trading farm has been created successfully.",
      });
      
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast({
        title: "Error creating farm",
        description: "There was an error creating your farm. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateFarm(selectedFarm.id, {
        name: formData.name,
        description: formData.description,
        config: {
          ...selectedFarm.config,
          risk_level: formData.risk_level,
          max_position_size: parseFloat(formData.max_position_size.toString()),
          markets: formData.markets
        }
      });
      
      toast({
        title: "Farm updated",
        description: "Your trading farm has been updated successfully."
      });
      
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast({
        title: "Error updating farm",
        description: "There was an error updating your farm. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDelete = async () => {
    try {
      await deleteFarm(selectedFarm.id);
      
      toast({
        title: "Farm deleted",
        description: "Your trading farm has been deleted successfully."
      });
      
      setIsDeleteModalOpen(false);
      setSelectedFarm(null);
      refetch();
    } catch (err) {
      toast({
        title: "Error deleting farm",
        description: "There was an error deleting your farm. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleToggleActive = async (farm: any) => {
    try {
      await toggleFarmActive(farm.id, !farm.is_active);
      
      toast({
        title: farm.is_active ? "Farm paused" : "Farm activated",
        description: farm.is_active 
          ? "Your trading farm has been paused."
          : "Your trading farm has been activated."
      });
      
      refetch();
    } catch (err) {
      toast({
        title: "Error updating farm",
        description: "There was an error updating your farm status. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const openEditModal = (farm: any) => {
    setSelectedFarm(farm);
    setFormData({
      name: farm.name,
      description: farm.description || '',
      risk_level: farm.config?.risk_level || 'moderate',
      max_position_size: farm.config?.max_position_size || 0.1,
      markets: farm.config?.markets || ['BTC/USD']
    });
    setIsEditModalOpen(true);
  };
  
  const openDeleteModal = (farm: any) => {
    setSelectedFarm(farm);
    setIsDeleteModalOpen(true);
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      risk_level: 'moderate',
      max_position_size: 0.1,
      markets: ['BTC/USD']
    });
    setSelectedFarm(null);
  };
  
  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'conservative': return 'bg-blue-100 text-blue-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'aggressive': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Trading Farms</h2>
          <p className="text-muted-foreground">Create and manage automated trading strategies</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Farm
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.length === 0 ? (
            <Card className="col-span-full p-6 flex flex-col items-center justify-center">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-medium">No Farms Created</h3>
                <p className="text-muted-foreground">Create your first trading farm to get started.</p>
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Farm
                </Button>
              </div>
            </Card>
          ) : (
            farms.map((farm: any) => (
              <Card key={farm.id} className={`w-full ${!farm.is_active ? 'opacity-70' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle>{farm.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={getRiskBadgeColor(farm.config?.risk_level || 'moderate')}
                    >
                      {farm.config?.risk_level || 'moderate'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {farm.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={farm.is_active ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                        {farm.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Position Size:</span>
                      <span>{(farm.config?.max_position_size || 0) * 100}% of portfolio</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Markets:</span>
                      <span className="text-right">
                        {farm.config?.markets?.slice(0, 2).join(', ') || 'None'}
                        {(farm.config?.markets?.length || 0) > 2 ? 
                          ` +${(farm.config?.markets?.length || 0) - 2} more` : 
                          ''}
                      </span>
                    </div>
                    {farm.performance && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Return:</span>
                        <span className={farm.performance.monthly >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {farm.performance.monthly >= 0 ? '+' : ''}{farm.performance.monthly.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleToggleActive(farm)}
                      title={farm.is_active ? 'Pause Farm' : 'Activate Farm'}
                    >
                      {farm.is_active ? (
                        <PauseCircle className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditModal(farm)}
                      title="Edit Farm"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openDeleteModal(farm)}
                      title="Delete Farm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => window.location.href = `/farms/${farm.id}`}>
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Create Farm Modal - Following standardized modal pattern */}
      <DialogWrapper open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Trading Farm</DialogTitle>
            <DialogDescription>
              Set up a new automated trading farm with your preferred strategies and risk profile.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="risk_level" className="text-right">
                  Risk Level
                </Label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="max_position_size" className="text-right">
                  Max Position Size
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="max_position_size"
                    type="number"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={formData.max_position_size}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      max_position_size: parseFloat(e.target.value) 
                    })}
                    className="flex-1"
                  />
                  <span className="ml-2">of portfolio</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Markets
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="btc-market"
                      checked={formData.markets?.includes('BTC/USD')}
                      onCheckedChange={(checked) => {
                        const newMarkets = checked 
                          ? [...(formData.markets || []), 'BTC/USD'] 
                          : formData.markets?.filter(m => m !== 'BTC/USD');
                        setFormData({ ...formData, markets: newMarkets });
                      }}
                    />
                    <Label htmlFor="btc-market">BTC/USD</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="eth-market"
                      checked={formData.markets?.includes('ETH/USD')}
                      onCheckedChange={(checked) => {
                        const newMarkets = checked 
                          ? [...(formData.markets || []), 'ETH/USD'] 
                          : formData.markets?.filter(m => m !== 'ETH/USD');
                        setFormData({ ...formData, markets: newMarkets });
                      }}
                    />
                    <Label htmlFor="eth-market">ETH/USD</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sol-market"
                      checked={formData.markets?.includes('SOL/USD')}
                      onCheckedChange={(checked) => {
                        const newMarkets = checked 
                          ? [...(formData.markets || []), 'SOL/USD'] 
                          : formData.markets?.filter(m => m !== 'SOL/USD');
                        setFormData({ ...formData, markets: newMarkets });
                      }}
                    />
                    <Label htmlFor="sol-market">SOL/USD</Label>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Create Farm</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogWrapper>
      
      {/* Edit Farm Modal - Following standardized modal pattern */}
      <DialogWrapper open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Trading Farm</DialogTitle>
            <DialogDescription>
              Update your trading farm configuration.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-risk_level" className="text-right">
                  Risk Level
                </Label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-max_position_size" className="text-right">
                  Max Position Size
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="edit-max_position_size"
                    type="number"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={formData.max_position_size}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      max_position_size: parseFloat(e.target.value) 
                    })}
                    className="flex-1"
                  />
                  <span className="ml-2">of portfolio</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Markets
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-btc-market"
                      checked={formData.markets?.includes('BTC/USD')}
                      onCheckedChange={(checked) => {
                        const newMarkets = checked 
                          ? [...(formData.markets || []), 'BTC/USD'] 
                          : formData.markets?.filter(m => m !== 'BTC/USD');
                        setFormData({ ...formData, markets: newMarkets });
                      }}
                    />
                    <Label htmlFor="edit-btc-market">BTC/USD</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-eth-market"
                      checked={formData.markets?.includes('ETH/USD')}
                      onCheckedChange={(checked) => {
                        const newMarkets = checked 
                          ? [...(formData.markets || []), 'ETH/USD'] 
                          : formData.markets?.filter(m => m !== 'ETH/USD');
                        setFormData({ ...formData, markets: newMarkets });
                      }}
                    />
                    <Label htmlFor="edit-eth-market">ETH/USD</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-sol-market"
                      checked={formData.markets?.includes('SOL/USD')}
                      onCheckedChange={(checked) => {
                        const newMarkets = checked 
                          ? [...(formData.markets || []), 'SOL/USD'] 
                          : formData.markets?.filter(m => m !== 'SOL/USD');
                        setFormData({ ...formData, markets: newMarkets });
                      }}
                    />
                    <Label htmlFor="edit-sol-market">SOL/USD</Label>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogWrapper>
      
      {/* Delete Confirmation Modal - Following standardized modal pattern */}
      <DialogWrapper open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trading Farm</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trading farm? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFarm && (
            <div className="py-4">
              <p className="font-medium">{selectedFarm.name}</p>
              <p className="text-sm text-muted-foreground">{selectedFarm.description}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteModalOpen(false);
              setSelectedFarm(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogWrapper>
    </div>
  );
}
