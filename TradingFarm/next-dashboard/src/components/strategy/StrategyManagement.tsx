"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/format/date";
import { 
  PlusCircle, Search, Filter, 
  Code, Layers, LineChart, 
  Play, Pause, Edit, Copy, 
  Trash2, BookOpen, ArrowUpDown, 
  CheckCircle2, AlertCircle, 
  Loader2, RefreshCw 
} from "lucide-react";
import { StrategyForm } from "./StrategyForm";
import { StrategyCodeEditor } from "./StrategyCodeEditor";
import { StrategyTemplateSelector } from "./StrategyTemplateSelector";
import { NaturalLanguageStrategyCreator } from "./NaturalLanguageStrategyCreator";

interface Strategy {
  id: string;
  name: string;
  description: string | null;
  type: string;
  version: string;
  parameters: Record<string, any>;
  is_active: boolean;
  is_deployed: boolean;
  performance_metrics: Record<string, any>;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export function StrategyManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNLCreateDialogOpen, setIsNLCreateDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [creationTab, setCreationTab] = useState("template");
  
  const { toast } = useToast();
  const supabase = createBrowserClient();
  const queryClient = useQueryClient();
  
  // Fetch strategies
  const { data: strategies = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as Strategy[];
    }
  });
  
  // Get strategy types for filtering
  const strategyTypes = [...new Set(strategies.map(s => s.type))];
  
  // Filter strategies based on search and type filter
  const filteredStrategies = strategies.filter(strategy => {
    const matchesSearch = 
      searchQuery === "" || 
      strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (strategy.description && strategy.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = selectedType === null || strategy.type === selectedType;
    
    return matchesSearch && matchesType;
  });
  
  // Toggle strategy active status
  const toggleActiveMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const strategy = strategies.find(s => s.id === strategyId);
      if (!strategy) throw new Error("Strategy not found");
      
      const { error } = await supabase
        .from('strategies')
        .update({ is_active: !strategy.is_active })
        .eq('id', strategyId);
        
      if (error) throw error;
      
      return strategyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast({
        title: "Strategy Updated",
        description: "Strategy active status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update strategy",
        variant: "destructive",
      });
    }
  });
  
  // Delete strategy
  const deleteMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', strategyId);
        
      if (error) throw error;
      
      return strategyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setIsDeleteDialogOpen(false);
      setSelectedStrategy(null);
      toast({
        title: "Strategy Deleted",
        description: "Strategy has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete strategy",
        variant: "destructive",
      });
    }
  });
  
  // Duplicate strategy
  const duplicateMutation = useMutation({
    mutationFn: async (strategyId: string) => {
      const strategy = strategies.find(s => s.id === strategyId);
      if (!strategy) throw new Error("Strategy not found");
      
      const { data, error } = await supabase
        .from('strategies')
        .insert({
          name: `${strategy.name} (copy)`,
          description: strategy.description,
          type: strategy.type,
          version: strategy.version,
          parameters: strategy.parameters,
          is_active: false, // Start as inactive
          is_deployed: false, // Not deployed initially
          content: strategy.content,
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast({
        title: "Strategy Duplicated",
        description: "Strategy has been copied successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Duplication Failed",
        description: error.message || "Failed to duplicate strategy",
        variant: "destructive",
      });
    }
  });
  
  // Handle opening edit dialog
  const handleEdit = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setIsEditDialogOpen(true);
  };
  
  // Handle opening delete confirmation dialog
  const handleDeleteClick = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle strategy creation success
  const handleStrategyCreated = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['strategies'] });
    toast({
      title: "Strategy Created",
      description: "Strategy has been created successfully",
    });
  };
  
  // Handle strategy update success
  const handleStrategyUpdated = () => {
    setIsEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['strategies'] });
    toast({
      title: "Strategy Updated",
      description: "Strategy has been updated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Strategy Management</h2>
          <p className="text-muted-foreground">
            Create, edit, and deploy your trading strategies
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsNLCreateDialogOpen(true)}
          >
            <Code className="w-4 h-4 mr-2" />
            AI-Generated
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Strategy
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search strategies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value === "" ? null : e.target.value)}
          >
            <option value="">All Types</option>
            {strategyTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchQuery("");
              setSelectedType(null);
            }}
          >
            Clear
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load strategies. Please try again.
          </AlertDescription>
        </Alert>
      ) : filteredStrategies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No strategies found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedType 
              ? "Try changing your search query or filters" 
              : "Get started by creating your first trading strategy"}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStrategies.map((strategy) => (
                <TableRow key={strategy.id}>
                  <TableCell className="font-medium">
                    <div>
                      {strategy.name}
                      {strategy.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {strategy.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {strategy.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{strategy.version}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {strategy.is_active ? (
                        <Badge variant="success" className="capitalize">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {strategy.is_deployed && (
                        <Badge variant="default" className="capitalize">
                          Deployed
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(strategy.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActiveMutation.mutate(strategy.id)}
                        title={strategy.is_active ? "Deactivate" : "Activate"}
                      >
                        {strategy.is_active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(strategy)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicateMutation.mutate(strategy.id)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(strategy)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Create Strategy Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Create New Strategy</DialogTitle>
          </DialogHeader>
          
          <Tabs value={creationTab} onValueChange={setCreationTab} className="w-full">
            <TabsList className="mb-4 w-full grid grid-cols-3">
              <TabsTrigger value="template">
                <Layers className="w-4 h-4 mr-2" />
                From Template
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="w-4 h-4 mr-2" />
                Code Editor
              </TabsTrigger>
              <TabsTrigger value="backtest">
                <LineChart className="w-4 h-4 mr-2" />
                Backtest View
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="template" className="space-y-4">
              <StrategyTemplateSelector onSelect={handleStrategyCreated} />
            </TabsContent>
            
            <TabsContent value="code" className="space-y-4">
              <StrategyForm onSuccess={handleStrategyCreated} />
            </TabsContent>
            
            <TabsContent value="backtest" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Backtest Results</CardTitle>
                  <CardDescription>
                    Create and test your strategy before deployment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Create a strategy first to see backtest results
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Edit Strategy Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Edit Strategy</DialogTitle>
          </DialogHeader>
          
          {selectedStrategy && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-4 w-full grid grid-cols-3">
                <TabsTrigger value="details">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="w-4 h-4 mr-2" />
                  Code Editor
                </TabsTrigger>
                <TabsTrigger value="backtest">
                  <LineChart className="w-4 h-4 mr-2" />
                  Backtest Results
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <StrategyForm 
                  strategy={selectedStrategy} 
                  onSuccess={handleStrategyUpdated} 
                  isEdit={true}
                />
              </TabsContent>
              
              <TabsContent value="code" className="space-y-4">
                <StrategyCodeEditor
                  strategy={selectedStrategy}
                  onSuccess={handleStrategyUpdated}
                />
              </TabsContent>
              
              <TabsContent value="backtest" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Backtest Results</CardTitle>
                    <CardDescription>
                      View and analyze backtesting results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No backtest results available for this strategy
                      </p>
                      <Button className="mt-4">
                        Run Backtest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Strategy</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-2">
              Are you sure you want to delete this strategy?
            </p>
            {selectedStrategy && (
              <p className="font-medium">{selectedStrategy.name}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. The strategy will be permanently deleted from the system.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedStrategy && deleteMutation.mutate(selectedStrategy.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Natural Language Strategy Creator Dialog */}
      <Dialog open={isNLCreateDialogOpen} onOpenChange={setIsNLCreateDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Create Strategy with AI</DialogTitle>
          </DialogHeader>
          
          <NaturalLanguageStrategyCreator
            onSuccess={() => {
              setIsNLCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['strategies'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
