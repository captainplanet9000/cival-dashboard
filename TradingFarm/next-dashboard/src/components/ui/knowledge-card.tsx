"use client"

import * as React from "react"
import { Book, FileText, Globe, History, Search, Tag, ChevronDown, ChevronUp, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"
import { ScrollArea } from "@/components/ui/scroll-area"

export type KnowledgeSourceType = "document" | "api" | "web" | "database" | "historical" | "user"

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  source: KnowledgeSourceType
  tags?: string[]
  createdAt?: string | Date
  updatedAt?: string | Date
  confidence?: number
  metadata?: Record<string, any>
}

export interface KnowledgeCardProps {
  entry: KnowledgeEntry
  className?: string
  onView?: (entry: KnowledgeEntry) => void
  onEdit?: (entry: KnowledgeEntry) => void
  onDelete?: (entry: KnowledgeEntry) => void
  maxContentHeight?: string
  isExpanded?: boolean
  setIsExpanded?: (isExpanded: boolean) => void
}

export function KnowledgeCard({
  entry,
  className,
  onView,
  onEdit,
  onDelete,
  maxContentHeight = "120px",
  isExpanded: controlledIsExpanded,
  setIsExpanded: setControlledIsExpanded,
}: KnowledgeCardProps) {
  const [localIsExpanded, setLocalIsExpanded] = React.useState(false)
  
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : localIsExpanded
  const setIsExpanded = setControlledIsExpanded || setLocalIsExpanded

  const formatDate = (date?: string | Date) => {
    if (!date) return ""
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString()
  }

  const getSourceIcon = () => {
    switch (entry.source) {
      case "document": return <FileText className="h-4 w-4" />
      case "api": return <Globe className="h-4 w-4" />
      case "web": return <Globe className="h-4 w-4" />
      case "database": return <Database className="h-4 w-4" />
      case "historical": return <History className="h-4 w-4" />
      case "user": return <FileText className="h-4 w-4" />
      default: return <Book className="h-4 w-4" />
    }
  }

  const getSourceLabel = () => {
    switch (entry.source) {
      case "document": return "Document"
      case "api": return "API"
      case "web": return "Web"
      case "database": return "Database"
      case "historical": return "Historical"
      case "user": return "User Input"
      default: return "Unknown"
    }
  }

  const getSourceColorClass = () => {
    switch (entry.source) {
      case "document": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "api": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "web": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "database": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "historical": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "user": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getConfidenceColorClass = () => {
    if (entry.confidence === undefined) return ""
    if (entry.confidence >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    if (entry.confidence >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{entry.title}</CardTitle>
            {entry.updatedAt && (
              <CardDescription className="text-xs">
                Updated: {formatDate(entry.updatedAt)}
              </CardDescription>
            )}
          </div>
          <Badge 
            variant="secondary"
            className={cn("flex items-center gap-1", getSourceColorClass())}
          >
            {getSourceIcon()}
            {getSourceLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-3">
          <div className={cn(
            "relative",
            !isExpanded && "max-h-[120px] overflow-hidden"
          )}>
            {!isExpanded && (
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
            )}
            <ScrollArea className={cn(
              isExpanded ? "max-h-[500px]" : `max-h-[${maxContentHeight}]`,
            )}>
              <p className="text-sm whitespace-pre-line">{entry.content}</p>
            </ScrollArea>
          </div>
          
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {entry.confidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <Badge 
                variant="outline" 
                className={cn("text-xs", getConfidenceColorClass())}
              >
                {entry.confidence}%
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" /> 
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" /> 
              Show More
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          {onView && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onView(entry)}
              className="text-xs"
            >
              <Search className="h-3.5 w-3.5 mr-1" /> 
              View
            </Button>
          )}
          
          {onEdit && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(entry)}
              className="text-xs"
            >
              Edit
            </Button>
          )}
          
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(entry)}
              className="text-xs text-destructive"
            >
              Delete
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
