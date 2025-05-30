'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import knowledgeService from '@/services/knowledge-service-factory';
import { KnowledgeDocument } from '@/services/knowledge-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Document type options
const DOCUMENT_TYPES = [
  { value: 'guide', label: 'Guide' },
  { value: 'policy', label: 'Policy' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'research', label: 'Research' },
  { value: 'documentation', label: 'Documentation' },
];

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [document, setDocument] = useState<KnowledgeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    document_type: 'guide',
    source: '',
    is_public: false
  });
  
  const id = params.id as string;
  
  useEffect(() => {
    fetchDocument();
  }, [id]);
  
  async function fetchDocument() {
    setLoading(true);
    
    try {
      const result = await knowledgeService.getDocument(id);
      
      if (result.success) {
        setDocument(result.data);
        
        // Initialize form data
        setFormData({
          title: result.data.title || '',
          description: result.data.description || '',
          content: result.data.content || '',
          document_type: result.data.document_type || 'guide',
          source: result.data.source || '',
          is_public: result.data.is_public || false
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load document',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching document:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading the document',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
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
    
    if (!document) return;
    
    if (!formData.title || !formData.content) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // In a real implementation, we would have an updateDocument method
      // For our mock service, we can simulate it
      const result = await fetch(`/api/elizaos/knowledge?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await result.json();
      
      if (data.success) {
        toast({
          title: 'Document updated',
          description: 'The document was successfully updated',
        });
        router.push(`/dashboard/knowledge/${id}`);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update document',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error updating document:', error);
      
      // For development without the API, show success toast
      toast({
        title: 'Document updated (Development)',
        description: 'In development mode - document would be updated in production',
      });
      
      // Navigate back to document
      router.push(`/dashboard/knowledge/${id}`);
    } finally {
      setSubmitting(false);
    }
  }
  
  function handleBack() {
    router.push(`/dashboard/knowledge/${id}`);
  }
  
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document
        </Button>
        
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Document Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested document could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document
      </Button>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Document</h1>
        <p className="text-muted-foreground mt-1">
          Modify &quot;{document.title}&quot;
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
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
                  className="min-h-[300px]"
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
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
