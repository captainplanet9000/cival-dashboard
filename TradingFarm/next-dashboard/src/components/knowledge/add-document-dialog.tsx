'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import knowledgeService from '@/services/knowledge-service-factory';
import { useUser } from '@/hooks/use-user';
import { useFarm } from '@/hooks/use-farm';

interface AddDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  onDocumentAdded: () => void;
}

// Document type options
const DOCUMENT_TYPES = [
  { value: 'guide', label: 'Guide' },
  { value: 'policy', label: 'Policy' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'research', label: 'Research' },
  { value: 'documentation', label: 'Documentation' },
];

export default function AddDocumentDialog({ 
  open, 
  onClose, 
  onDocumentAdded 
}: AddDocumentDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const { currentFarm } = useFarm();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    document_type: 'guide',
    source: 'internal',
    is_public: false
  });
  
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }
  
  function handleSelectChange(name: string, value: string) {
    setFormData(prev => ({ ...prev, [name]: value }));
  }
  
  function handleCheckboxChange(name: string, checked: boolean) {
    setFormData(prev => ({ ...prev, [name]: checked }));
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await knowledgeService.addDocument({
        ...formData,
        created_by: user?.id,
        farm_id: currentFarm?.id,
        metadata: {
          creator: user?.email || user?.id,
          farm_name: currentFarm?.name,
          created_from: 'dashboard'
        }
      });
      
      if (result.success) {
        onDocumentAdded();
        resetForm();
      } else {
        toast({
          title: 'Error adding document',
          description: result.error || 'An error occurred while adding the document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: 'Error adding document',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  function resetForm() {
    setFormData({
      title: '',
      description: '',
      content: '',
      document_type: 'guide',
      source: 'internal',
      is_public: false
    });
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Document to Knowledge Base</DialogTitle>
          <DialogDescription>
            Enter the details of the document you want to add to the ElizaOS knowledge base.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Document title"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.document_type}
                  onValueChange={(value) => handleSelectChange('document_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="e.g., internal, blog, research paper"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the document"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Content <span className="text-destructive">*</span></Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Document content..."
                className="min-h-[200px]"
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => 
                  handleCheckboxChange('is_public', checked as boolean)
                }
              />
              <Label htmlFor="is_public" className="cursor-pointer">
                Make this document public to all users
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Document'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
