'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createVault } from '@/services/vault-service';
import { CreateVaultRequest } from '@/types/vault-types';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CreateVaultDialogProps {
  userId: string;
  farmId?: string;
  onVaultCreated: () => void;
  showTrigger?: boolean;
}

export default function CreateVaultDialog({ 
  userId, 
  farmId, 
  onVaultCreated,
  showTrigger = true
}: CreateVaultDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vaultData, setVaultData] = useState<Partial<CreateVaultRequest>>({
    multi_sig_required: false,
    approvals_required: 1,
    owner_id: userId
  });
  const { toast } = useToast();
  
  const handleInputChange = (field: string, value: any) => {
    setVaultData({
      ...vaultData,
      [field]: value
    });
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!vaultData.name || !vaultData.owner_id) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please fill in all required fields."
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const request: CreateVaultRequest = {
        name: vaultData.name!,
        description: vaultData.description || '',
        owner_id: vaultData.owner_id!,
        multi_sig_required: vaultData.multi_sig_required || false,
        approvals_required: vaultData.approvals_required || 1,
        farm_id: farmId ? parseInt(farmId) : undefined,
        vault_type: vaultData.vault_type || 'personal',
        risk_level: vaultData.risk_level || 'low',
        status: 'active'
      };
      
      const result = await createVault(userId, request);
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Failed to create vault",
          description: result.error
        });
      } else {
        toast({
          title: "Vault created",
          description: `"${vaultData.name}" vault has been successfully created.`
        });
        
        setVaultData({
          multi_sig_required: false,
          approvals_required: 1,
          owner_id: userId
        });
        
        setOpen(false);
        onVaultCreated();
      }
    } catch (error) {
      console.error('Error creating vault:', error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "There was an error creating your vault. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Create New Vault</DialogTitle>
          <DialogDescription>
            Create a new vault to manage your assets and transactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Main Trading Vault"
              className="col-span-3"
              value={vaultData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Primary vault for trading activities..."
              className="col-span-3"
              value={vaultData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vault-type" className="text-right">
              Type
            </Label>
            <select
              id="vault-type"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={vaultData.vault_type || 'personal'}
              onChange={(e) => handleInputChange('vault_type', e.target.value)}
            >
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="trading">Trading</option>
              <option value="investment">Investment</option>
              <option value="custody">Custody</option>
            </select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="risk-level" className="text-right">
              Risk Level
            </Label>
            <select
              id="risk-level"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={vaultData.risk_level || 'low'}
              onChange={(e) => handleInputChange('risk_level', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="multi-sig" className="text-right">
              Multi-Sig
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="multi-sig"
                checked={vaultData.multi_sig_required}
                onCheckedChange={(checked) => {
                  handleInputChange('multi_sig_required', checked);
                  if (!checked) {
                    handleInputChange('approvals_required', 1);
                  }
                }}
              />
              <Label htmlFor="multi-sig">
                {vaultData.multi_sig_required 
                  ? 'Multiple approvals required' 
                  : 'Single approval'}
              </Label>
            </div>
          </div>
          
          {vaultData.multi_sig_required && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="approvals" className="text-right">
                Approvals
              </Label>
              <Input
                id="approvals"
                type="number"
                min={1}
                max={10}
                className="col-span-3"
                value={vaultData.approvals_required}
                onChange={(e) => handleInputChange('approvals_required', parseInt(e.target.value))}
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !vaultData.name}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Vault'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
  
  if (!showTrigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Vault
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
