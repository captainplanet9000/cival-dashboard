import { useState, useRef, useCallback, useMemo } from 'react';
import { useDropzone, DropzoneOptions, FileRejection, ErrorCode } from 'react-dropzone';
import { createBrowserClient } from '@/utils/supabase/client';

interface SupabaseUploadOptions {
  bucketName: string;
  path?: string;
  allowedMimeTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

export interface UseSupabaseUploadReturn {
  files: FileWithPreview[];
  setFiles: React.Dispatch<React.SetStateAction<FileWithPreview[]>>;
  getRootProps: <T extends HTMLElement = HTMLDivElement>(props?: DropzoneOptions) => import('react-dropzone').DropzoneRootProps;
  getInputProps: <T extends HTMLElement = HTMLInputElement>(props?: DropzoneOptions) => import('react-dropzone').DropzoneInputProps;
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onUpload: () => Promise<void>;
  loading: boolean;
  errors: UploadError[];
  successes: string[];
  isSuccess: boolean;
  maxFiles: number;
  maxFileSize: number;
}

export interface FileWithPreview extends File {
  preview: string;
  errors: { code: ErrorCode; message: string }[];
}

export interface UploadError {
  name: string;
  message: string;
}

export const useSupabaseUpload = ({
  bucketName,
  path = '',
  allowedMimeTypes = [],
  maxFiles = 1,
  maxFileSize = 10 * 1024 * 1024, // Default to 10MB
}: SupabaseUploadOptions): UseSupabaseUploadReturn => {
  const supabase = createBrowserClient();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [successes, setSuccesses] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        return;
      }

      // Add preview to accepted files and check if they meet additional requirements
      const acceptedFilesWithPreview = acceptedFiles.map((file) => {
        const fileWithPreview = Object.assign(file, {
          preview: URL.createObjectURL(file),
          errors: [] as { code: ErrorCode; message: string }[],
        });

        return fileWithPreview;
      });

      // Process rejected files
      const rejectedFilesWithPreview = fileRejections.map((rejection) => {
        const file = rejection.file;
        return Object.assign(file, {
          preview: URL.createObjectURL(file),
          errors: rejection.errors,
        });
      });

      setFiles((prevFiles) => [
        ...prevFiles,
        ...acceptedFilesWithPreview,
        ...rejectedFilesWithPreview,
      ]);

      setErrors([]);
      setSuccesses([]);
    },
    [files.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: maxFileSize,
    accept: allowedMimeTypes.length
      ? allowedMimeTypes.reduce<Record<string, string[]>>((acc, type) => {
          // Handle wildcards like "image/*"
          if (type.includes('*')) {
            const category = type.split('/')[0];
            acc[category] = ['*'];
          } else {
            const category = type.split('/')[0];
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(type.split('/')[1]);
          }
          return acc;
        }, {})
      : undefined,
  });

  const onUpload = useCallback(async () => {
    if (files.length === 0) return;

    setLoading(true);
    setErrors([]);
    setSuccesses([]);

    const newErrors: UploadError[] = [];
    const newSuccesses: string[] = [];

    // Upload each file
    await Promise.all(
      files.map(async (file) => {
        // Skip files with errors
        if (file.errors.length > 0) return;

        try {
          // Create a unique file path
          const timestamp = new Date().getTime();
          const filePath = `${path}/${timestamp}-${file.name}`;
          
          // Upload the file
          const { error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) {
            newErrors.push({
              name: file.name,
              message: error.message,
            });
          } else {
            newSuccesses.push(file.name);
          }
        } catch (err) {
          newErrors.push({
            name: file.name,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      })
    );

    setErrors(newErrors);
    setSuccesses(newSuccesses);
    setLoading(false);
  }, [files, path, bucketName, supabase.storage]);

  // Clean up previews when component unmounts
  const cleanup = useCallback(() => {
    files.forEach((file) => URL.revokeObjectURL(file.preview));
  }, [files]);

  // Check if all files were successfully uploaded
  const isSuccess = useMemo(() => {
    if (files.length === 0) return false;
    
    // If there are no errors and all files are in the successes array
    const allSuccessful = files.every((file) => 
      file.errors.length === 0 && successes.includes(file.name)
    );
    
    return allSuccessful && successes.length > 0;
  }, [files, successes]);

  return {
    files,
    setFiles,
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    inputRef,
    onUpload,
    loading,
    errors,
    successes,
    isSuccess,
    maxFiles,
    maxFileSize,
  };
}; 