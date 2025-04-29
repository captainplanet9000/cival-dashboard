'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

// Define document types
interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

interface NewDocument {
  title: string;
  content: string;
  category: string;
  tags: string;
}

// Sample data for demonstration
const demoKnowledgeDocuments: KnowledgeDocument[] = [
  {
    id: '1',
    title: 'Market Analysis Technique',
    content: 'Detailed analysis of market trends using technical indicators.',
    category: 'strategy',
    tags: ['technical-analysis', 'indicators', 'trends'],
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-18T14:20:00Z'
  },
  {
    id: '2',
    title: 'Risk Management Framework',
    content: 'Comprehensive risk management strategies for algorithmic trading.',
    category: 'risk',
    tags: ['risk-management', 'position-sizing', 'drawdown'],
    created_at: '2025-02-05T09:15:00Z',
    updated_at: '2025-02-05T09:15:00Z'
  }
];

export default function KnowledgeBasePage() {
  // State management
  const [knowledgeTab, setKnowledgeTab] = React.useState('brain');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');
  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  const [documents, setDocuments] = React.useState<KnowledgeDocument[]>(demoKnowledgeDocuments);
  const [isLoading, setIsLoading] = React.useState(false);
  const [newDocument, setNewDocument] = React.useState<NewDocument>({
    title: '',
    content: '',
    category: 'strategy',
    tags: ''
  });
  const [showNewDocumentDialog, setShowNewDocumentDialog] = React.useState(false);
  const { toast } = useToast();

  // Filter documents based on search query, active tab, and tags
  const filteredDocuments = documents.filter((doc: KnowledgeDocument) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || doc.category === activeTab;
    const matchesTags = activeTags.length === 0 || 
                        (doc.tags && activeTags.every((tag: string) => doc.tags!.includes(tag)));
    
    return matchesSearch && matchesTab && matchesTags;
  });

  // Add document handler
  const handleAddDocument = () => {
    if (newDocument.title.trim() === '' || newDocument.content.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive"
      });
      return;
    }

    const newDoc: KnowledgeDocument = {
      id: Date.now().toString(),
      title: newDocument.title,
      content: newDocument.content,
      category: newDocument.category,
      tags: newDocument.tags.split(',').map((tag: string) => tag.trim()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setDocuments([...documents, newDoc]);
    setNewDocument({
      title: '',
      content: '',
      category: 'strategy',
      tags: ''
    });
    setShowNewDocumentDialog(false);
    toast({
      title: "Document Added",
      description: "Knowledge document successfully added"
    });
  };

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
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="brain">ElizaOS Knowledge</TabsTrigger>
          <TabsTrigger value="docs">Document Library</TabsTrigger>
          <TabsTrigger value="sharing">Knowledge Sharing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="brain" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search knowledge base..."
                className="pl-8"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={showNewDocumentDialog} onOpenChange={setShowNewDocumentDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Knowledge Document</DialogTitle>
                  <DialogDescription>
                    Add a new document to the ElizaOS knowledge base
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newDocument.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocument({...newDocument, title: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      rows={5}
                      value={newDocument.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDocument({...newDocument, content: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newDocument.category}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewDocument({...newDocument, category: e.target.value})}
                    >
                      <option value="strategy">Strategy</option>
                      <option value="research">Research</option>
                      <option value="risk">Risk Management</option>
                      <option value="market">Market Analysis</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={newDocument.tags}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocument({...newDocument, tags: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewDocumentDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddDocument}>Add Document</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('all')}
            >
              All
            </Button>
            <Button
              variant={activeTab === 'strategy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('strategy')}
            >
              Strategy
            </Button>
            <Button
              variant={activeTab === 'risk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('risk')}
            >
              Risk
            </Button>
            <Button
              variant={activeTab === 'market' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('market')}
            >
              Market
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc: KnowledgeDocument) => (
                <Card key={doc.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between">
                      <CardTitle className="text-lg font-medium">{doc.title}</CardTitle>
                    </div>
                    <CardDescription>
                      Added on {new Date(doc.created_at || '').toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {doc.content}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags?.map((tag: string) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => {
                            if (!activeTags.includes(tag)) {
                              setActiveTags([...activeTags, tag]);
                            } else {
                              setActiveTags(activeTags.filter((t: string) => t !== tag));
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No documents found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
                <Button onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                  setActiveTags([]);
                }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="docs">
          <div className="flex justify-center items-center p-12">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Document Library</AlertTitle>
              <AlertDescription>
                This feature will be available in the next release.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        <TabsContent value="sharing">
          <div className="flex justify-center items-center p-12">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Knowledge Sharing</AlertTitle>
              <AlertDescription>
                This feature will be available in the next release.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="flex justify-center items-center p-12">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Knowledge Analytics</AlertTitle>
              <AlertDescription>
                This feature will be available in the next release.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
