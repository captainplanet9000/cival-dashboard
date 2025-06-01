'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, FileText, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { createBrowserClient } from '@/utils/supabase/client';

// Allowed file types and extensions
const ALLOWED_FILE_TYPES = {
  '.pine': 'pinescript',
  '.pdf': 'pdf',
  '.txt': 'text',
  '.md': 'markdown',
  '.json': 'json'
};

interface AssetDropzoneProps {
  onSuccess?: (assetData: any) => void;
}

export function AssetDropzone({ onSuccess }: AssetDropzoneProps) {
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  
  const supabase = createBrowserClient();

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    // Reset states
    setUploadSuccess(false);
    
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const selectedFile = acceptedFiles[0];
    
    // Validate file extension
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    const isValidType = fileExtension in ALLOWED_FILE_TYPES;
    
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload a supported file type (.pine, .pdf, .txt, .md, .json)",
        variant: "destructive"
      });
      return;
    }
    
    // Set file and default title
    setFile(selectedFile);
    setTitle(selectedFile.name.replace(fileExtension, ''));
  }, [toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'text/x-pine': ['.pine'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/json': ['.json'],
    }
  });

  const uploadFile = async () => {
    if (!file) return;
    
    try {
      setUploading(true);
      
      // Start progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev: number) => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 200);
      
      // Get file extension and determine asset type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const assetType = ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES];
      
      // Use Supabase Storage for direct upload
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${assetType}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('farm_brain_assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (storageError) {
        clearInterval(progressInterval);
        throw new Error(`Storage error: ${storageError.message}`);
      }
      
      // Create record in brain_assets table
      const { data: assetData, error: assetError } = await supabase
        .from('brain_assets')
        .insert({
          filename: file.name,
          title: title || file.name,
          description: description,
          asset_type: assetType,
          storage_path: filePath,
          source: 'user_upload',
          metadata: { originalType: file.type }
        })
        .select()
        .single();
      
      clearInterval(progressInterval);
      
      if (assetError) {
        // Attempt to clean up the uploaded file if database insert fails
        await supabase.storage.from('farm_brain_assets').remove([filePath]);
        throw new Error(`Database error: ${assetError.message}`);
      }
      
      // Process the asset (in real app, this would likely be handled by a Supabase Edge Function trigger)
      const processResponse = await fetch('/api/brain/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: assetData.id
        }),
      });
      
      setUploadProgress(100);
      setUploadSuccess(true);
      
      toast({
        title: "Upload successful",
        description: `${file.name} has been added to the brain.`
      });
      
      if (onSuccess) {
        onSuccess(assetData);
      }
      
      // Reset form after short delay
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setDescription('');
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Upload Brain Asset</h3>
        <p className="text-sm text-muted-foreground">
          Drag and drop a file to add it to the farm's brain. Supported formats include PineScript (.pine), 
          PDFs, text files, markdown, and JSON.
        </p>
      </div>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          {isDragActive ? (
            <p>Drop the file here...</p>
          ) : (
            <p>Drag & drop a file here, or click to select</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Supported files: .pine, .pdf, .txt, .md, .json (max 10MB)
          </p>
        </div>
      </div>
      
      {file && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {uploadSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Enter a title for this asset"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Enter a description of this asset"
                rows={3}
              />
            </div>
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button
              onClick={uploadFile}
              disabled={uploading || !title || uploadSuccess}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload to Brain
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
