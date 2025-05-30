'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import knowledgeService from '@/services/knowledge-service-factory';
import { KnowledgeDocument } from '@/services/knowledge-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Edit, Share2, Trash2, ArrowLeft, BookOpen } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [document, setDocument] = useState<KnowledgeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const id = params.id as string;
  
  useEffect(() => {
    fetchDocument();
  }, [id]);
  
  async function fetchDocument() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await knowledgeService.getDocument(id);
      
      if (result.success) {
        setDocument(result.data);
      } else {
        setError(result.error || 'Failed to load document');
        toast({
          title: 'Error',
          description: result.error || 'Failed to load document',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching document:', error);
      setError(error.message || 'An unexpected error occurred');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading the document',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  function formatDate(dateString?: string): string {
    if (!dateString) return 'Unknown date';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  }
  
  async function handleDelete() {
    try {
      const result = await knowledgeService.deleteDocument(id);
      
      if (result.success) {
        toast({
          title: 'Document deleted',
          description: 'The document was successfully deleted',
        });
        router.push('/dashboard/knowledge');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete document',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the document',
        variant: 'destructive',
      });
    }
  }
  
  function handleEdit() {
    router.push(`/dashboard/knowledge/${id}/edit`);
  }
  
  function handleShare() {
    router.push(`/dashboard/knowledge/${id}/share`);
  }
  
  function handleBack() {
    router.push('/dashboard/knowledge');
  }
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
        </Button>
        
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
        </Button>
        
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error Loading Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchDocument}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Document Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested document could not be found.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack}>Back to Documents</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documents
      </Button>
      
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{document.title}</h1>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant={document.is_public ? "secondary" : "outline"}>
              {document.is_public ? "Public" : "Private"}
            </Badge>
            <Badge variant="outline">{document.document_type}</Badge>
            {document.source && (
              <Badge variant="outline">{document.source}</Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{document.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {document.description && (
        <div className="mb-6">
          <p className="text-lg text-muted-foreground">{document.description}</p>
        </div>
      )}
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">
              {document.content}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Created: {formatDate(document.created_at)}</span>
          <span>Last updated: {formatDate(document.updated_at)}</span>
          {document.farm_id && <span>Farm ID: {document.farm_id}</span>}
          {document.created_by && <span>Author ID: {document.created_by}</span>}
        </div>
      </div>
    </div>
  );
}
