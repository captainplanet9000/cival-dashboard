import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { createBrowserClient } from '@/utils/supabase/client';

export interface UseSupabaseUploadProps {
  bucketName: string;
  path: string;
  allowedMimeTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number;
  onComplete?: (urls: string[]) => void;
}

export interface UseSupabaseUploadReturn {
  files: any[];
  setFiles: (files: any[]) => void;
  getRootProps: any;
  getInputProps: any;
  isDragActive: boolean;
  isDragReject: boolean;
  onUpload: () => Promise<void>;
  loading: boolean;
  errors: { name: string; message: string }[];
  successes: string[];
  inputRef: React.RefObject<HTMLInputElement>;
  maxFiles: number;
  maxFileSize: number;
  isSuccess: boolean;
}

export function useSupabaseUpload({
  bucketName,
  path,
  allowedMimeTypes = [],
  maxFiles = 1,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  onComplete,
}: UseSupabaseUploadProps): UseSupabaseUploadReturn {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [successes, setSuccesses] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const filesWithErrors = rejectedFiles.map(rejected => {
          const file = Object.assign(rejected.file, {
            preview: rejected.file.type.startsWith('image/') 
              ? URL.createObjectURL(rejected.file) 
              : undefined,
            errors: rejected.errors,
          });
          return file;
        });
        
        setFiles(prev => [...prev, ...filesWithErrors].slice(0, maxFiles));
        return;
      }
      
      // Limit to max files
      const newFiles = acceptedFiles.slice(0, maxFiles - files.length);

      // Add preview for images
      const filesWithPreview = newFiles.map(file => 
        Object.assign(file, {
          preview: file.type.startsWith('image/') 
            ? URL.createObjectURL(file) 
            : undefined,
          errors: [],
        })
      );

      setFiles(prev => [...prev, ...filesWithPreview].slice(0, maxFiles));
    },
    [files, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, inputRef } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: maxFileSize,
    accept: allowedMimeTypes.length > 0 
      ? allowedMimeTypes.reduce((acc, type) => {
          // Handle mime type patterns like 'image/*'
          if (type.includes('/*')) {
            const mainType = type.split('/')[0];
            return { ...acc, [mainType]: [] };
          }
          return { ...acc, [type]: [] };
        }, {} as Record<string, string[]>)
      : undefined,
  });

  // Clean up previews
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  const onUpload = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    setErrors([]);
    setSuccesses([]);
    setUploadedUrls([]);
    setIsSuccess(false);

    try {
      const supabase = createBrowserClient();
      const urls: string[] = [];
      
      // Process each file
      for (const file of files) {
        if (file.errors.length > 0) continue;

        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path ? `${path}/${filename}` : filename;

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          setErrors(prev => [...prev, { name: file.name, message: error.message }]);
        } else {
          setSuccesses(prev => [...prev, file.name]);
          
          // Get public URL for the file
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
            
          urls.push(publicUrl);
        }
      }

      setUploadedUrls(urls);

      // Check if all files were successful
      const allSuccessful = files.every(file => 
        file.errors.length > 0 || successes.includes(file.name)
      );
      
      if (allSuccessful) {
        setIsSuccess(true);
        if (onComplete) {
          onComplete(urls);
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    files,
    setFiles,
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    onUpload,
    loading,
    errors,
    successes,
    inputRef,
    maxFiles,
    maxFileSize,
    isSuccess,
  };
} 