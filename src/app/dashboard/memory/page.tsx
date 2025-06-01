'use client';

import React, { useState, useEffect } from 'react';
import { Metadata } from 'next';
import { KnowledgeCard } from '@/components/brain/KnowledgeCard';
import { CommandTerminal } from '@/components/brain/CommandTerminal';
import { AgentNetworkGraph } from '@/components/brain/AgentNetworkGraph';
import { EnhancedDocumentUploader } from '@/components/brain/EnhancedDocumentUploader';
import { useBrainFarm } from '@/hooks/useBrainFarm';
import { BrainDocument } from '@/services/brain/brain-service';
import { useDashboard } from '@/contexts/DashboardContext';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Brain } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agent Memory - Trading Farm Dashboard',
  description: 'Visualize agent memory and knowledge graphs for your trading agents.'
};

export default function BrainFarmPage() {
  const { selectedFarmId } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<BrainDocument | null>(null);
  const { 
    documents, 
    isDocumentsLoading, 
    searchDocuments,
    deleteDocument
  } = useBrainFarm({ farmId: selectedFarmId || undefined });

  // Handle document search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchDocuments(searchQuery);
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
    }
  };

  // Handle document view
  const handleViewDocument = (document: BrainDocument) => {
    setSelectedDocument(document);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Brain Farm</h1>
          <p className="text-muted-foreground">
            Manage your farm's knowledge base and agent coordination
          </p>
        </div>
        <EnhancedDocumentUploader farmId={selectedFarmId || undefined} />
      </div>

      <Tabs defaultValue="knowledge" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="command">Command Terminal</TabsTrigger>
          <TabsTrigger value="agents">Agent Network</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Brain className="h-5 w-5 mr-2" />
                Knowledge Repository
              </CardTitle>
              <CardDescription>
                Browse and search through your farm's knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex items-center space-x-2 mb-4">
                <Input
                  placeholder="Search knowledge base..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {isDocumentsLoading ? (
                  <div className="col-span-2 flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No documents found. Upload your first document to get started.
                  </div>
                ) : (
                  documents.map(doc => (
                    <KnowledgeCard
                      key={doc.id}
                      document={doc}
                      onDelete={handleDeleteDocument}
                      onView={handleViewDocument}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {selectedDocument && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedDocument.title}</CardTitle>
                <CardDescription>
                  {selectedDocument.document_type} • Created: {new Date(selectedDocument.created_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                    {selectedDocument.content}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="command">
          <CommandTerminal farmId={selectedFarmId || undefined} height="500px" />
        </TabsContent>

        <TabsContent value="agents">
          <AgentNetworkGraph farmId={selectedFarmId || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 