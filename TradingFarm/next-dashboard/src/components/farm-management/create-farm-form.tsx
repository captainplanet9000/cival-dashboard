'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { FarmCreateRequest } from '@/types/farm-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateFarmFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function CreateFarmForm({ onCancel, onSuccess }: CreateFarmFormProps) {
  const [formData, setFormData] = useState<FarmCreateRequest>({
    name: '',
    initialStatus: 'active',
    bossmanModel: 'ElizaOS-Basic'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Farm name is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/farm-management/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create farm: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Farm "${formData.name}" created successfully!`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onCancel();
    } catch (error) {
      console.error('Error creating farm:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create farm",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="farm-name">Farm Name</Label>
        <Input 
          id="farm-name"
          placeholder="Enter farm name..."
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="farm-status">Initial Status</Label>
        <Select 
          value={formData.initialStatus}
          onValueChange={(value) => setFormData({ ...formData, initialStatus: value as any })}
        >
          <SelectTrigger id="farm-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="bossman-model">BossMan Model</Label>
        <Select 
          value={formData.bossmanModel}
          onValueChange={(value) => setFormData({ ...formData, bossmanModel: value })}
        >
          <SelectTrigger id="bossman-model">
            <SelectValue placeholder="Select BossMan model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ElizaOS-Basic">ElizaOS Basic</SelectItem>
            <SelectItem value="ElizaOS-Advanced">ElizaOS Advanced</SelectItem>
            <SelectItem value="ElizaOS-Expert">ElizaOS Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-xs mr-2"></span>
              Creating...
            </>
          ) : 'Create Farm'}
        </Button>
      </div>
    </form>
  );
}
