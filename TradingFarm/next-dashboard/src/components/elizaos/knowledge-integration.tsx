"use client"

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Search, 
  Brain, 
  Database, 
  ArrowRight, 
  RefreshCw, 
  Plus 
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

// Knowledge document interface
interface KnowledgeDocument {
  id: string
  title: string
  type: string
  summary: string
  lastUpdated: Date
  relevanceScore?: number
  source?: string
  tags?: string[]
}

// Mock knowledge documents for demonstration
const mockKnowledgeDocuments: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: 'Bitcoin Market Analysis - March 2025',
    type: 'market-research',
    summary: 'Comprehensive analysis of Bitcoin price action, on-chain metrics, and market sentiment for Q1 2025.',
    lastUpdated: new Date('2025-03-15'),
    relevanceScore: 0.95,
    source: 'Trading Research Team',
    tags: ['bitcoin', 'market-analysis', 'technical-analysis', 'on-chain']
  },
  {
    id: 'doc-2',
    title: 'Algorithmic Trading Strategy Guide',
    type: 'strategy',
    summary: 'Complete guide to implementing momentum-based algorithmic trading strategies with backtesting results.',
    lastUpdated: new Date('2025-02-28'),
    relevanceScore: 0.87,
    source: 'Strategy Development',
    tags: ['algorithmic-trading', 'momentum', 'strategy', 'backtesting']
  },
  {
    id: 'doc-3',
    title: 'DeFi Liquidity Pool Risk Assessment',
    type: 'risk-analysis',
    summary: 'Analysis of impermanent loss risks and yield optimization in major DeFi protocols.',
    lastUpdated: new Date('2025-03-10'),
    relevanceScore: 0.82,
    source: 'Risk Management',
    tags: ['defi', 'liquidity-pools', 'risk-assessment', 'yield']
  },
  {
    id: 'doc-4',
    title: 'Agent Performance Metrics - Q1 2025',
    type: 'performance',
    summary: 'Detailed performance analysis of all trading agents for the first quarter of 2025.',
    lastUpdated: new Date('2025-03-21'),
    relevanceScore: 0.91,
    source: 'Analytics Team',
    tags: ['agents', 'performance', 'metrics', 'quarterly-report']
  },
  {
    id: 'doc-5',
    title: 'Exchange API Integration Guide',
    type: 'technical',
    summary: 'Technical documentation for integrating with major cryptocurrency exchange APIs.',
    lastUpdated: new Date('2025-01-15'),
    relevanceScore: 0.78,
    source: 'Development Team',
    tags: ['api', 'exchange', 'integration', 'development']
  }
]

// Knowledge categories
const knowledgeCategories = [
  { id: 'all', name: 'All Documents', icon: <FileText className="h-4 w-4" /> },
  { id: 'market-research', name: 'Market Research', icon: <Search className="h-4 w-4" /> },
  { id: 'strategy', name: 'Trading Strategies', icon: <Brain className="h-4 w-4" /> },
  { id: 'risk-analysis', name: 'Risk Analysis', icon: <Database className="h-4 w-4" /> },
  { id: 'performance', name: 'Performance Reports', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'technical', name: 'Technical Documentation', icon: <ArrowRight className="h-4 w-4" /> }
]

export function KnowledgeIntegration() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(mockKnowledgeDocuments)
  const [isLoading, setIsLoading] = useState(false)
  
  // Filter documents based on search term and category
  useEffect(() => {
    setIsLoading(true)
    
    // Simulate network request
    setTimeout(() => {
      let filteredDocs = [...mockKnowledgeDocuments]
      
      // Filter by category
      if (selectedCategory !== 'all') {
        filteredDocs = filteredDocs.filter(doc => doc.type === selectedCategory)
      }
      
      // Filter by search term
      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase()
        filteredDocs = filteredDocs.filter(doc => 
          doc.title.toLowerCase().includes(lowerSearchTerm) || 
          doc.summary.toLowerCase().includes(lowerSearchTerm) ||
          doc.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
        )
      }
      
      // Sort by relevance score
      filteredDocs.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      
      setDocuments(filteredDocs)
      setIsLoading(false)
    }, 500)
  }, [searchTerm, selectedCategory])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // The search is already handled by the useEffect
  }
  
  return (
    <Card className="border-t-0 rounded-t-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Knowledge Database
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="px-6 mb-4">
          <form onSubmit={handleSearch} className="flex w-full gap-2">
            <Input
              type="search"
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit" variant="secondary" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
        
        <Tabs defaultValue="documents" className="w-full">
          <div className="px-6 mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="documents" className="mt-0">
            <ScrollArea className="h-[300px] px-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium">{doc.title}</h3>
                        <Badge variant="outline">{doc.type.replace('-', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{doc.summary}</p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Updated: {doc.lastUpdated.toLocaleDateString()}</span>
                        <span>Source: {doc.source}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No documents found matching your criteria</p>
                  <Button variant="link" onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                  }}>Clear filters</Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="categories" className="mt-0">
            <div className="grid grid-cols-2 gap-3 px-6">
              {knowledgeCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  className="justify-start h-auto py-3"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="flex items-center">
                    <div className={`mr-2 ${selectedCategory === category.id ? 'text-primary-foreground' : 'text-primary'}`}>
                      {category.icon}
                    </div>
                    <span>{category.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="justify-between border-t pt-3">
        <Button variant="ghost" size="sm" className="text-xs gap-1">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <Plus className="h-3 w-3" />
          Add Document
        </Button>
      </CardFooter>
    </Card>
  )
}
