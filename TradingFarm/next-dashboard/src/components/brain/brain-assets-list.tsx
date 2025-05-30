'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Search, FileText, RefreshCw, Download, Trash2, ExternalLink } from 'lucide-react';
import { AssetDropzone } from './asset-dropzone';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface BrainAsset {
  id: number;
  filename: string;
  title: string;
  description: string | null;
  asset_type: string;
  storage_path: string;
  summary: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export function BrainAssetsList() {
  const [assets, setAssets] = useState<BrainAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<BrainAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<BrainAsset | null>(null);
  const [assetContent, setAssetContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  
  const supabase = createBrowserClient();
  const { toast } = useToast();
  
  // Fetch brain assets on component mount
  useEffect(() => {
    fetchAssets();
  }, []);
  
  // Update filtered assets when search query, active tab, or assets change
  useEffect(() => {
    filterAssets();
  }, [searchQuery, activeTab, assets]);
  
  // Fetch assets from database
  const fetchAssets = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('brain_assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching brain assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load brain assets',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter assets based on search query and active tab
  const filterAssets = () => {
    let filtered = [...assets];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.title.toLowerCase().includes(query) || 
        (asset.description || '').toLowerCase().includes(query) ||
        (asset.summary || '').toLowerCase().includes(query)
      );
    }
    
    // Filter by asset type
    if (activeTab !== 'all') {
      filtered = filtered.filter(asset => asset.asset_type === activeTab);
    }
    
    setFilteredAssets(filtered);
  };
  
  // Handle asset upload success
  const handleAssetUploadSuccess = (asset: BrainAsset) => {
    setAssets(prev => [asset, ...prev]);
    toast({
      title: 'Success',
      description: `${asset.filename} has been added to the brain`,
    });
  };
  
  // Handle asset deletion
  const handleDeleteAsset = async (asset: BrainAsset) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('farm_brain_assets')
        .remove([asset.storage_path]);
      
      if (storageError) {
        throw storageError;
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('brain_assets')
        .delete()
        .eq('id', asset.id);
      
      if (dbError) {
        throw dbError;
      }
      
      // Update local state
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      
      toast({
        title: 'Success',
        description: `${asset.filename} has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete asset',
        variant: 'destructive',
      });
    }
  };
  
  // View asset content
  const viewAssetContent = async (asset: BrainAsset) => {
    setSelectedAsset(asset);
    setIsContentLoading(true);
    setAssetContent(null);
    
    try {
      // Download the file from storage
      const { data, error } = await supabase
        .storage
        .from('farm_brain_assets')
        .download(asset.storage_path);
      
      if (error) {
        throw error;
      }
      
      // Read the file content
      const content = await data.text();
      setAssetContent(content);
    } catch (error) {
      console.error('Error loading asset content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load asset content',
        variant: 'destructive',
      });
    } finally {
      setIsContentLoading(false);
    }
  };
  
  // Generate public URL for downloading
  const getDownloadUrl = async (asset: BrainAsset) => {
    const { data, error } = await supabase
      .storage
      .from('farm_brain_assets')
      .createSignedUrl(asset.storage_path, 60); // 60 seconds expiry
    
    if (error) {
      console.error('Error creating download URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate download link',
        variant: 'destructive',
      });
      return;
    }
    
    // Open in new tab
    window.open(data.signedUrl, '_blank');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Brain Assets</h2>
          <p className="text-muted-foreground">
            View and manage your brain's knowledge assets
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAssets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <FileUp className="h-4 w-4 mr-2" />
                Upload Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Upload Brain Asset</DialogTitle>
                <DialogDescription>
                  Add a new asset to your trading brain for strategies and knowledge
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <AssetDropzone onSuccess={handleAssetUploadSuccess} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-[300px]"
        />
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Assets</TabsTrigger>
          <TabsTrigger value="pinescript">PineScript</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' ? 'All Assets' :
                 activeTab === 'pinescript' ? 'PineScript Indicators' :
                 activeTab === 'pdf' ? 'PDF Documents' :
                 activeTab === 'text' ? 'Text Documents' :
                 activeTab === 'markdown' ? 'Markdown Documents' :
                 'JSON Documents'}
              </CardTitle>
              <CardDescription>
                {filteredAssets.length} asset{filteredAssets.length !== 1 && 's'} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-24 bg-muted rounded w-full"></div>
                    ))}
                  </div>
                </div>
              ) : filteredAssets.length > 0 ? (
                <div className="space-y-4">
                  {filteredAssets.map((asset) => (
                    <Card key={asset.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{asset.title}</CardTitle>
                          <Badge>{asset.asset_type}</Badge>
                        </div>
                        {asset.description && (
                          <CardDescription>{asset.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Filename: {asset.filename}
                            </p>
                            {asset.asset_type === 'pinescript' && asset.metadata?.parsed && (
                              <div className="mt-1">
                                <Badge variant="outline" className="mr-1">
                                  {asset.metadata.parsed.overlay ? 'Overlay' : 'Separate Pane'}
                                </Badge>
                                {asset.metadata.parsed.inputs?.length > 0 && (
                                  <Badge variant="outline">
                                    {asset.metadata.parsed.inputs.length} Parameters
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Uploaded: {new Date(asset.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewAssetContent(asset)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => getDownloadUrl(asset)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {asset.title}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAsset(asset)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Assets Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? `No assets match your search for "${searchQuery}"`
                      : activeTab !== 'all'
                        ? `No ${activeTab} assets found`
                        : "Your brain doesn't have any assets yet"}
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload New Asset
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Upload Brain Asset</DialogTitle>
                        <DialogDescription>
                          Add a new asset to your trading brain for strategies and knowledge
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <AssetDropzone onSuccess={handleAssetUploadSuccess} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Asset Content Dialog */}
      <Dialog open={selectedAsset !== null} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.title}</DialogTitle>
            <DialogDescription>
              {selectedAsset?.description || selectedAsset?.filename}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto mt-4 p-4 border rounded-md bg-muted">
            {isContentLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : assetContent ? (
              <pre className="whitespace-pre-wrap text-sm font-mono">{assetContent}</pre>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No content available
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setSelectedAsset(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
