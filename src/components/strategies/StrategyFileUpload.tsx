'use client'

import { useState, useEffect } from 'react';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createBrowserClient } from '@/utils/supabase/client';
import { FileType, File as LucideFile, Trash2, Download, RefreshCw, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export interface StrategyFile {
  id: string;
  strategy_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface StrategyFileUploadProps {
  strategyId: string;
  onUploadComplete?: () => void;
}

export default function StrategyFileUpload({ strategyId, onUploadComplete }: StrategyFileUploadProps) {
  const [files, setFiles] = useState<StrategyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadProps = useSupabaseUpload({
    bucketName: 'strategy-files',
    path: `strategies/${strategyId}`,
    allowedMimeTypes: [
      'application/pdf', 
      'image/*', 
      'text/plain', 
      'application/json', 
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    onComplete: async (urls) => {
      if (urls.length > 0) {
        // Add file references to the database
        const supabase = createBrowserClient();
        
        for (let i = 0; i < urls.length; i++) {
          const file = uploadProps.files[i];
          if (file.errors.length > 0) continue;
          
          await supabase
            .from('strategy_files')
            .insert({
              strategy_id: strategyId,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_url: urls[i],
              description: null
            });
        }
        
        // Fetch updated files
        fetchFiles();
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    }
  });

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('strategy_files')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching strategy files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load strategy files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      setDeleting(fileId);
      const supabase = createBrowserClient();
      
      // Find the file to get the URL
      const fileToDelete = files.find(f => f.id === fileId);
      if (!fileToDelete) return;
      
      // Extract the path from the URL
      const urlParts = fileToDelete.file_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `strategies/${strategyId}/${fileName}`;
      
      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('strategy-files')
        .remove([filePath]);
        
      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue to delete the database entry even if storage delete fails
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('strategy_files')
        .delete()
        .eq('id', fileId);
        
      if (dbError) {
        throw dbError;
      }
      
      // Update the list
      setFiles(files.filter(f => f.id !== fileId));
      
      toast({
        title: 'File Deleted',
        description: 'The file has been successfully deleted.',
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileType className="h-5 w-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileType className="h-5 w-5 text-red-500" />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') {
      return <FileType className="h-5 w-5 text-green-500" />;
    } else if (fileType === 'application/json' || fileType === 'text/plain') {
      return <FileType className="h-5 w-5 text-yellow-500" />;
    } else {
      return <LucideFile className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  useEffect(() => {
    fetchFiles();
  }, [strategyId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Upload Files</CardTitle>
          <CardDescription>
            Add documentation, backtest results, or research for this strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dropzone {...uploadProps}>
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Strategy Files</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchFiles} 
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-md">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No files uploaded yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.file_type)}
                    <div>
                      <p className="font-medium">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => window.open(file.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                      disabled={deleting === file.id}
                    >
                      {deleting === file.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 