/**
 * Goal Templates Dialog Component
 * Allows users to create, browse, and apply goal templates
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { goalTemplateService } from '@/services/goal-template-service';
import { goalService } from '@/services/goal-service';
import { Loader2, Plus, Search, Tag, Library, Copy, ArrowRightCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { AIGoalSettings } from '@/services/elizaos-goal-service';

// Define interfaces for props and state
interface GoalTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  onTemplateApplied?: () => void;
}

interface GoalTemplateFormValues {
  title: string;
  description: string;
  target_value: number;
  target_unit: string;
  category: string;
  icon: string;
  color: string;
  duration_days: number;
  is_public: boolean;
  ai_settings?: AIGoalSettings;
}

interface TemplateCardProps {
  template: any;
  onApply: (template: any) => void;
  onSaveAsNew: (template: any) => void;
}

// Template Card Component
const TemplateCard: React.FC<TemplateCardProps> = ({ template, onApply, onSaveAsNew }) => {
  return (
    <Card className="mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{template.title}</CardTitle>
            <CardDescription className="line-clamp-2">{template.description}</CardDescription>
          </div>
          {template.is_public && (
            <Badge variant="secondary" className="ml-2">Public</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {template.target_value && (
            <div>
              <span className="font-medium">Target:</span> {template.target_value} {template.target_unit}
            </div>
          )}
          {template.category && (
            <div>
              <span className="font-medium">Category:</span> {template.category}
            </div>
          )}
          {template.duration_days && (
            <div>
              <span className="font-medium">Duration:</span> {template.duration_days} days
            </div>
          )}
          {template.ai_settings && Object.keys(template.ai_settings).length > 0 && (
            <div>
              <span className="font-medium">AI-Enhanced</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onSaveAsNew(template)}>
          <Copy className="h-4 w-4 mr-1" /> Duplicate
        </Button>
        <Button size="sm" onClick={() => onApply(template)}>
          <ArrowRightCircle className="h-4 w-4 mr-1" /> Apply
        </Button>
      </CardFooter>
    </Card>
  );
};

// Goal Templates Dialog Component
export const GoalTemplatesDialog: React.FC<GoalTemplatesDialogProps> = ({ 
  open, 
  onOpenChange, 
  farmId,
  onTemplateApplied
}) => {
  // State variables
  const [activeTab, setActiveTab] = useState('browse');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formValues, setFormValues] = useState<GoalTemplateFormValues>({
    title: '',
    description: '',
    target_value: 0,
    target_unit: '',
    category: '',
    icon: '',
    color: '#3b82f6',
    duration_days: 30,
    is_public: false
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [useAI, setUseAI] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  // Load templates from service
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await goalTemplateService.getTemplates();
      if (error) {
        toast({
          title: "Error loading templates",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        setTemplates(data);
        setFilteredTemplates(data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(t => t.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter templates based on search query and category
  useEffect(() => {
    let filtered = [...templates];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        template => 
          template.title.toLowerCase().includes(query) || 
          (template.description && template.description.toLowerCase().includes(query)) ||
          (template.category && template.category.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }
    
    setFilteredTemplates(filtered);
  }, [searchQuery, categoryFilter, templates]);

  // Form input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Convert numeric values
    if (type === 'number') {
      setFormValues({
        ...formValues,
        [name]: Number(value)
      });
    } else {
      setFormValues({
        ...formValues,
        [name]: value
      });
    }
  };

  // Checkbox change handler
  const handleCheckboxChange = (checked: boolean) => {
    setFormValues({
      ...formValues,
      is_public: checked
    });
  };

  // Submit form handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      // Add AI settings if enabled
      let finalFormValues = { ...formValues };
      
      if (useAI) {
        finalFormValues.ai_settings = {
          allowed_models: ["gpt-4", "claude-3", "gemini-pro"],
          prompt_template: "",
          evaluation_criteria: "",
          use_knowledge_base: true,
          max_autonomous_steps: 5
        };
      }
      
      const { data, error } = await goalTemplateService.createTemplate(finalFormValues);
      
      if (error) {
        toast({
          title: "Error creating template",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Template created",
        description: "Your goal template has been created successfully",
      });
      
      // Reset form and reload templates
      setFormValues({
        title: '',
        description: '',
        target_value: 0,
        target_unit: '',
        category: '',
        icon: '',
        color: '#3b82f6',
        duration_days: 30,
        is_public: false
      });
      
      setUseAI(false);
      setActiveTab('browse');
      loadTemplates();
      
    } catch (err) {
      console.error("Failed to create template:", err);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Apply template to farm
  const handleApplyTemplate = async (template: any) => {
    setLoading(true);
    try {
      // Create a new goal from the template
      const goalData = {
        title: template.title,
        description: template.description,
        target_value: template.target_value,
        target_unit: template.target_unit,
        category: template.category,
        icon: template.icon,
        color: template.color,
        farm_id: farmId,
        status: 'not_started',
        duration_days: template.duration_days,
        ai_settings: template.ai_settings || undefined
      };
      
      const { data, error } = await goalService.createGoal(goalData);
      
      if (error) {
        toast({
          title: "Error applying template",
          description: error,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Template applied",
        description: "A new goal has been created from the template",
      });
      
      // Close dialog and notify parent component
      onOpenChange(false);
      if (onTemplateApplied) {
        onTemplateApplied();
      }
      
    } catch (err) {
      console.error("Failed to apply template:", err);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save template as new
  const handleSaveAsNew = (template: any) => {
    // Pre-fill form with template data
    setFormValues({
      title: `Copy of ${template.title}`,
      description: template.description || '',
      target_value: template.target_value || 0,
      target_unit: template.target_unit || '',
      category: template.category || '',
      icon: template.icon || '',
      color: template.color || '#3b82f6',
      duration_days: template.duration_days || 30,
      is_public: false,
      ai_settings: template.ai_settings
    });
    
    // Set AI toggle if there are AI settings
    setUseAI(!!template.ai_settings && Object.keys(template.ai_settings).length > 0);
    
    // Switch to create tab
    setActiveTab('create');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Goal Templates</DialogTitle>
          <DialogDescription>
            Browse, create, and apply goal templates to your farm.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">
              <Library className="h-4 w-4 mr-2" />
              Browse Templates
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </TabsTrigger>
          </TabsList>
          
          {/* Browse Templates Tab */}
          <TabsContent value="browse" className="mt-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="space-y-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={handleApplyTemplate}
                    onSaveAsNew={handleSaveAsNew}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Library className="h-12 w-12 mx-auto mb-2 opacity-50" />
                {searchQuery || categoryFilter !== 'all' ? (
                  <p>No templates match your filters.</p>
                ) : (
                  <p>No templates available. Create your first template!</p>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Create Template Tab */}
          <TabsContent value="create" className="mt-4 max-h-[60vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formValues.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_value">Target Value</Label>
                  <Input
                    id="target_value"
                    name="target_value"
                    type="number"
                    value={formValues.target_value}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="target_unit">Target Unit</Label>
                  <Input
                    id="target_unit"
                    name="target_unit"
                    value={formValues.target_unit}
                    onChange={handleInputChange}
                    placeholder="e.g., USD, BTC, points"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formValues.category}
                    onChange={handleInputChange}
                    placeholder="e.g., Trading, Learning, Profit"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration_days">Duration (days)</Label>
                  <Input
                    id="duration_days"
                    name="duration_days"
                    type="number"
                    value={formValues.duration_days}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (optional)</Label>
                  <Input
                    id="icon"
                    name="icon"
                    value={formValues.icon}
                    onChange={handleInputChange}
                    placeholder="e.g., chart-line, coins"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="color"
                      name="color"
                      type="color"
                      value={formValues.color}
                      onChange={handleInputChange}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      value={formValues.color}
                      onChange={handleInputChange}
                      name="color"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="is_public" 
                  checked={formValues.is_public}
                  onCheckedChange={handleCheckboxChange}
                />
                <Label htmlFor="is_public" className="cursor-pointer">
                  Make this template available to all users
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="use_ai"
                  checked={useAI}
                  onCheckedChange={setUseAI}
                />
                <Label htmlFor="use_ai" className="cursor-pointer">
                  Enable AI-assistance for this goal template
                </Label>
              </div>
              
              {useAI && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    AI-assisted goals will have access to:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
                    <li>Automatic progress evaluation</li>
                    <li>Strategy recommendations</li>
                    <li>ElizaOS agent compatibility</li>
                    <li>Advanced performance analytics</li>
                  </ul>
                </div>
              )}
            </form>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          {activeTab === 'create' && (
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={createLoading || !formValues.title}
            >
              {createLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
