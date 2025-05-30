'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DataProvider,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  ExternalLink,
  DatabaseIcon,
  Globe,
  BarChart2
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type ResourceType = 'API' | 'DataFeed' | 'Database' | 'Other';

interface Resource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  endpoint: string;
  apiKey?: string;
  isActive: boolean;
  quotaLimit?: number;
  quotaUsed?: number;
  lastUsed?: string;
  created_at: string;
}

interface ResourceManagerProps {
  farmId: string;
}

export function ResourceManager({ farmId }: ResourceManagerProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('apis');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Resource>>({
    name: '',
    description: '',
    type: 'API',
    endpoint: '',
    apiKey: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch resources on component mount
  useEffect(() => {
    fetchResources();
  }, [farmId]);

  // Fetch resources from the API
  const fetchResources = async () => {
    setLoading(true);
    try {
      // This would be a real API call in production
      // For demo purposes, we'll use mock data
      const mockResources: Resource[] = [
        {
          id: '1',
          name: 'CoinAPI',
          description: 'Market data provider for cryptocurrency markets',
          type: 'API',
          endpoint: 'https://rest.coinapi.io/v1/',
          isActive: true,
          quotaLimit: 10000,
          quotaUsed: 3450,
          lastUsed: new Date().toISOString(),
          created_at: '2024-03-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'TradingView Webhook',
          description: 'Webhook for receiving TradingView alerts',
          type: 'DataFeed',
          endpoint: 'https://farm.example.com/webhook/tradingview',
          isActive: true,
          lastUsed: new Date().toISOString(),
          created_at: '2024-03-05T00:00:00Z',
        },
        {
          id: '3',
          name: 'AlphaVantage',
          description: 'Stock and forex data provider',
          type: 'API',
          endpoint: 'https://www.alphavantage.co/query',
          isActive: false,
          quotaLimit: 5000,
          quotaUsed: 0,
          created_at: '2024-03-10T00:00:00Z',
        },
        {
          id: '4',
          name: 'Vector Database',
          description: 'Knowledge base for trading strategies',
          type: 'Database',
          endpoint: 'postgres://user:pass@localhost:5432/vectors',
          isActive: true,
          lastUsed: new Date().toISOString(),
          created_at: '2024-03-15T00:00:00Z',
        },
      ];
      
      setResources(mockResources);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch resources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter resources based on selected tab
  const filteredResources = resources.filter(resource => {
    if (selectedTab === 'apis') return resource.type === 'API';
    if (selectedTab === 'datafeeds') return resource.type === 'DataFeed';
    if (selectedTab === 'databases') return resource.type === 'Database';
    return true; // 'all' tab
  });

  // Handle form input changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.endpoint?.trim()) errors.endpoint = 'Endpoint is required';
    if (!formData.type) errors.type = 'Type is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      // This would be a real API call in production
      const newResource: Resource = {
        id: Date.now().toString(),
        name: formData.name!,
        description: formData.description || '',
        type: formData.type as ResourceType,
        endpoint: formData.endpoint!,
        apiKey: formData.apiKey,
        isActive: formData.isActive || false,
        created_at: new Date().toISOString(),
      };
      
      // Add to state (in reality, would come from API response)
      setResources(prev => [...prev, newResource]);
      
      toast({
        title: 'Resource Added',
        description: `Successfully added ${newResource.name}`,
      });
      
      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        type: 'API',
        endpoint: '',
        apiKey: '',
        isActive: true,
      });
      setFormOpen(false);
    } catch (error) {
      console.error('Error adding resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to add resource',
        variant: 'destructive',
      });
    }
  };

  // Handle resource toggle
  const toggleResource = (id: string) => {
    setResources(prev => 
      prev.map(resource => 
        resource.id === id 
          ? { ...resource, isActive: !resource.isActive } 
          : resource
      )
    );
    
    toast({
      title: 'Resource Updated',
      description: `Resource status updated successfully`,
    });
  };

  // Handle resource delete
  const handleDelete = (id: string) => {
    setResources(prev => prev.filter(resource => resource.id !== id));
    
    toast({
      title: 'Resource Deleted',
      description: 'Resource deleted successfully',
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get icon for resource type
  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'API':
        return <Globe className="h-4 w-4" />;
      case 'DataFeed':
        return <DataProvider className="h-4 w-4" />;
      case 'Database':
        return <DatabaseIcon className="h-4 w-4" />;
      default:
        return <BarChart2 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Farm Resources</CardTitle>
            <CardDescription>
              Manage APIs, data feeds, and database connections
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchResources}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Resource</DialogTitle>
                  <DialogDescription>
                    Add a new API, data feed, or database connection to the farm
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Resource Name</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="e.g., CoinAPI, TradingView Feed"
                      className={formErrors.name ? 'border-red-500' : ''}
                    />
                    {formErrors.name && (
                      <p className="text-xs text-red-500">{formErrors.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Resource Type</Label>
                    <Select
                      value={formData.type || ''}
                      onValueChange={(value) => handleFormChange('type', value)}
                    >
                      <SelectTrigger className={formErrors.type ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="API">API</SelectItem>
                        <SelectItem value="DataFeed">Data Feed</SelectItem>
                        <SelectItem value="Database">Database</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.type && (
                      <p className="text-xs text-red-500">{formErrors.type}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Brief description of this resource"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">Endpoint URL</Label>
                    <Input
                      id="endpoint"
                      value={formData.endpoint || ''}
                      onChange={(e) => handleFormChange('endpoint', e.target.value)}
                      placeholder="https://api.example.com/v1/"
                      className={formErrors.endpoint ? 'border-red-500' : ''}
                    />
                    {formErrors.endpoint && (
                      <p className="text-xs text-red-500">{formErrors.endpoint}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key (Optional)</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={formData.apiKey || ''}
                      onChange={(e) => handleFormChange('apiKey', e.target.value)}
                      placeholder="Enter API key if required"
                    />
                    <p className="text-xs text-muted-foreground">
                      API keys are encrypted and stored securely
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive || false}
                      onCheckedChange={(checked) => handleFormChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive">Enable resource immediately</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    Add Resource
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="apis" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="apis">APIs</TabsTrigger>
            <TabsTrigger value="datafeeds">Data Feeds</TabsTrigger>
            <TabsTrigger value="databases">Databases</TabsTrigger>
          </TabsList>
          
          <TabsContent value={selectedTab} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredResources.length > 0 ? (
              <div className="space-y-4">
                {filteredResources.map(resource => (
                  <div key={resource.id} className="rounded-md border p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-gray-50">
                            {getResourceIcon(resource.type)}
                            <span className="ml-1">{resource.type}</span>
                          </Badge>
                          
                          <h3 className="text-base font-medium">{resource.name}</h3>
                          
                          <Badge variant={resource.isActive ? 'default' : 'secondary'}>
                            {resource.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                        
                        <div className="mt-2 flex items-center gap-4">
                          <p className="text-xs">
                            <span className="text-muted-foreground">Endpoint:</span>{' '}
                            <code className="rounded bg-muted px-1 py-0.5">{resource.endpoint}</code>
                          </p>
                          
                          {resource.quotaLimit && (
                            <p className="text-xs">
                              <span className="text-muted-foreground">Quota:</span>{' '}
                              {resource.quotaUsed || 0} / {resource.quotaLimit}
                            </p>
                          )}
                          
                          <p className="text-xs">
                            <span className="text-muted-foreground">Added:</span>{' '}
                            {formatDate(resource.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`toggle-${resource.id}`}
                            checked={resource.isActive}
                            onCheckedChange={() => toggleResource(resource.id)}
                          />
                          <Label htmlFor={`toggle-${resource.id}`}>{resource.isActive ? 'Enabled' : 'Disabled'}</Label>
                        </div>
                        
                        <Button variant="outline" size="sm" onClick={() => window.open(resource.endpoint, '_blank')}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm" onClick={() => handleDelete(resource.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No resources found</AlertTitle>
                <AlertDescription>
                  No {selectedTab === 'all' ? 'resources' : selectedTab} have been added to this farm yet.
                  Click "Add Resource" to get started.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
