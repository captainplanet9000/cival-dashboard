import React, { useState, useEffect } from 'react';
import { FarmAgent } from '@/services/farm/farm-service';
import { 
  WorkflowTemplate, 
  TemplateParameterValues,
  workflowTemplateService 
} from '@/services/workflow-template-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface WorkflowTemplatesProps {
  agent: FarmAgent;
  onSelectTemplate: (templateId: string, input: string) => void;
}

export const WorkflowTemplates: React.FC<WorkflowTemplatesProps> = ({ 
  agent,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [paramValues, setParamValues] = useState<TemplateParameterValues>({});
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [activeTab, setActiveTab] = useState('featured');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates for the agent type
  useEffect(() => {
    if (agent && agent.type) {
      const agentTemplates = workflowTemplateService.getTemplatesByAgentType(agent.type);
      setTemplates(agentTemplates);
      
      // Reset selections when agent changes
      setSelectedTemplateId('');
      setSelectedTemplate(null);
      setParamValues({});
      setGeneratedPrompt('');
    }
  }, [agent]);

  // Update selected template when template ID changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = workflowTemplateService.getTemplateById(selectedTemplateId);
      setSelectedTemplate(template || null);
      
      // Reset parameter values but apply defaults
      if (template) {
        const defaultParams: TemplateParameterValues = {};
        template.parameters.forEach(param => {
          if (param.default !== undefined) {
            defaultParams[param.name] = param.default;
          }
        });
        setParamValues(defaultParams);
      } else {
        setParamValues({});
      }
      
      setGeneratedPrompt('');
    } else {
      setSelectedTemplate(null);
      setParamValues({});
      setGeneratedPrompt('');
    }
  }, [selectedTemplateId]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Handle parameter value change
  const handleParamChange = (paramName: string, value: any) => {
    setParamValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  // Generate prompt from template and parameters
  const handleGeneratePrompt = () => {
    setError(null);
    
    if (!selectedTemplateId) {
      setError('Please select a template first');
      return;
    }
    
    try {
      const prompt = workflowTemplateService.applyTemplate(selectedTemplateId, paramValues);
      setGeneratedPrompt(prompt);
    } catch (err: any) {
      setError(err.message || 'Failed to generate prompt from template');
      console.error('Error generating prompt:', err);
    }
  };

  // Handle using the generated prompt
  const handleUseTemplate = () => {
    if (generatedPrompt && selectedTemplateId) {
      onSelectTemplate(selectedTemplateId, generatedPrompt);
    }
  };

  // Filter templates based on active tab
  const getFilteredTemplates = () => {
    if (activeTab === 'featured') {
      return templates.filter(t => t.featured);
    }
    if (activeTab === 'all') {
      return templates;
    }
    // Filter by workflow type
    return templates.filter(t => t.type === activeTab);
  };

  // Get all unique workflow types from templates
  const getWorkflowTypes = () => {
    const types = new Set(templates.map(t => t.type));
    return Array.from(types);
  };

  // Render parameter input based on parameter type
  const renderParameterInput = (param: WorkflowTemplate['parameters'][0]) => {
    const value = paramValues[param.name] !== undefined ? paramValues[param.name] : '';
    
    if (param.options) {
      return (
        <Select 
          value={String(value)} 
          onValueChange={(val) => handleParamChange(param.name, val)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${param.name}...`} />
          </SelectTrigger>
          <SelectContent>
            {param.options.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    switch (param.type) {
      case 'number':
      case 'percentage':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
            placeholder={`Enter ${param.name}...`}
          />
        );
      case 'boolean':
        return (
          <Select 
            value={value ? 'true' : 'false'} 
            onValueChange={(val) => handleParamChange(param.name, val === 'true')}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${param.name}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'assets':
        return (
          <Input
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => {
              const assetsList = e.target.value.split(',').map(a => a.trim()).filter(Boolean);
              handleParamChange(param.name, assetsList);
            }}
            placeholder="Enter assets separated by commas (e.g., BTC, ETH, SOL)"
          />
        );
      default: // string, asset, timeframe, etc.
        return (
          <Input
            value={value}
            onChange={(e) => handleParamChange(param.name, e.target.value)}
            placeholder={`Enter ${param.name}...`}
          />
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Workflow Templates</CardTitle>
        <CardDescription>
          Select a template to quickly set up a workflow for your {agent.type} agent
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-2">
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            {getWorkflowTypes().map(type => (
              <TabsTrigger key={type} value={type}>{type}</TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getFilteredTemplates().map(template => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all ${selectedTemplateId === template.id ? 'ring-2 ring-primary' : 'hover:bg-accent/50'}`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline">{template.type}</Badge>
                    </div>
                    <CardDescription className="text-xs">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {template.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Parameters: {template.parameters.map(p => p.name).join(', ')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        {selectedTemplate && (
          <div className="mt-6 border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Configure Template: {selectedTemplate.name}</h3>
            
            <div className="space-y-4">
              {selectedTemplate.parameters.map(param => (
                <div key={param.name} className="grid gap-2">
                  <Label htmlFor={param.name}>
                    {param.name} {param.required && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="flex items-center gap-2">
                    {renderParameterInput(param)}
                  </div>
                  <p className="text-xs text-muted-foreground">{param.description}</p>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={handleGeneratePrompt}>
                Generate Prompt
              </Button>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-2 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        
        {generatedPrompt && (
          <div className="mt-6 border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Generated Prompt</h3>
            <div className="p-3 bg-muted rounded-md">
              <p className="whitespace-pre-wrap">{generatedPrompt}</p>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleUseTemplate}>
                Use This Template
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 