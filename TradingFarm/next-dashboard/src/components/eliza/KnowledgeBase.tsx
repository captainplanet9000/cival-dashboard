'use client';

import * as React from "react";
import { createBrowserClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  Tag, 
  BookOpen, 
  BarChart, 
  TrendingUp,
  Upload
} from 'lucide-react';

import { KnowledgeFileUpload } from './KnowledgeFileUpload';

// Knowledge item types
type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  source_url?: string;
  source_type?: string;
  file_path?: string;
  status: string;
};

// Category types for organization
const CATEGORIES = [
  { value: 'strategy', label: 'Trading Strategy', icon: TrendingUp },
  { value: 'market-data', label: 'Market Data', icon: BarChart },
  { value: 'reference', label: 'Reference Material', icon: BookOpen },
  { value: 'general', label: 'General Knowledge', icon: FileText },
];

// Add knowledge form component
function AddKnowledgeForm({ 
  initialData = null, 
  onSuccess 
}: { 
  initialData?: KnowledgeItem | null;
  onSuccess: () => void;
}) {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState(initialData?.title || '');
  const [content, setContent] = React.useState(initialData?.content || '');
  const [category, setCategory] = React.useState(initialData?.category || 'general');
  const [tagsInput, setTagsInput] = React.useState(initialData?.tags?.join(', ') || '');
  const [tags, setTags] = React.useState<string[]>(initialData?.tags || []);

  const parseTagsInput = (input: string) => {
    const parsed = input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    setTags(parsed);
  };

  const addTag = () => {
    parseTagsInput(tagsInput);
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev: string[]) => prev.filter((tag: string) => tag !== tagToRemove));
    setTagsInput(tags.filter((tag: string) => tag !== tagToRemove).join(', '));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!title || !content || !category) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const knowledgeData = {
        title,
        content,
        category,
        tags,
        source_url: '',
        status: 'active'
      };
      
      let result;
      
      if (initialData) {
        // Update existing
        result = await supabase
          .from('knowledge_base')
          .update(knowledgeData)
          .eq('id', initialData.id);
      } else {
        // Insert new
        result = await supabase
          .from('knowledge_base')
          .insert(knowledgeData);
      }
      
      const { error } = result;
      
      if (error) throw error;
      
      toast({
        title: initialData ? 'Knowledge updated' : 'Knowledge added',
        description: initialData ? 'Knowledge item has been updated.' : 'New knowledge item has been added.'
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save knowledge item.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="Knowledge item title"
          required
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <Select value={category} onValueChange={(value: string) => setCategory(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="content" className="text-sm font-medium">
          Content
        </label>
        <Textarea
          id="content"
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          placeholder="Knowledge content"
          className="min-h-[200px]"
          required
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="tags" className="text-sm font-medium">
          Tags
        </label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
            placeholder="Enter tags separated by commas"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            <Tag className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} &times;
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update' : 'Add'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Knowledge base component
export function KnowledgeBase() {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<KnowledgeItem[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [editItem, setEditItem] = React.useState<KnowledgeItem | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<KnowledgeItem | null>(null);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('knowledge_base').select('*');
      
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }
      
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading knowledge base',
        description: error.message || 'Failed to load knowledge items.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setItems(items.filter(item => item.id !== id));
      
      toast({
        title: 'Item deleted',
        description: 'Knowledge item has been removed.'
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting item',
        description: error.message || 'Failed to delete knowledge item.',
        variant: 'destructive'
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    const Icon = cat?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(cat => cat.value === value)?.label || value;
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
  };

  const getFilteredItems = () => {
    return items.filter((item: KnowledgeItem) => {
      // Filter by search term
      const searchMatch = 
        searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by category
      const categoryMatch = selectedCategory === null || item.category === selectedCategory;
      
      return searchMatch && categoryMatch;
    });
  };

  React.useEffect(() => {
    loadKnowledgeBase();
  }, [searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Manage trading knowledge for ElizaOS agents
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
              <Button onClick={() => {
                setEditItem(null);
                setShowAddDialog(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Knowledge
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge base..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={selectedCategory || ''} onValueChange={(value: string) => setSelectedCategory(value !== 'all' ? value : null)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No knowledge items found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedCategory
                      ? 'Try adjusting your search or filters'
                      : 'Start by adding knowledge for your trading agents'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 && !loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No knowledge items found. Add some knowledge to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {loading && (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={`skeleton-${i}`}>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                              </TableRow>
                            ))
                          )}
                          
                          {!loading && items.map((item: KnowledgeItem) => (
                            <TableRow 
                              key={item.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedItem(item)}
                            >
                              <TableCell className="font-medium">{item.title}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {getCategoryIcon(item.category)}
                                  <span>{getCategoryLabel(item.category)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="max-w-[100px] truncate">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {item.tags.length > 3 && (
                                    <Badge variant="outline">+{item.tags.length - 3}</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditItem(item);
                                      setShowAddDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(item.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Knowledge Dialog */}
      <DialogPrimitive.Root 
        open={showUploadDialog} 
        onOpenChange={(value: boolean) => setShowUploadDialog(value)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
          <DialogContent className="fixed inset-0 max-w-md p-4 mx-auto my-auto bg-white rounded-md shadow-md">
            <DialogHeader>
              <DialogTitle>Upload Knowledge Files</DialogTitle>
              <DialogDescription>
                Add documents to the ElizaOS knowledge base for agents to reference
              </DialogDescription>
            </DialogHeader>
            <KnowledgeFileUpload 
              onUploadComplete={() => {
                setShowUploadDialog(false);
                loadKnowledgeBase();
              }} 
            />
          </DialogContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Knowledge Item Detail Dialog */}
      <DialogPrimitive.Root
        open={!!selectedItem}
        onOpenChange={(value: boolean) => {
          if (!value) setSelectedItem(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
          <DialogContent className="fixed inset-0 max-w-md p-4 mx-auto my-auto bg-white rounded-md shadow-md">
            {selectedItem && (
              <div>
                <DialogHeader>
                  <DialogTitle>{selectedItem.title}</DialogTitle>
                  <DialogDescription>
                    {getCategoryLabel(selectedItem.category)} • 
                    {formatDistanceToNow(new Date(selectedItem.created_at), { addSuffix: true })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="prose max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                      {selectedItem.content}
                    </pre>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditItem(selectedItem);
                      setSelectedItem(null);
                      setShowAddDialog(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Edit Knowledge Dialog */}
      <DialogPrimitive.Root
        open={!!editItem && showAddDialog}
        onOpenChange={(value: boolean) => {
          if (!value) {
            setShowAddDialog(false);
            setEditItem(null);
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
          <DialogContent className="fixed inset-0 max-w-md p-4 mx-auto my-auto bg-white rounded-md shadow-md">
            {editItem && showAddDialog && (
              <div>
                <DialogHeader>
                  <DialogTitle>Edit Knowledge</DialogTitle>
                  <DialogDescription>
                    Update this trading knowledge.
                  </DialogDescription>
                </DialogHeader>
                <AddKnowledgeForm
                  initialData={editItem}
                  onSuccess={() => {
                    setEditItem(null);
                    setShowAddDialog(false);
                    loadKnowledgeBase();
                  }}
                />
              </div>
            )}
          </DialogContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Add Knowledge Dialog */}
      <DialogPrimitive.Root
        open={showAddDialog && !editItem}
        onOpenChange={(value: boolean) => setShowAddDialog(value)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
          <DialogContent className="fixed inset-0 max-w-md p-4 mx-auto my-auto bg-white rounded-md shadow-md">
            {showAddDialog && !editItem && (
              <div>
                <DialogHeader>
                  <DialogTitle>Add Knowledge</DialogTitle>
                  <DialogDescription>
                    Add new trading knowledge.
                  </DialogDescription>
                </DialogHeader>
                <AddKnowledgeForm
                  onSuccess={() => {
                    setShowAddDialog(false);
                    loadKnowledgeBase();
                  }}
                />
              </div>
            )}
          </DialogContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
