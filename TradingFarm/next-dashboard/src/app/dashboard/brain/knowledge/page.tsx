'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, AlertCircle, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { createBrowserClient } from '@/utils/supabase/client';
import { KnowledgeDocument } from '@/types/knowledge';
import { DEMO_MODE, demoKnowledgeDocuments } from '@/utils/demo-data';

interface NewDocument {
  title: string;
  content: string;
  category: string;
  tags: string;
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');
  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  const [documents, setDocuments] = React.useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [newDocument, setNewDocument] = React.useState<NewDocument>({
    title: '',
    content: '',
    category: 'strategy',
    tags: ''
  });
  
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;
  
  // All available tags
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    documents.forEach((doc: KnowledgeDocument) => {
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  }, [documents]);
  
  React.useEffect(() => {
    async function fetchDocuments() {
      setIsLoading(true);
      setConnectionError(null);
      
      try {
        // If in demo mode or development, use demo data
        if (DEMO_MODE || process.env.NODE_ENV === 'development') {
          setTimeout(() => {
            setDocuments(demoKnowledgeDocuments);
            setIsLoading(false);
            toast({
              title: "Demo Mode Active",
              description: "Showing knowledge document demo data - no database connection required",
            });
          }, 800); // Simulate network delay
          return;
        }
        
        // Attempt to fetch documents from the knowledge_base table
        const { data, error } = await supabase
          .from('knowledge_base')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching knowledge documents:', error);
          throw error;
        }
        
        if (data && data.length > 0) {
          setDocuments(data as KnowledgeDocument[]);
          setConnectionError(null);
          toast({
            title: "Data loaded successfully",
            description: `Loaded ${data.length} knowledge documents from database`,
          });
        } else {
          // No documents found, set demo data with notification
          setDocuments(demoKnowledgeDocuments);
          setConnectionError("No knowledge documents found in the database. Showing demo data instead.");
        }
      } catch (error: any) {
        console.error('Failed to fetch knowledge documents:', error);
        
        const errorMessage = error.message || 'Unknown error occurred';
        setConnectionError(errorMessage);
        
        // Set demo data
        setDocuments(demoKnowledgeDocuments);
        
        // Attempt retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount((prev: number) => prev + 1);
          }, RETRY_DELAY);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, [supabase, retryCount, toast]);
  
  const handleRetryConnection = () => {
    setRetryCount(0);
  };
  
  const toggleTag = (tag: string) => {
    setActiveTags((prev: string[]) => 
      prev.includes(tag) 
        ? prev.filter((t: string) => t !== tag) 
        : [...prev, tag]
    );
  };
  
  const handleCreateDocument = async () => {
    if (!newDocument.title || !newDocument.content) {
      toast({
        title: "Missing information",
        description: "Please provide both title and content for the document.",
        variant: "destructive"
      });
      return;
    }
    
    const tagsArray = newDocument.tags
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0);
    
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .insert([
          {
            title: newDocument.title,
            content: newDocument.content,
            category: newDocument.category,
            tags: tagsArray
          }
        ]);
      
      if (error) throw error;
      
      toast({
        title: "Document Created",
        description: "Your knowledge document has been added to the database."
      });
      
      // Reset form and refresh documents
      setNewDocument({
        title: '',
        content: '',
        category: 'strategy',
        tags: ''
      });
      
      // Trigger refetch
      setRetryCount((prev: number) => prev + 1);
      
    } catch (error: any) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create document",
        variant: "destructive"
      });
    }
  };
  
  // Filter documents based on search query, active tab, and tags
  const filteredDocuments = documents.filter((doc: KnowledgeDocument) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || doc.category === activeTab;
    const matchesTags = activeTags.length === 0 || 
                        (doc.tags && activeTags.every((tag: string) => doc.tags!.includes(tag)));
    
    return matchesSearch && matchesTab && matchesTags;
  });
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Search and manage trading knowledge, strategies, and insights
        </p>
      </div>
      
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{connectionError}</span>
            <Button variant="outline" size="sm" onClick={handleRetryConnection}>Retry Connection</Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search knowledge base..."
            className="pl-8"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Knowledge Document</DialogTitle>
              <DialogDescription>
                Add new information to your trading knowledge base.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  placeholder="Document title" 
                  value={newDocument.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocument({...newDocument, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select 
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newDocument.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewDocument({...newDocument, category: e.target.value})}
                >
                  <option value="strategy">Strategy</option>
                  <option value="market">Market</option>
                  <option value="fundamentals">Fundamentals</option>
                  <option value="management">Risk Management</option>
                  <option value="psychology">Psychology</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input 
                  id="tags" 
                  placeholder="technical-analysis, beginner, momentum" 
                  value={newDocument.tags}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocument({...newDocument, tags: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea 
                  id="content" 
                  placeholder="Write your document content here..." 
                  rows={8}
                  value={newDocument.content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDocument({...newDocument, content: e.target.value})}
                />
              </div>
              <Button type="button" onClick={handleCreateDocument}>
                Create Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Active tags display */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center h-8">
            <Tag className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Active Filters:</span>
          </div>
          {activeTags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => toggleTag(tag)}>
              {tag} ✕
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setActiveTags([])}>
            Clear All
          </Button>
        </div>
      )}
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="strategy">Strategies</TabsTrigger>
          <TabsTrigger value="market">Market Analysis</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
          <TabsTrigger value="management">Risk Management</TabsTrigger>
          <TabsTrigger value="psychology">Psychology</TabsTrigger>
        </TabsList>
        
        {/* Documents by category */}
        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' ? 'All Knowledge Documents' : 
                  activeTab === 'strategy' ? 'Strategy Documents' :
                  activeTab === 'market' ? 'Market Analysis Documents' :
                  activeTab === 'fundamentals' ? 'Fundamental Analysis Documents' :
                  activeTab === 'management' ? 'Risk Management Documents' :
                  'Trading Psychology Documents'}
              </CardTitle>
              <CardDescription>
                {filteredDocuments.length} document{filteredDocuments.length !== 1 && 's'} found
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
              ) : filteredDocuments.length > 0 ? (
                <div className="space-y-4">
                  {filteredDocuments.map((doc: KnowledgeDocument) => (
                    <Card key={doc.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          <Badge>{doc.category}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.tags && doc.tags.map(tag => (
                            <Badge 
                              key={tag} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-accent"
                              onClick={() => toggleTag(tag)}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {doc.content}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-muted-foreground">
                            Last updated: {new Date(doc.updated_at).toLocaleDateString()}
                          </span>
                          <Button variant="ghost" size="sm" className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            Read More
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? `No documents match your search for "${searchQuery}"`
                      : activeTags.length > 0
                        ? "No documents match the selected tags"
                        : "No documents in this category yet"}
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      {/* Same dialog content as above */}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
