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
import { BrainAssetsList } from '@/components/brain/brain-assets-list';
import { ElizaOSConsole } from '@/components/brain/ElizaOSConsole';
import { BrainFilesTable } from '@/components/brain/BrainFilesTable';
import { BrainFileProcessor } from '@/components/brain/BrainFileProcessor';
import { KnowledgeVisualization } from '@/components/brain/KnowledgeVisualization';
import { AdvancedKnowledgeQuery } from '@/components/brain/AdvancedKnowledgeQuery';
import { KnowledgeSharing } from '@/components/brain/KnowledgeSharing';
import { KnowledgeGovernance } from '@/components/brain/KnowledgeGovernance';
import { KnowledgeAnalyticsDashboard } from '@/components/brain/KnowledgeAnalyticsDashboard';
import { KnowledgeComments } from '@/components/brain/KnowledgeComments';

interface NewDocument {
  title: string;
  content: string;
  category: string;
  tags: string;
}

export default function KnowledgeBasePage() {
  // Control the main knowledge base tabs
  const [knowledgeTab, setKnowledgeTab] = React.useState('brain');
  const [selectedBrainFileId, setSelectedBrainFileId] = React.useState<string | null>(null);
  
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
    <div className="flex flex-col gap-8 mt-4">
      <h1 className="text-2xl font-bold">ElizaOS Knowledge Management</h1>
      
      <div className="rounded-md bg-muted p-4">
        <h2 className="font-medium mb-2">Getting Started with ElizaOS Knowledge</h2>
        <p className="text-sm text-muted-foreground">
          ElizaOS provides advanced knowledge management capabilities for your trading strategies and market research.
          Upload documents, query the knowledge base, and integrate AI-powered insights into your trading workflow.
        </p>
      </div>
      
      <Tabs value={knowledgeTab} onValueChange={setKnowledgeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="brain">ElizaOS Knowledge</TabsTrigger>
          <TabsTrigger value="docs">Document Library</TabsTrigger>
          <TabsTrigger value="sharing">Knowledge Sharing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="brain" className="space-y-4">
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          {/* Main Console - Spans first row, first 2 columns on large screens */}
          <div className="2xl:col-span-2">
            <ElizaOSConsole farmId={farmData?.id} />
          </div>
          
          {/* File Processor - First row, 3rd column on large screens */}
          <div>
            <BrainFileProcessor farmId={farmData?.id} />
          </div>
          
          {/* Advanced Query - Second row, spans first 2 columns on large screens */}
          <div className="2xl:col-span-2">
            <AdvancedKnowledgeQuery farmId={farmData?.id} />
          </div>
          
          {/* Knowledge Visualization - Second row, 3rd column on large screens */}
          <div className="row-span-2">
            <KnowledgeVisualization farmId={farmData?.id} />
          </div>
          
          {/* Brain Files Table - Third row, spans first 2 columns on large screens */}
          <div className="2xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Brain Files</CardTitle>
                <CardDescription>
                  View and manage your knowledge files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrainFilesTable 
                  farmId="1" 
                  onSelectFile={(fileId) => setSelectedBrainFileId(fileId)} 
                />
              </CardContent>
            </Card>
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
          {/* Document Library Tab */}
          <TabsContent value="docs" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Library</CardTitle>
                    <CardDescription>
                      Browse and search your knowledge documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Search documents..."
                          className="max-w-md"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          New Document
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>
                      Filter by document category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {['All', 'Strategy', 'Market Analysis', 'Risk Management', 'Psychology'].map((category) => (
                        <Button 
                          key={category} 
                          variant={activeTab === category.toLowerCase() ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => setActiveTab(category.toLowerCase())}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Knowledge Sharing Tab */}
          <TabsContent value="sharing" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>ElizaOS Knowledge Sharing</CardTitle>
                  <CardDescription>
                    Share brain files and knowledge assets with team members and set permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KnowledgeSharing 
                    brainFileId={selectedBrainFileId} 
                    farmId="1" /* Replace with actual farm ID from context */
                  />
                </CardContent>
              </Card>

              {selectedBrainFileId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Knowledge Comments</CardTitle>
                    <CardDescription>
                      Collaborate on knowledge assets with comments and annotations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KnowledgeComments 
                      brainFileId={selectedBrainFileId}
                      farmId="1" /* Replace with actual farm ID from context */
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Analytics Dashboard</CardTitle>
                <CardDescription>
                  Insights and metrics on knowledge base usage and effectiveness
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KnowledgeAnalyticsDashboard 
                  farmId="1" /* Replace with actual farm ID from context */
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Governance</CardTitle>
                <CardDescription>
                  Monitor compliance, quality, and audit trails for your knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KnowledgeGovernance 
                  farmId="1" /* Replace with actual farm ID from context */
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brain Tab (ElizaOS Knowledge) */}
          <TabsContent value="brain" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>ElizaOS Console</CardTitle>
                    <CardDescription>
                      Query your knowledge base and get AI-powered insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ElizaOSConsole />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Query</CardTitle>
                    <CardDescription>
                      Perform advanced knowledge queries with multiple parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdvancedKnowledgeQuery />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Knowledge Visualization</CardTitle>
                    <CardDescription>
                      Visualize connections between knowledge assets
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <KnowledgeVisualization />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Brain Files</CardTitle>
                    <CardDescription>
                      View and manage your knowledge files
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BrainFilesTable 
                      farmId="1"
                      onSelectFile={(fileId) => setSelectedBrainFileId(fileId)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Processing Status</CardTitle>
                    <CardDescription>
                      Monitor file processing tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BrainFileProcessor />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
