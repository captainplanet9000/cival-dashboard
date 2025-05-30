import React, { useState } from 'react';
import { UploadCloud, X, FileText, FileCode, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrainFarm } from '@/hooks/useBrainFarm';
import { Badge } from '@/components/ui/badge';

interface DocumentUploaderProps {
  farmId?: string | number;
  onSuccess?: () => void;
}

export function DocumentUploader({ farmId, onSuccess }: DocumentUploaderProps) {
  const { uploadDocument } = useBrainFarm({ farmId });
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [documentType, setDocumentType] = useState('text');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File upload handling
  const [file, setFile] = useState<File | null>(null);
  
  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Auto-set document type based on file extension
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      setDocumentType('pdf');
    } else if (extension === 'json' || extension === 'js' || extension === 'ts') {
      setDocumentType('tradingview');
    } else {
      setDocumentType('text');
    }
    
    // Auto-set title if not set
    if (!title) {
      setTitle(selectedFile.name.split('.')[0]);
    }
    
    // Read file content for text files
    if (selectedFile.type.includes('text') || 
        selectedFile.type.includes('json') || 
        selectedFile.type.includes('javascript')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setContent(e.target.result as string);
        }
      };
      reader.readAsText(selectedFile);
    }
  };
  
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
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const result = await uploadDocument({
        title,
        content,
        documentType,
        tags,
        metadata: file ? {
          filename: file.name,
          fileType: file.type,
          fileSize: file.size
        } : {}
      });
      
      if (result.success) {
        // Reset form
        setTitle('');
        setContent('');
        setDocumentType('text');
        setTags([]);
        setFile(null);
        setIsOpen(false);
        
        // Call success callback
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || 'Failed to upload document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Get document type icon
  const getDocumentTypeIcon = () => {
    switch (documentType) {
      case 'pdf':
        return <FileIcon className="h-5 w-5 text-red-500" />;
      case 'tradingview':
        return <FileCode className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {getDocumentTypeIcon()}
            <span className="ml-2">Upload Document to Brain</span>
          </DialogTitle>
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
            <Select 
              value={documentType} 
              onValueChange={setDocumentType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="tradingview">TradingView Strategy</SelectItem>
                <SelectItem value="strategy">Trading Strategy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Document content"
              className="min-h-[150px]"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file">Upload File (Optional)</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <div className="text-sm text-muted-foreground">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </div>
            )}
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
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 