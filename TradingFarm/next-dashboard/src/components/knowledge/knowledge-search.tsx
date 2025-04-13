'use client';

import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchResult } from '@/services/knowledge-service';
import knowledgeService from '@/services/knowledge-service-factory';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

export default function KnowledgeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setSearching(true);
    setHasSearched(true);
    
    try {
      const result = await knowledgeService.searchKnowledge(query);
      
      if (result.success) {
        setResults(result.data);
        if (result.data.length === 0) {
          toast({
            title: 'No results found',
            description: 'Try a different search term or browse all documents',
          });
        }
      } else {
        toast({
          title: 'Search failed',
          description: result.error || 'An error occurred while searching',
          variant: 'destructive',
        });
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching knowledge:', error);
      toast({
        title: 'Search failed',
        description: 'An unexpected error occurred while searching',
        variant: 'destructive',
      });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }
  
  function handleResultClick(documentId: string) {
    router.push(`/dashboard/knowledge/${documentId}`);
  }
  
  function highlightMatches(text: string, searchTerm: string): React.ReactNode {
    if (!searchTerm.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() 
        ? <span key={index} className="bg-yellow-200 dark:bg-yellow-800">{part}</span> 
        : part
    );
  }
  
  return (
    <div>
      <form onSubmit={handleSearch} className="flex w-full items-center space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Search knowledge base..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>
      
      {hasSearched && (
        <div className="space-y-4 mt-4">
          {results.length === 0 && !searching ? (
            <p className="text-center text-muted-foreground py-8">
              No results found for &quot;{query}&quot;
            </p>
          ) : (
            results.map((result) => (
              <Card 
                key={result.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleResultClick(result.document_id)}
              >
                <CardContent className="p-4">
                  <h4 className="text-lg font-semibold">
                    {result.document?.title || 'Untitled Document'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {result.document?.document_type} • Similarity: {(result.similarity * 100).toFixed(0)}%
                  </p>
                  <p className="text-sm line-clamp-3">
                    {highlightMatches(result.content, query)}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
