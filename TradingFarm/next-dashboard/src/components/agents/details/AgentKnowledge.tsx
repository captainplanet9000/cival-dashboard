'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBrainDocuments, BrainDocument } from '@/hooks/use-brain-documents'; // Import hook and type
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, Link as LinkIcon, UploadCloud } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { formatDate } from '@/utils/date-utils';
import { Badge } from "@/components/ui/badge";

interface AgentKnowledgeProps {
  brainId: string | null | undefined;
}

// Helper to render document status badge
const DocumentStatusBadge = ({ status }: { status: string }) => {
  const lowerStatus = status?.toLowerCase() || 'unknown';
  let color = 'bg-gray-100 text-gray-700';
  switch (lowerStatus) {
    case 'processed':
    case 'completed': // Assuming completed is a valid status
      color = 'bg-green-100 text-green-700';
      break;
    case 'processing':
    case 'pending':
      color = 'bg-blue-100 text-blue-700';
      break;
    case 'error':
    case 'failed':
      color = 'bg-red-100 text-red-700';
      break;
  }
  return <Badge variant="outline" className={`${color} border-current`}>{status || 'Unknown'}</Badge>;
};

export const AgentKnowledge: React.FC<AgentKnowledgeProps> = ({ brainId }: AgentKnowledgeProps) => {
  const { 
    documents, 
    isLoading, 
    error 
  } = useBrainDocuments(brainId);

  const renderLoading = () => (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );

  const renderError = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Documents</AlertTitle>
      <AlertDescription>
        {error || "Could not load knowledge documents for this agent's brain."}
      </AlertDescription>
    </Alert>
  );

  const renderDocumentsTable = () => (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc: BrainDocument) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium max-w-xs truncate">
                {doc.title || 'Untitled Document'}
                {doc.description && <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>}
              </TableCell>
              <TableCell className="text-xs capitalize">{doc.content_type}</TableCell>
              <TableCell>
                <DocumentStatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-xs">
                {doc.created_at ? formatDate(doc.created_at) : '-'}
              </TableCell>
              <TableCell className="text-right space-x-2 whitespace-nowrap">
                {doc.source_url && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={doc.source_url} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="h-3.5 w-3.5 mr-1" /> Source
                    </Link>
                  </Button>
                )}
                {/* Add View/Manage button later? */} 
                <Button variant="outline" size="sm" disabled> 
                   <FileText className="h-3.5 w-3.5 mr-1" /> View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Knowledge Base Documents</CardTitle>
            <CardDescription>
              Documents used for this agent's knowledge and reasoning.
            </CardDescription>
          </div>
           <Button size="sm" disabled> {/* TODO: Implement Upload */} 
            <UploadCloud className="h-4 w-4 mr-2" /> Add Document
           </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!brainId && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No brain associated with this agent.
          </p>
        )}
        {brainId && isLoading && renderLoading()}
        {brainId && error && renderError()}
        {brainId && !isLoading && !error && documents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No documents found in this agent's knowledge base.
          </p>
        )}
        {brainId && !isLoading && !error && documents.length > 0 && renderDocumentsTable()}
      </CardContent>
    </Card>
  );
}; 