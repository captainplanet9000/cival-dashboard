'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createBrowserClient } from '@/utils/supabase/client';
import { Clock, RefreshCw, History, Save, ChevronDown, Layers } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';

export interface StrategyVersion {
  id: string;
  strategy_id: string;
  version: number;
  name: string;
  description: string | null;
  config: any;
  parameters: any;
  metadata: any;
  created_at: string;
}

interface StrategyVersionControlProps {
  strategyId: string;
  currentVersion: number;
  strategyData: any;
  onVersionChange: (version: StrategyVersion) => void;
  onNewVersionCreated: (version: StrategyVersion) => void;
}

export default function StrategyVersionControl({ 
  strategyId, 
  currentVersion, 
  strategyData, 
  onVersionChange,
  onNewVersionCreated
}: StrategyVersionControlProps) {
  const [versions, setVersions] = useState<StrategyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>(currentVersion.toString());
  const { toast } = useToast();

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('strategy_versions')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('version', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching strategy versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load strategy versions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewVersion = async () => {
    try {
      setCreatingVersion(true);
      const supabase = createBrowserClient();
      
      // Extract the necessary data from the current strategy
      const {
        name,
        description,
        config,
        parameters,
        metadata
      } = strategyData;
      
      // Create the version using the database function
      const { data, error } = await supabase
        .rpc('create_strategy_version', {
          strategy_id: strategyId,
          name,
          description: description || '',
          config: config || {},
          parameters: parameters || {},
          metadata: metadata || {}
        });
        
      if (error) {
        throw error;
      }
      
      // Fetch the created version
      const { data: versionData, error: versionError } = await supabase
        .from('strategy_versions')
        .select('*')
        .eq('id', data)
        .single();
        
      if (versionError) {
        throw versionError;
      }
      
      // Update local state
      setVersions([versionData, ...versions]);
      setSelectedVersion(versionData.version.toString());
      
      // Call the callback
      onNewVersionCreated(versionData);
      
      toast({
        title: 'New Version Created',
        description: `Version ${versionData.version} has been created successfully.`,
      });
      
      setShowVersionDialog(false);
    } catch (error) {
      console.error('Error creating new version:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new version. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleVersionSelect = (versionNumber: string) => {
    const version = versions.find(v => v.version.toString() === versionNumber);
    if (version) {
      setSelectedVersion(versionNumber);
      onVersionChange(version);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [strategyId]);

  useEffect(() => {
    if (currentVersion && versions.length > 0) {
      setSelectedVersion(currentVersion.toString());
    }
  }, [currentVersion, versions]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center">
              <History className="h-5 w-5 mr-2" />
              Version Control
            </CardTitle>
            <CardDescription>
              Manage strategy versions and history
            </CardDescription>
          </div>
          <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Version</DialogTitle>
                <DialogDescription>
                  This will create a new version of your strategy with the current configuration.
                  Previous versions will still be available.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Creating a new version saves the current state of your strategy, including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Strategy configuration</li>
                  <li>Parameters and settings</li>
                  <li>Metadata and notes</li>
                </ul>
                <p className="text-sm mt-4 text-amber-600">
                  Note: Files are not versioned and will remain shared across all versions.
                </p>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowVersionDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createNewVersion} 
                  disabled={creatingVersion}
                >
                  {creatingVersion ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Version
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-6">
            <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              No versions found
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowVersionDialog(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              Create First Version
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-64">
                <Select
                  value={selectedVersion}
                  onValueChange={handleVersionSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map(version => (
                      <SelectItem 
                        key={version.id} 
                        value={version.version.toString()}
                      >
                        Version {version.version} 
                        {version.version === currentVersion && " (Current)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchVersions}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            {selectedVersion && (
              <div className="border rounded-md p-4 space-y-3">
                {versions
                  .filter(v => v.version.toString() === selectedVersion)
                  .map(version => (
                    <div key={version.id}>
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center">
                          <h3 className="font-medium">Version {version.version}</h3>
                          {version.version === currentVersion && (
                            <Badge className="ml-2">Current</Badge>
                          )}
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(version.created_at), 'PPp')}
                        </Badge>
                      </div>
                      
                      {version.description && (
                        <p className="text-sm mb-2 text-muted-foreground">{version.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Parameters</p>
                          <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-24">
                            {JSON.stringify(version.parameters, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="font-medium">Metadata</p>
                          <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-24">
                            {JSON.stringify(version.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 