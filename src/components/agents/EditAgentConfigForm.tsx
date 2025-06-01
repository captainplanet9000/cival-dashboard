import React, { useState } from 'react';
import { FarmAgent } from '@/services/farm/farm-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface EditAgentConfigFormProps {
  agent: FarmAgent;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedAgent: FarmAgent) => void;
}

export const EditAgentConfigForm: React.FC<EditAgentConfigFormProps> = ({
  agent,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState<Partial<FarmAgent>>({
    name: agent.name,
    description: agent.description,
    type: agent.type,
    isActive: agent.isActive,
    permissions: { ...agent.permissions }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handlePermissionSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [name]: checked
      }
    }));
  };

  const handlePermissionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name === 'maxTradeAmount' ? parseFloat(value) : value;
    
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [name]: numValue
      }
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // In a real implementation, this would make an API call to update the agent
      // For now, we'll simulate a successful update
      const updatedAgent: FarmAgent = {
        ...agent,
        ...formData,
        updatedAt: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call the parent's update handler
      onUpdate(updatedAgent);
    } catch (err: any) {
      setError(err.message || 'Failed to update agent');
      console.error('Error updating agent:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Agent Configuration</DialogTitle>
          <DialogDescription>
            Update the configuration for {agent.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name || ''} 
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANALYST">Analyst</SelectItem>
                    <SelectItem value="TRADER">Trader</SelectItem>
                    <SelectItem value="MONITOR">Monitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description || ''} 
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="isActive" 
                checked={formData.isActive || false} 
                onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Permissions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="canTrade" 
                    checked={formData.permissions?.canTrade || false} 
                    onCheckedChange={(checked) => handlePermissionSwitchChange('canTrade', checked)}
                  />
                  <Label htmlFor="canTrade">Can Trade</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="canAccessApi" 
                    checked={formData.permissions?.canAccessApi || false} 
                    onCheckedChange={(checked) => handlePermissionSwitchChange('canAccessApi', checked)}
                  />
                  <Label htmlFor="canAccessApi">API Access</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="canUseLlm" 
                    checked={formData.permissions?.canUseLlm || false} 
                    onCheckedChange={(checked) => handlePermissionSwitchChange('canUseLlm', checked)}
                  />
                  <Label htmlFor="canUseLlm">LLM Access</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxTradeAmount">Max Trade Amount ($)</Label>
                <Input 
                  id="maxTradeAmount" 
                  name="maxTradeAmount" 
                  type="number"
                  value={formData.permissions?.maxTradeAmount || ''} 
                  onChange={handlePermissionInputChange}
                  disabled={!formData.permissions?.canTrade}
                />
              </div>
            </div>
          </div>
          
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 