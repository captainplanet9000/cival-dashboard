"use client";

import * as React from "react";
const { useState, useMemo } = React;
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Download, MoreHorizontal, FileType, Trash, Eye, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BrainFile {
  id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  classification: string;
  visibility: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  farm_id: string | null;
  embedding: unknown | null;
  has_embedding: boolean;
  metadata: Record<string, unknown>;
  auto_process: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

type BrainFilesTableProps = {
  farmId?: string;
  onSelectFile?: (fileId: string) => void;
};

type RowProps = {
  row: {
    original: BrainFile;
    getValue: (key: string) => unknown;
  };
};

export function BrainFilesTable({ farmId, onSelectFile }: BrainFilesTableProps): React.ReactElement {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  // Define fetch function
  const fetchBrainFiles = async (): Promise<BrainFile[]> => {
    let query = supabase
      .from('brain_files')
      .select('*')
      .eq('is_deleted', false);
      
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  };

  // Use react-query to fetch data
  const {
    data: brainFiles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['brainFiles', farmId],
    queryFn: fetchBrainFiles,
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      // Mark as deleted instead of physically removing
      const { error: deleteError } = await supabase
        .from('brain_files')
        .update({
          is_deleted: true
        })
        .eq('id', fileId);
        
      if (deleteError) throw deleteError;
      
      return fileId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainFiles'] });
      toast({
        title: "File deleted",
        description: "The file has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reprocess embedding mutation
  const reprocessMutation = useMutation({
    mutationFn: async (fileId: string) => {
      // Create new processing tasks for this file
      const { error: queueError } = await supabase
        .from('brain_file_processing_queue')
        .insert([
          {
            brain_file_id: fileId,
            process_type: 'generate_embedding',
            priority: 10,
            status: 'pending'
          },
          {
            brain_file_id: fileId,
            process_type: 'extract_content',
            priority: 5,
            status: 'pending'
          }
        ]);
      
      if (queueError) throw queueError;
      
      // Reset the embedding status
      const { error } = await supabase
        .from('brain_files')
        .update({
          has_embedding: false,
          embedding: null
        })
        .eq('id', fileId);
        
      if (error) throw error;
      
      return fileId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainFiles'] });
      toast({
        title: "Reprocessing requested",
        description: "The file will be processed soon",
      });
    },
    onError: (error) => {
      toast({
        title: "Error requesting reprocessing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Define columns
  const columns = useMemo<ColumnDef<BrainFile>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }: RowProps) => {
          const file = row.original;
          return (
            <div className="flex items-center gap-2">
              <FileType className="h-4 w-4 text-muted-foreground" />
              <div className="font-medium truncate max-w-[200px]">
                {file.title || file.file_name}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "classification",
        header: "Category",
        cell: ({ row }: RowProps) => {
          const classification = row.original.classification;
          const variants: Record<string, string> = {
            'strategy': 'default',
            'indicator': 'secondary',
            'documentation': 'outline',
            'market_analysis': 'destructive',
            'research': 'success',
          };
          
          return (
            <Badge 
              variant={variants[classification] as any || 'outline'} 
              className="capitalize"
            >
              {classification.replace('_', ' ')}
            </Badge>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }: RowProps) => {
          return (
            <div className="truncate max-w-[200px] text-muted-foreground">
              {row.original.description || "No description"}
            </div>
          );
        },
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }: RowProps) => {
          const tags = row.original.tags || [];
          
          if (tags.length === 0) {
            return <div className="text-muted-foreground">No tags</div>;
          }
          
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && <Badge variant="outline">+{tags.length - 3}</Badge>}
            </div>
          );
        },
      },
      {
        accessorKey: "visibility",
        header: "Visibility",
        cell: ({ row }: RowProps) => {
          const visibility = row.original.visibility;
          const labels: Record<string, string> = {
            'private': 'Only You',
            'farm': 'Farm Members',
            'public': 'Public'
          };
          
          const variants: Record<string, string> = {
            'private': 'outline',
            'farm': 'secondary',
            'public': 'default'
          };
          
          return (
            <Badge variant={variants[visibility] as any} className="capitalize">
              {labels[visibility] || visibility}
            </Badge>
          );
        },
      },
      {
        accessorKey: "has_embedding",
        header: "ElizaOS Status",
        cell: ({ row }: RowProps) => {
          const hasEmbedding = row.original.has_embedding;
          
          if (hasEmbedding) {
            return (
              <Badge variant="outline" className="text-green-600 bg-green-50 hover:bg-green-100 border-green-200">
                Ready
              </Badge>
            );
          }
          
          // Check if there are any processing tasks
          return (
            <Badge variant="outline" className="capitalize">
              Processing
            </Badge>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }: RowProps) => {
          return format(new Date(row.original.created_at), "MMM d, yyyy");
        },
      },
      {
        id: "actions",
        cell: ({ row }: RowProps) => {
          const file = row.original;
          
          const downloadFile = async () => {
            try {
              // Get public URL
              const { data } = supabase
                .storage
                .from('farm_brain_assets')
                .getPublicUrl(file.storage_path);
                
              if (data && data.publicUrl) {
                // Create temporary link
                const a = document.createElement('a');
                a.href = data.publicUrl;
                a.download = file.file_name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
            } catch (error) {
              console.error("Error downloading file:", error);
              toast({
                title: "Download failed",
                description: "Could not download the file",
                variant: "destructive",
              });
            }
          };
          
          const previewFile = async () => {
            try {
              // For now just open in a new tab
              const { data } = supabase
                .storage
                .from('farm_brain_assets')
                .getPublicUrl(file.storage_path);
                
              if (data && data.publicUrl) {
                window.open(data.publicUrl, '_blank');
              }
            } catch (error) {
              console.error("Error previewing file:", error);
              toast({
                title: "Preview failed",
                description: "Could not preview the file",
                variant: "destructive",
              });
            }
          };
          
          const assignToAgent = async () => {
            // This would be implemented to open a modal for assigning this knowledge to an agent
            toast({
              title: "Coming Soon",
              description: "Agent assignment will be available in a future update",
            });
          };
          
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={previewFile}>
                  <Eye className="h-4 w-4 mr-2" />
                  <span>Preview</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadFile}>
                  <Download className="h-4 w-4 mr-2" />
                  <span>Download</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => reprocessMutation.mutate(file.id)}
                  disabled={!file.has_embedding}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>Reprocess</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={assignToAgent}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>Assign to Agent</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => deleteMutation.mutate(file.id)}>
                  <Trash className="h-4 w-4 mr-2 text-destructive" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: brainFiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/50 p-4 my-4">
        <p className="text-destructive">Error loading brain files. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter files..."
          value={table.getColumn("file_name")?.getFilterValue() as string}
          onChange={(event) =>
            table.getColumn("file_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['brainFiles'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state
              Array.from({ length: 5 }).map((_: unknown, i: number) => (
                <TableRow key={i}>
                  {columns.map((_: unknown, j: number) => (
                    <TableCell key={j}>
                      <div className="h-5 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onSelectFile && onSelectFile(row.original.id)}
                  className={onSelectFile ? "cursor-pointer hover:bg-muted/50" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No files found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
