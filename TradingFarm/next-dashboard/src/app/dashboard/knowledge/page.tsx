'use client';

import React, { useState, useEffect } from 'react';
import knowledgeService from '@/services/knowledge-service-factory';
import { KnowledgeDocument } from '@/services/knowledge-service';
import { Search, Plus, BookOpen, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import KnowledgeSearch from '@/components/knowledge/knowledge-search';
import DocumentList from '@/components/knowledge/document-list';
import AddDocumentDialog from '@/components/knowledge/add-document-dialog';

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  
  useEffect(() => {
    fetchDocuments();
  }, []);
  
  async function fetchDocuments() {
    setLoading(true);
    try {
      const result = await knowledgeService.listDocuments();
      if (result.success) {
        setDocuments(result.data);
      } else {
        toast({
          title: 'Error loading documents',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast({
        title: 'Error loading documents',
        description: 'Failed to fetch documents. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  const filteredDocuments = (() => {
    if (activeTab === 'all') return documents;
    if (activeTab === 'public') return documents.filter(doc => doc.is_public);
    if (activeTab === 'private') return documents.filter(doc => !doc.is_public);
    
    // Filter by document type
    return documents.filter(doc => doc.document_type === activeTab);
  })();
  
  const documentTypes = Array.from(new Set(documents.map(doc => doc.document_type)));
  
  function handleDocumentAdded() {
    fetchDocuments();
    setIsAddDialogOpen(false);
    toast({
      title: 'Document added',
      description: 'The document was successfully added to the knowledge base.',
    });
  }
  
  async function handleDocumentDelete(documentId: string) {
    try {
      const result = await knowledgeService.deleteDocument(documentId);
      if (result.success) {
        fetchDocuments();
        toast({
          title: 'Document deleted',
          description: 'The document was successfully removed from the knowledge base.',
        });
      } else {
        toast({
          title: 'Error deleting document',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast({
        title: 'Error deleting document',
        description: 'Failed to delete the document. Please try again.',
        variant: 'destructive',
      });
    }
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Management</h1>
          <p className="text-muted-foreground">Manage and search ElizaOS knowledge documents</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Document
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Knowledge</CardTitle>
              <CardDescription>
                Search across all documents in the knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeSearch />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Document Filters</CardTitle>
              <CardDescription>
                Filter documents by type or visibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="all">All Documents</TabsTrigger>
                  <TabsTrigger value="public">Public</TabsTrigger>
                </TabsList>
                
                <div className="space-x-2 space-y-2 mt-4">
                  <Badge 
                    className={`cursor-pointer ${activeTab === 'private' ? 'bg-primary' : 'bg-secondary'}`}
                    onClick={() => setActiveTab('private')}
                  >
                    Private
                  </Badge>
                  
                  {documentTypes.map(type => (
                    <Badge 
                      key={type}
                      className={`cursor-pointer ${activeTab === type ? 'bg-primary' : 'bg-secondary'}`}
                      onClick={() => setActiveTab(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' ? 'All Documents' : 
                  activeTab === 'public' ? 'Public Documents' : 
                  activeTab === 'private' ? 'Private Documents' : 
                  `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Documents`}
              </CardTitle>
              <CardDescription>
                {filteredDocuments.length} documents found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-3">
                      <Skeleton className="h-8 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <DocumentList 
                  documents={filteredDocuments} 
                  onDelete={handleDocumentDelete}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <AddDocumentDialog 
        open={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)}
        onDocumentAdded={handleDocumentAdded}
      />
    </div>
  );
}
