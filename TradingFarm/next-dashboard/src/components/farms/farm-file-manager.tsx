"use client";

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { FileText, Trash2, Download, MoreVertical, Upload, FileCode, ChartBar, File } from 'lucide-react';
import { Farm } from '@/services/farm-service';

interface FarmFileManagerProps {
  farm: Farm;
}

export function FarmFileManager({ farm }: FarmFileManagerProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('strategy_files');
  const [uploading, setUploading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const supabase = createBrowserClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles(activeTab);
  }, [activeTab]);

  const fetchFiles = async (bucket: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .list(`farm_${farm.id}`, {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw error;
      }

      setFiles(data || []);
    } catch (error: any) {
      console.error(`Error fetching files from ${bucket}:`, error);
      // Silently handle errors in development without showing error toasts
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `farm_${farm.id}/${Date.now()}_${file.name}`;
    
    setUploading(true);
    
    try {
      const { error } = await supabase
        .storage
        .from(activeTab)
        .upload(filePath, file);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded to ${getTabName(activeTab)}.`,
      });
      
      // Refresh the file list
      fetchFiles(activeTab);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleFileDelete = async (filename: string) => {
    try {
      const { error } = await supabase
        .storage
        .from(activeTab)
        .remove([`farm_${farm.id}/${filename}`]);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "File deleted",
        description: `${filename} has been removed.`,
      });
      
      // Refresh the file list
      fetchFiles(activeTab);
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: error.message || "There was an error deleting your file.",
        variant: "destructive",
      });
    }
  };

  const handleFileDownload = async (filename: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from(activeTab)
        .download(`farm_${farm.id}/${filename}`);
        
      if (error) {
        throw error;
      }
      
      // Create download link and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: error.message || "There was an error downloading your file.",
        variant: "destructive",
      });
    }
  };

  const getTabName = (tab: string) => {
    switch (tab) {
      case 'strategy_files':
        return 'Strategy Files';
      case 'trading_indicators':
        return 'Trading Indicators';
      case 'backtest_results':
        return 'Backtest Results';
      default:
        return tab;
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (['py', 'js', 'ts', 'jsx', 'tsx'].includes(ext || '')) {
      return <FileCode className="h-4 w-4 mr-2" />;
    } else if (['csv', 'xlsx', 'json'].includes(ext || '')) {
      return <ChartBar className="h-4 w-4 mr-2" />;
    } else {
      return <FileText className="h-4 w-4 mr-2" />;
    }
  };

  // Dropzone for Supabase storage
  const UploadDropzone = () => (
    <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center mt-4">
      <div className="mb-4">
        <Upload className="h-12 w-12 mx-auto text-gray-400" />
      </div>
      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-semibold">Click to upload</span> or drag and drop
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Upload files to the {getTabName(activeTab)} bucket
      </p>
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      <Button 
        variant="outline" 
        className="mt-4"
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Select File'}
      </Button>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Farm Files</CardTitle>
        <CardDescription>
          Manage strategy files, trading indicators, and backtest results for this farm
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="strategy_files" 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          className="w-full"
        >
          <TabsList className="w-full mb-4">
            <TabsTrigger value="strategy_files" className="flex-1">Strategy Files</TabsTrigger>
            <TabsTrigger value="trading_indicators" className="flex-1">Trading Indicators</TabsTrigger>
            <TabsTrigger value="backtest_results" className="flex-1">Backtest Results</TabsTrigger>
          </TabsList>
          
          {/* Content for all tabs - rendered dynamically based on activeTab */}
          <div className="space-y-4">
            {/* File Upload Dropzone */}
            <div className="relative">
              <UploadDropzone />
            </div>
            
            <Separator className="my-4" />
            
            {/* File List */}
            <div className="rounded-md border">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading files...
                </div>
              ) : files.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No files found in {getTabName(activeTab)}
                </div>
              ) : (
                <div className="divide-y">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center">
                        {getFileIcon(file.name)}
                        <span className="ml-2 text-sm font-medium">{file.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleFileDownload(file.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleFileDelete(file.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
