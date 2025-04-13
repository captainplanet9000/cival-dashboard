'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, PlusCircle, BarChart2 } from 'lucide-react';
import { KnowledgeDocument, SearchResult } from '@/services/knowledge-service';
import knowledgeService from '@/services/knowledge-service-factory';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface AgentKnowledgeSectionProps {
  agentId: string;
  farmId: number;
}

export default function AgentKnowledgeSection({ agentId, farmId }: AgentKnowledgeSectionProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('access');
  const { toast } = useToast();

  useEffect(() => {
    fetchAccessibleDocuments();
  }, [agentId, farmId]);

  async function fetchAccessibleDocuments() {
    setLoading(true);
    try {
      const result = await knowledgeService.listDocuments();
      if (result.success) {
        // In a real implementation, we would filter documents accessible to this agent
        // For the mock service, filter to show both public docs and those related to this farm
        const filtered = result.data.filter(doc => 
          doc.is_public || doc.farm_id === farmId
        );
        setDocuments(filtered);
      } else {
        toast({
          title: 'Error loading knowledge documents',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      const result = await knowledgeService.searchKnowledge(query);
      if (result.success) {
        // In a real implementation, we'd use a dedicated agent_search endpoint
        // Filter results to only show what's accessible to this agent
        const filtered = result.data.filter(result => {
          const doc = result.document;
          if (!doc) return false;
          // Show only public docs or those from the agent's farm
          return document.is_public || doc.source === 'trading strategy';
        });
        
        setSearchResults(filtered);
        setActiveTab('search');
      } else {
        toast({
          title: 'Search failed',
          description: result.error || 'An error occurred while searching',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching knowledge:', error);
      toast({
        title: 'Search failed',
        description: 'An unexpected error occurred while searching',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Knowledge Base</span>
          <Link href="/dashboard/knowledge">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" /> Open Knowledge Hub
            </Button>
          </Link>
        </CardTitle>
        <CardDescription>
          Access and search trading knowledge for this agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex w-full items-center space-x-2 mb-4">
          <Input
            type="text"
            placeholder="Search knowledge base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isSearching}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Tabs defaultValue="access" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="access">Accessible</TabsTrigger>
            <TabsTrigger value="search">Search Results</TabsTrigger>
            <TabsTrigger value="recent">Recently Used</TabsTrigger>
          </TabsList>
          <TabsContent value="access" className="space-y-4 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : documents.length > 0 ? (
              documents.map(doc => (
                <Card key={doc.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {doc.description || doc.content.substring(0, 60) + '...'}
                    </div>
                    <div className="flex mt-1">
                      <Badge variant="outline" className="text-xs">
                        {doc.document_type}
                      </Badge>
                      {doc.is_public && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No knowledge documents available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="search" className="space-y-4 max-h-[400px] overflow-y-auto">
            {isSearching ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(result => (
                <Card key={result.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div>
                    <div className="font-medium">
                      {result.document?.title || 'Untitled Document'}
                    </div>
                    <div className="text-sm line-clamp-2">
                      {result.content}
                    </div>
                    <div className="flex justify-between mt-1">
                      <Badge variant="outline" className="text-xs">
                        {result.document?.document_type || 'Document'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Relevance: {Math.round(result.similarity * 100)}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            ) : query ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Enter a search term to find knowledge
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent" className="space-y-4 p-1">
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-2">
                <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
              </div>
              <p>Knowledge usage analytics will appear here</p>
              <p className="text-sm">
                Showing which documents are most referenced by this agent
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4">
          <Link href="/dashboard/knowledge?agentId=1">
            <Button variant="outline" size="sm" className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Knowledge to Agent
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
