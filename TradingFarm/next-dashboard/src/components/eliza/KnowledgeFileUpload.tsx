'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileUp, FileText, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Categories for knowledge base files
const FILE_CATEGORIES = [
  { value: 'trading_strategy', label: 'Trading Strategy' },
  { value: 'market_analysis', label: 'Market Analysis' },
  { value: 'risk_management', label: 'Risk Management' },
  { value: 'exchange_info', label: 'Exchange Information' },
  { value: 'general', label: 'General Knowledge' },
];

type UploadState = 'idle' | 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';

export function KnowledgeFileUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [category, setCategory] = useState<string>('general');
  const [dragActive, setDragActive] = useState(false);
  const [tags, setTags] = useState<string>('');
  
  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  // Handle drop event
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  }, []);
  
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  // Extract text content from files
  const extractTextFromFile = async (file: File) => {
    if (file.type === 'application/pdf') {
      toast({
        title: 'PDF processing',
        description: 'PDF text extraction is not fully implemented. Only metadata will be processed.',
      });
      return `File: ${file.name}\nType: PDF\nSize: ${(file.size / 1024).toFixed(2)} KB`;
    }
    
    if (file.type.startsWith('text/') || 
        file.type === 'application/json' || 
        file.type === 'application/markdown' ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt')) {
      try {
        return await file.text();
      } catch (error) {
        console.error('Error reading text file:', error);
        return `Error extracting text from ${file.name}`;
      }
    }
    
    return `Binary file: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(2)} KB`;
  };
  
  // Process and upload files
  const uploadFiles = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select one or more files to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setUploadState('preparing');
      setUploadProgress(0);
      
      // Create unique folder for this upload batch
      const folderName = `knowledge/${uuidv4()}`;
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${folderName}/${file.name}`;
        
        // Extract text content for knowledge base
        setUploadState('processing');
        const textContent = await extractTextFromFile(file);
        
        // Upload file to Supabase Storage
        setUploadState('uploading');
        const { error: uploadError } = await supabase.storage
          .from('eliza-storage')
          .upload(fileName, file, {
            upsert: true,
            onUploadProgress: (progress) => {
              const progressPercent = (progress.loaded / progress.total) * 100;
              setUploadProgress(progressPercent);
            },
          });
        
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL for the file
        const { data: urlData } = supabase.storage
          .from('eliza-storage')
          .getPublicUrl(fileName);
        
        // Create knowledge base entry
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        
        const { error: knowledgeError } = await supabase
          .from('knowledge_base')
          .insert({
            title: file.name,
            content: textContent,
            category: category,
            tags: tagArray,
            metadata: {
              fileType: file.type,
              fileSize: file.size,
              url: urlData.publicUrl,
              uploadDate: new Date().toISOString(),
            },
          });
        
        if (knowledgeError) {
          throw knowledgeError;
        }
        
        // Update progress for multiple files
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      
      setUploadState('complete');
      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${files.length} file(s) to the knowledge base.`,
      });
      
      // Reset the form
      setTimeout(() => {
        setFiles([]);
        setUploadProgress(0);
        setUploadState('idle');
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadState('error');
      toast({
        title: 'Upload failed',
        description: error.message || 'There was an error uploading your files.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Knowledge Files</CardTitle>
        <CardDescription>
          Add documents to the ElizaOS knowledge base for agents to use in decision making
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* File drop area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {files.length > 0 ? (
            <div className="space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">{files.length} file(s) selected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {files.map(f => f.name).join(', ')}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFiles([])}
                disabled={uploadState !== 'idle'}
              >
                Clear selection
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <FileUp className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">Drag & drop files here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Or click to browse files
                </p>
              </div>
              <Input
                type="file"
                className="hidden"
                id="file-upload"
                multiple
                onChange={handleFileChange}
              />
              <Button 
                variant="outline" 
                asChild
              >
                <Label htmlFor="file-upload" className="cursor-pointer">
                  Select Files
                </Label>
              </Button>
            </div>
          )}
        </div>
        
        {/* Category and tags */}
        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={category} 
              onValueChange={setCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {FILE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              placeholder="trading, strategy, bitcoin"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>
        
        {/* Upload progress */}
        {uploadState !== 'idle' && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {uploadState === 'preparing' && 'Preparing...'}
                {uploadState === 'processing' && 'Processing files...'}
                {uploadState === 'uploading' && 'Uploading...'}
                {uploadState === 'complete' && 'Upload complete!'}
                {uploadState === 'error' && 'Upload failed'}
              </span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setFiles([])}
          disabled={files.length === 0 || uploadState !== 'idle'}
        >
          Cancel
        </Button>
        <Button 
          onClick={uploadFiles}
          disabled={files.length === 0 || uploadState !== 'idle'}
          className="min-w-[120px]"
        >
          {uploadState === 'idle' && 'Upload'}
          {uploadState === 'preparing' && 
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing</>}
          {uploadState === 'processing' && 
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>}
          {uploadState === 'uploading' && 
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading</>}
          {uploadState === 'complete' && 
            <><Check className="mr-2 h-4 w-4" /> Complete</>}
          {uploadState === 'error' && 
            <><AlertTriangle className="mr-2 h-4 w-4" /> Failed</>}
        </Button>
      </CardFooter>
    </Card>
  );
}
