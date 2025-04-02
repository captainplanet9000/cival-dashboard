'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Search, FileText, BookOpen, Calendar, Tag, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from "@/components/ui/use-toast";

interface KnowledgeDocument {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    async function fetchDocuments() {
      setIsLoading(true);
      setConnectionError(null);
      
      try {
        // Attempt to fetch knowledge documents from Supabase
        const { data, error } = await supabase
          .from('knowledge_documents')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          // Check if this is a timeout error
          if (error.message?.includes('timeout') || error.message?.includes('deadline exceeded')) {
            throw new Error('Connection to Supabase timed out. Using demo data instead.');
          } else {
            throw error;
          }
        }

        if (data && data.length > 0) {
          setDocuments(data);
          setConnectionError(null);
        } else {
          // No documents found, set demo data
          setDemoData();
          setConnectionError("No knowledge documents found. Showing demo data instead.");
        }
      } catch (error: any) {
        console.error('Failed to fetch knowledge documents:', error);
        
        const errorMessage = error.message || 'Unknown error occurred';
        setConnectionError(errorMessage);
        
        // Set demo data
        setDemoData();
        
        // Attempt retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, RETRY_DELAY);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, [supabase, retryCount]);

  const setDemoData = () => {
    // Sample knowledge documents for demo
    setDocuments([
      {
        id: 1,
        title: "Understanding Moving Averages",
        content: "Moving averages are a key technical indicator used to identify trends...",
        category: "technical",
        tags: ["indicators", "trending", "basics"],
        created_at: "2025-03-15T10:30:00Z",
        updated_at: "2025-03-15T10:30:00Z"
      },
      {
        id: 2,
        title: "RSI Trading Strategies",
        content: "The Relative Strength Index (RSI) is a momentum oscillator that measures...",
        category: "technical",
        tags: ["indicators", "momentum", "overbought", "oversold"],
        created_at: "2025-03-10T14:20:00Z",
        updated_at: "2025-03-12T09:45:00Z"
      },
      {
        id: 3,
        title: "Market Cycles Analysis",
        content: "Understanding market cycles is essential for long-term investing success...",
        category: "fundamental",
        tags: ["cycles", "macro", "analysis"],
        created_at: "2025-03-05T08:15:00Z",
        updated_at: "2025-03-05T08:15:00Z"
      },
      {
        id: 4,
        title: "Algorithmic Trading Basics",
        content: "Algorithmic trading uses computer programs to follow a defined set of instructions...",
        category: "algorithmic",
        tags: ["automation", "algorithms", "basics"],
        created_at: "2025-02-28T16:40:00Z",
        updated_at: "2025-03-01T11:20:00Z"
      },
      {
        id: 5,
        title: "Risk Management Principles",
        content: "Effective risk management is the cornerstone of successful trading...",
        category: "psychology",
        tags: ["risk", "management", "psychology"],
        created_at: "2025-02-20T13:10:00Z",
        updated_at: "2025-02-20T13:10:00Z"
      }
    ]);
  };

  const handleRetryConnection = () => {
    setRetryCount(0);
  };

  // Filter documents based on search query and active filter
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === 'all' || doc.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Access and manage your trading knowledge and market intelligence
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

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            New Document
          </Button>
          <Button variant="outline">
            <Tag className="mr-2 h-4 w-4" />
            Manage Tags
          </Button>
        </div>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        <Button 
          variant={activeFilter === 'all' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setActiveFilter('all')}>
          All Categories
        </Button>
        <Button 
          variant={activeFilter === 'technical' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setActiveFilter('technical')}>
          Technical Analysis
        </Button>
        <Button 
          variant={activeFilter === 'fundamental' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setActiveFilter('fundamental')}>
          Fundamental Analysis
        </Button>
        <Button 
          variant={activeFilter === 'algorithmic' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setActiveFilter('algorithmic')}>
          Algorithmic Trading
        </Button>
        <Button 
          variant={activeFilter === 'psychology' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setActiveFilter('psychology')}>
          Trading Psychology
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trading Knowledge Documents</CardTitle>
          <CardDescription>Browse and search your knowledge library</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded w-full"></div>
                ))}
              </div>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                        {doc.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="mr-1">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(doc.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No knowledge documents found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
