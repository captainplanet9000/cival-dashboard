'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud } from 'lucide-react';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/brain/dropzone';
import { useBrainFarm } from '@/hooks/useBrainFarm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface EnhancedDocumentUploaderProps {
  farmId?: string | number;
  onSuccess?: () => void;
}

export function EnhancedDocumentUploader({ farmId, onSuccess }: EnhancedDocumentUploaderProps) {
  const { uploadDocument } = useBrainFarm({ farmId });
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [documentType, setDocumentType] = useState('text');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Configure the Supabase upload hook
  const dropzoneProps = useSupabaseUpload({
    bucketName: 'brain-documents',
    path: farmId ? `farm-${farmId}` : 'documents',
    allowedMimeTypes: ['image/*', 'application/pdf', 'text/*', 'application/json'],
    maxFiles: 5,
    maxFileSize: 1000 * 1000 * 10, // 10MB
  });

  // Handle successful file upload and update content from files
  useEffect(() => {
    const updateContentFromFiles = async () => {
      if (dropzoneProps.isSuccess && dropzoneProps.files.length > 0) {
        // Try to extract content from successful file uploads
        const file = dropzoneProps.files[0]; // Use the first file as primary source
        
        // Auto-set title if not already set
        if (!title && file) {
          setTitle(file.name.split('.')[0]);
        }
        
        // Set document type based on file
        if (file) {
          if (file.type.includes('pdf')) {
            setDocumentType('pdf');
          } else if (file.type.includes('json') || file.name.endsWith('.js') || file.name.endsWith('.ts')) {
            setDocumentType('tradingview');
          } else if (file.type.includes('image')) {
            setDocumentType('image');
          } else {
            setDocumentType('text');
          }
        }
      }
    };
    
    updateContentFromFiles();
  }, [dropzoneProps.isSuccess, dropzoneProps.files, title]);

  // Handle tag addition
  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };
  
  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    setError(null);
    
    // Prepare metadata from successful uploads
    const fileMetadata = dropzoneProps.files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      path: `${dropzoneProps.files.indexOf(file)}`,
      url: `${farmId ? `farm-${farmId}` : 'documents'}/${new Date().getTime()}-${file.name}`
    }));
    
    try {
      const result = await uploadDocument({
        title,
        content: content || JSON.stringify(fileMetadata),
        documentType,
        tags,
        metadata: {
          files: fileMetadata,
          uploadedAt: new Date().toISOString()
        }
      });
      
      if (result.success) {
        // Reset form
        setTitle('');
        setContent('');
        setDocumentType('text');
        setTags([]);
        dropzoneProps.setFiles([]);
        setIsOpen(false);
        
        // Call success callback
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || 'Failed to upload document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="h-4 w-4 mr-2" />
          Upload to Brain
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload Documents to Brain</DialogTitle>
          <DialogDescription>
            Add documents, strategies, or knowledge to your farm's brain.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 text-red-800 p-2 rounded text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <Dropzone {...dropzoneProps} className="min-h-[150px]">
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="tradingview">TradingView Strategy</SelectItem>
                  <SelectItem value="strategy">Trading Strategy</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Additional Content (Optional)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Additional document content or notes"
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="Add tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddTag}
                disabled={!currentTag.trim()}
              >
                Add
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} className="px-2 py-1 flex items-center">
                    {tag}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || (dropzoneProps.files.length === 0 && !content.trim())}
            >
              Save to Brain
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 