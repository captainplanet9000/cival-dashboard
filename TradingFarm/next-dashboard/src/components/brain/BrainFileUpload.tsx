"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from "@/utils/supabase/client";
import { TagInput } from "@/components/ui/tag-input";
import { Upload, FileType, Check, AlertCircle, Info } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BrainFileUploadProps {
  farmId?: string;
  onSuccess?: () => void;
}

export function BrainFileUpload({ farmId, onSuccess }: BrainFileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [classification, setClassification] = useState<string>("documentation");
  const [visibility, setVisibility] = useState<string>("private");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  
  const supabase = createBrowserClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 5,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/html': ['.html', '.htm'],
      'text/javascript': ['.js'],
      'text/typescript': ['.ts', '.tsx'],
      'application/x-python-code': ['.py'],
      'text/x-pine': ['.pine'],
    }
  });

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive"
      });
      return;
    }

    if (!title) {
      toast({
        title: "Title required",
        description: "Please provide a title for your file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const totalFiles = files.length;
    let filesProcessed = 0;
    let errors = 0;
    
    for (const file of files) {
      try {
        // Create a unique file path
        const fileId = uuidv4();
        const fileExt = file.name.split('.').pop();
        const filePath = `${fileId}.${fileExt}`;
        
        // Upload file to storage
        const { data: storageData, error: storageError } = await supabase
          .storage
          .from('farm_brain_assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (storageError) throw storageError;
        
        // Get file metadata
        const fileType = file.type || `application/${fileExt}`;
        const fileSize = file.size;
        
        // Add to brain_files table
        const { error: dbError } = await supabase
          .from('brain_files')
          .insert({
            storage_path: filePath,
            file_name: file.name,
            file_type: fileType,
            file_size_bytes: fileSize,
            title: files.length === 1 ? title : `${title} - ${file.name}`,
            description: description,
            tags: tags,
            farm_id: farmId,
            classification: classification as any,
            visibility: visibility as any,
            auto_process: true,
            metadata: {
              originalName: file.name,
              uploadedAt: new Date().toISOString(),
              fileExt: fileExt
            }
          });
          
        if (dbError) throw dbError;
        
        filesProcessed++;
        setUploadProgress(Math.round((filesProcessed / totalFiles) * 100));
      } catch (error) {
        console.error("Error uploading file:", error);
        errors++;
      }
    }
    
    setIsUploading(false);
    
    if (errors === 0) {
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${filesProcessed} file(s)`,
        variant: "default"
      });
      setFiles([]);
      setTitle("");
      setDescription("");
      setTags([]);
      if (onSuccess) onSuccess();
    } else {
      toast({
        title: "Upload partially complete",
        description: `Uploaded ${filesProcessed} file(s) with ${errors} error(s)`,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Brain Files</CardTitle>
        <CardDescription>
          Upload documents, code, or data files to enhance your farm's brain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm font-medium">Drop the files here...</p>
            ) : (
              <>
                <p className="text-sm font-medium">Drag & drop files here, or click to select files</p>
                <p className="text-xs text-muted-foreground">
                  Supports PDF, TXT, MD, DOC, DOCX, CSV, JSON, HTML, JS, TS, PY, and Pine files
                </p>
              </>
            )}
          </div>
        </div>
        
        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files</Label>
            <div className="bg-muted/50 rounded-md p-2 space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-muted-foreground" />
                    <span>{file.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title for this brain file"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for these files"
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="classification">Classification</Label>
            <Select
              value={classification}
              onValueChange={setClassification}
            >
              <SelectTrigger id="classification">
                <SelectValue placeholder="Select classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strategy">Trading Strategy</SelectItem>
                <SelectItem value="indicator">Technical Indicator</SelectItem>
                <SelectItem value="learning">Learning Material</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="market_analysis">Market Analysis</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="data_feed">Data Feed</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={setVisibility}
            >
              <SelectTrigger id="visibility">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (Only You)</SelectItem>
                <SelectItem value="farm">Farm (All Farm Members)</SelectItem>
                <SelectItem value="public">Public (All Users)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagInput
            placeholder="Add tags and press enter"
            tags={tags}
            setTags={setTags}
          />
        </div>
        
        <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/20">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">About ElizaOS Integration</p>
            <p className="text-muted-foreground mt-1">
              Uploaded files will be automatically processed for use with ElizaOS. The system will extract content, 
              generate embeddings, and make the knowledge available to your agents and strategies.
            </p>
          </div>
        </div>
        
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setFiles([]);
            setDescription("");
            setTags([]);
          }}
          disabled={isUploading || files.length === 0}
        >
          Clear
        </Button>
        <Button onClick={uploadFiles} disabled={isUploading}>
          {isUploading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> 
              Uploading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> 
              Upload Files
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
