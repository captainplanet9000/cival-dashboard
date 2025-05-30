import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrainDocument } from '@/services/brain/brain-service';
import { CalendarIcon, FileTextIcon, TagIcon, TrashIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface KnowledgeCardProps {
  document: BrainDocument;
  onDelete?: (id: number) => void;
  onView?: (document: BrainDocument) => void;
}

export function KnowledgeCard({ document, onDelete, onView }: KnowledgeCardProps) {
  const documentTypeIcon = {
    'pdf': <Badge variant="outline" className="bg-red-50">PDF</Badge>,
    'tradingview': <Badge variant="outline" className="bg-blue-50">TradingView</Badge>,
    'text': <Badge variant="outline" className="bg-gray-50">Text</Badge>,
    'strategy': <Badge variant="outline" className="bg-green-50">Strategy</Badge>,
  };

  const truncateContent = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">{document.title}</CardTitle>
          {documentTypeIcon[document.document_type as keyof typeof documentTypeIcon] || 
            <Badge variant="outline">{document.document_type}</Badge>}
        </div>
        <CardDescription className="flex items-center text-xs text-muted-foreground">
          <CalendarIcon className="h-3 w-3 mr-1" />
          {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-sm text-gray-600 mb-3">
          {truncateContent(document.content)}
        </p>
        
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <TagIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            {document.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => onView && onView(document)}>
          <FileTextIcon className="h-4 w-4 mr-1" />
          View
        </Button>
        
        {onDelete && (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-destructive hover:text-destructive/90" 
            onClick={() => onDelete(document.id)}
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 