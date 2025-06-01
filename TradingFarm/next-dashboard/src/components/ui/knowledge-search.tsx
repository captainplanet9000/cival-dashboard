"use client"

import * as React from "react"
import { Search, Book, FileText, Loader2, Brain, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/cn"

export interface KnowledgeSearchResult {
  id: string
  title: string
  content: string
  source: string
  tags?: string[]
  score?: number
}

interface KnowledgeSearchProps {
  className?: string
  onSearch: (query: string) => Promise<KnowledgeSearchResult[]>
  onResultSelect?: (result: KnowledgeSearchResult) => void
  placeholder?: string
  maxResults?: number
}

export function KnowledgeSearch({
  className,
  onSearch,
  onResultSelect,
  placeholder = "Search knowledge base...",
  maxResults = 5,
}: KnowledgeSearchProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<KnowledgeSearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isSearching) return

    setIsSearching(true)
    setIsOpen(true)
    
    try {
      const searchResults = await onSearch(query)
      setResults(searchResults.slice(0, maxResults))
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultSelect = (result: KnowledgeSearchResult) => {
    if (onResultSelect) {
      onResultSelect(result)
      setQuery("")
      setResults([])
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    setQuery("")
    setResults([])
    setIsOpen(false)
    searchInputRef.current?.focus()
  }

  // Close results if clicked outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        results.length > 0 && 
        !target.closest('[data-knowledge-search]') &&
        !target.closest('[data-knowledge-results]')
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [results.length])

  // Format excerpt to highlight matched query terms
  const formatExcerpt = (content: string, maxLength = 120) => {
    if (!content) return ""
    
    // Truncate the content if it's too long
    let excerpt = content.length > maxLength 
      ? content.substring(0, maxLength) + "..." 
      : content
      
    return excerpt
  }

  return (
    <div className={cn("relative", className)} data-knowledge-search>
      <form onSubmit={handleSearch} className="flex w-full gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder={placeholder}
            className="pl-9 pr-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button type="submit" disabled={isSearching || !query.trim()}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </form>

      {isOpen && (results.length > 0 || isSearching) && (
        <Card 
          className="absolute top-full mt-1 w-full z-10 shadow-md max-h-96 overflow-hidden"
          data-knowledge-results
        >
          <CardContent className="p-0">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
                <p>Searching knowledge base...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p>No results found for "{query}"</p>
                <p className="text-sm text-muted-foreground mt-1">Try different keywords or ask ElizaOS to add this knowledge</p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm font-medium">Knowledge Base Results</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {results.length} {results.length === 1 ? "result" : "results"}
                  </Badge>
                </div>
                <ul>
                  {results.map((result) => (
                    <li 
                      key={result.id}
                      className="border-b last:border-0 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleResultSelect(result)}
                    >
                      <div className="flex gap-2 items-start">
                        <Book className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-sm">{result.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {formatExcerpt(result.content)}
                          </p>
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {result.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {result.score !== undefined && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground">
                                Relevance: {Math.round(result.score * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
