'use client';

import React from 'react';
import { KnowledgeDocument } from '@/services/knowledge-service';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Share2, Edit } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface DocumentListProps {
  documents: KnowledgeDocument[];
  onDelete: (id: string) => void;
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  const router = useRouter();

  function formatDate(dateString?: string): string {
    if (!dateString) return 'Unknown date';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  }

  function truncateContent(content: string, maxLength = 150): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  }

  function handleView(id?: string) {
    if (id) {
      router.push(`/dashboard/knowledge/${id}`);
    }
  }

  function handleShare(id?: string) {
    if (id) {
      router.push(`/dashboard/knowledge/${id}/share`);
    }
  }

  function handleEdit(id?: string) {
    if (id) {
      router.push(`/dashboard/knowledge/${id}/edit`);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No documents found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl cursor-pointer hover:text-primary" onClick={() => handleView(doc.id)}>
                {doc.title}
              </CardTitle>
              <div className="flex space-x-2">
                <Badge variant={doc.is_public ? "secondary" : "outline"}>
                  {doc.is_public ? "Public" : "Private"}
                </Badge>
                <Badge variant="outline">{doc.document_type}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {doc.description && (
              <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
            )}
            <p className="text-sm line-clamp-3">{truncateContent(doc.content)}</p>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>Updated {formatDate(doc.updated_at)}</span>
              {doc.source && (
                <>
                  <span className="mx-1">•</span>
                  <span>Source: {doc.source}</span>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-2 flex justify-end space-x-2">
            <Button size="sm" variant="ghost" onClick={() => handleView(doc.id)}>
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleEdit(doc.id)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleShare(doc.id)}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => doc.id && onDelete(doc.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
