'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';

export interface FileDropzoneProps {
  bucketName: string;
  path?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
  onUploadComplete?: (files: {
    path: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[]) => void;
}

export function FileDropzone({
  bucketName,
  path = '',
  acceptedFileTypes = ['image/*', 'application/pdf', 'text/plain', 'application/json', 'text/csv', 'application/python', '.py'],
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  multiple = true,
  onUploadComplete,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize) {
      setError(`File ${file.name} is too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`);
      return false;
    }

    // Check file type if acceptedFileTypes is provided
    if (acceptedFileTypes.length > 0) {
      const fileType = file.type;
      const fileExtension = `.${file.name.split('.').pop()}`;
      
      const isAccepted = acceptedFileTypes.some(type => {
        // Check if it's a wildcard type like 'image/*'
        if (type.includes('/*')) {
          const category = type.split('/')[0];
          return fileType.startsWith(`${category}/`);
        }
        // Check if it's a specific extension
        if (type.startsWith('.')) {
          return fileExtension.toLowerCase() === type.toLowerCase();
        }
        // Check if it's a specific mime type
        return fileType === type;
      });

      if (!isAccepted) {
        setError(`File type not supported for ${file.name}`);
        return false;
      }
    }

    return true;
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    // Filter files based on validation
    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;
    
    setUploading(true);
    setUploadedFiles(validFiles);
    
    const uploadResponses = [];
    let completedUploads = 0;

    for (const file of validFiles) {
      try {
        // Create a unique file path
        const timestamp = new Date().getTime();
        const filePath = path ? `${path}/${timestamp}_${file.name}` : `${timestamp}_${file.name}`;
        
        // Upload file to Supabase Storage
        const { data, error: uploadError } = await supabase
          .storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL for the file
        const { data: { publicUrl } } = supabase
          .storage
          .from(bucketName)
          .getPublicUrl(data.path);

        uploadResponses.push({
          path: data.path,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
        });

        // Update progress
        completedUploads++;
        setUploadProgress(Math.floor((completedUploads / validFiles.length) * 100));
        
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    // All files have been processed
    setUploading(false);
    
    if (uploadResponses.length > 0) {
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${uploadResponses.length} file(s)`,
      });
      
      if (onUploadComplete) {
        onUploadComplete(uploadResponses);
      }
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 flex items-center gap-2 text-destructive text-sm border border-destructive p-2 rounded-md bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
          hover:bg-accent/50 cursor-pointer flex flex-col items-center justify-center text-center
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          multiple={multiple}
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInput}
        />
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">
              {multiple ? 'Upload multiple files' : 'Upload a file'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Accepted file types: {acceptedFileTypes.join(', ')}
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum size: {maxFileSize / (1024 * 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Uploading {uploadedFiles.length} file(s)...</p>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  );
}
