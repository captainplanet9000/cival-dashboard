'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LineChart,
  ArrowLeftRight,
  Scale,
  Zap,
  BadgeDollarSign
} from 'lucide-react';

interface EnvironmentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'trend_following' | 'mean_reversion' | 'breakout' | 'arbitrage' | 'custom';
  resources: {
    apis: number;
    dataFeeds: number;
    databases: number;
  };
  strategies: number;
  agents: number;
  version: string;
  created_at: string;
  updated_at: string;
}

interface EnvironmentTemplatesProps {
  farmId: string;
  onTemplateSelect?: (templateId: string) => void;
}

export function EnvironmentTemplates({ farmId, onTemplateSelect }: EnvironmentTemplatesProps) {
  const [templates, setTemplates] = useState<EnvironmentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EnvironmentTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<EnvironmentTemplate['type']>('custom');

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, [farmId]);

  // Fetch environment templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockTemplates: EnvironmentTemplate[] = [
        {
          id: '1',
          name: 'Trend Following Environment',
          description: 'Complete environment setup for trend following strategies with necessary data feeds and APIs',
          type: 'trend_following',
          resources: {
            apis: 3,
            dataFeeds: 2,
            databases: 1,
          },
          strategies: 2,
          agents: 1,
          version: '1.0.2',
          created_at: '2025-03-15T10:00:00Z',
          updated_at: '2025-03-20T15:30:00Z',
        },
        {
          id: '2',
          name: 'Mean Reversion Suite',
          description: 'Comprehensive setup for mean reversion trading with statistical analysis tools and historical databases',
          type: 'mean_reversion',
          resources: {
            apis: 2,
            dataFeeds: 3,
            databases: 2,
          },
          strategies: 3,
          agents: 2,
          version: '1.1.0',
          created_at: '2025-03-18T09:45:00Z',
          updated_at: '2025-03-25T14:20:00Z',
        },
        {
          id: '3',
          name: 'Breakout Trading Environment',
          description: 'Environment optimized for breakout trading strategies with real-time alerts and volume analysis',
          type: 'breakout',
          resources: {
            apis: 4,
            dataFeeds: 2,
            databases: 1,
          },
          strategies: 2,
          agents: 1,
          version: '1.0.0',
          created_at: '2025-03-22T11:30:00Z',
          updated_at: '2025-03-22T11:30:00Z',
        },
        {
          id: '4',
          name: 'Cross-Exchange Arbitrage',
          description: 'Setup for exploiting price differences across multiple exchanges with latency-optimized connections',
          type: 'arbitrage',
          resources: {
            apis: 5,
            dataFeeds: 4,
            databases: 2,
          },
          strategies: 1,
          agents: 3,
          version: '1.2.1',
          created_at: '2025-03-10T08:15:00Z',
          updated_at: '2025-04-01T16:40:00Z',
        },
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch environment templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a new template
  const createTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: 'Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }
    
    const newTemplate: EnvironmentTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      description: newTemplateDescription,
      type: newTemplateType,
      resources: {
        apis: 0,
        dataFeeds: 0,
        databases: 0,
      },
      strategies: 0,
      agents: 0,
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setTemplates(prev => [...prev, newTemplate]);
    setCreateDialogOpen(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateType('custom');
    
    toast({
      title: 'Template Created',
      description: 'New environment template has been created',
    });
  };

  // Clone an existing template
  const cloneTemplate = () => {
    if (!selectedTemplate) return;
    
    const clonedTemplate: EnvironmentTemplate = {
      ...selectedTemplate,
      id: Date.now().toString(),
      name: `${selectedTemplate.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: '1.0.0',
    };
    
    setTemplates(prev => [...prev, clonedTemplate]);
    setCloneDialogOpen(false);
    setSelectedTemplate(null);
    
    toast({
      title: 'Template Cloned',
      description: 'Environment template has been cloned successfully',
    });
  };

  // Delete a template
  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(template => template.id !== id));
    
    toast({
      title: 'Template Deleted',
      description: 'Environment template has been deleted',
    });
  };

  // Select a template to use
  const selectTemplate = (template: EnvironmentTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template.id);
    }
    
    toast({
      title: 'Template Selected',
      description: `${template.name} template has been selected`,
    });
  };

  // Get icon for template type
  const getTemplateIcon = (type: EnvironmentTemplate['type']) => {
    switch (type) {
      case 'trend_following':
        return <LineChart className="h-4 w-4" />;
      case 'mean_reversion':
        return <ArrowLeftRight className="h-4 w-4" />;
      case 'breakout':
        return <Zap className="h-4 w-4" />;
      case 'arbitrage':
        return <BadgeDollarSign className="h-4 w-4" />;
      case 'custom':
        return <Scale className="h-4 w-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Environment Templates</CardTitle>
              <CardDescription>
                Predefined environment setups for different trading strategies
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchTemplates}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Environment Template</DialogTitle>
                    <DialogDescription>
                      Create a new environment template for your trading strategies
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="e.g., My Custom Trading Environment"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea
                        id="template-description"
                        value={newTemplateDescription}
                        onChange={(e) => setNewTemplateDescription(e.target.value)}
                        placeholder="Describe the purpose and contents of this environment"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Template Type</Label>
                      <RadioGroup
                        value={newTemplateType}
                        onValueChange={(value) => setNewTemplateType(value as EnvironmentTemplate['type'])}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="trend_following" id="trend" />
                          <Label htmlFor="trend" className="flex items-center">
                            <LineChart className="h-4 w-4 mr-2" />
                            Trend Following
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mean_reversion" id="mean" />
                          <Label htmlFor="mean" className="flex items-center">
                            <ArrowLeftRight className="h-4 w-4 mr-2" />
                            Mean Reversion
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="breakout" id="breakout" />
                          <Label htmlFor="breakout" className="flex items-center">
                            <Zap className="h-4 w-4 mr-2" />
                            Breakout
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="arbitrage" id="arbitrage" />
                          <Label htmlFor="arbitrage" className="flex items-center">
                            <BadgeDollarSign className="h-4 w-4 mr-2" />
                            Arbitrage
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom" className="flex items-center">
                            <Scale className="h-4 w-4 mr-2" />
                            Custom
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createTemplate}>
                      Create Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-muted">
                          {getTemplateIcon(template.type)}
                          <span className="ml-1 capitalize">{template.type.replace('_', ' ')}</span>
                        </Badge>
                        <Badge>v{template.version}</Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedTemplate(template);
                            setCloneDialogOpen(true);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">APIs</p>
                        <p className="text-lg font-bold">{template.resources.apis}</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">Strategies</p>
                        <p className="text-lg font-bold">{template.strategies}</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">Agents</p>
                        <p className="text-lg font-bold">{template.agents}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-right">
                      Updated {formatDate(template.updated_at)}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant="default" 
                      className="w-full"
                      onClick={() => selectTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Templates Found</AlertTitle>
              <AlertDescription>
                No environment templates have been created yet.
                Click "Create Template" to create your first environment template.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Clone Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Environment Template</DialogTitle>
            <DialogDescription>
              Create a copy of the selected environment template
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedTemplate && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Confirm Cloning</AlertTitle>
                <AlertDescription>
                  You are about to create a copy of <strong>{selectedTemplate.name}</strong>.
                  The new template will include all resources, strategies, and agents from the original.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={cloneTemplate}>
              Clone Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
