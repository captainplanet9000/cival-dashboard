"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useKnowledgeChat } from './knowledge-chat-connector'

// Mock data for knowledge documents
const mockDocuments = [
  {
    id: 'doc1',
    title: 'Mean Reversion ETF Strategy',
    type: 'strategy',
    timestamp: new Date('2025-03-10'),
    confidence: 0.85,
    summary: 'A strategy for trading ETFs based on mean reversion principles using RSI and Bollinger Bands.'
  },
  {
    id: 'doc2',
    title: 'Bitcoin Momentum Analysis',
    type: 'market',
    timestamp: new Date('2025-03-15'),
    confidence: 0.78,
    summary: 'Analysis of bitcoin momentum indicators showing potential for upward price movement.'
  },
  {
    id: 'doc3',
    title: 'Grid Trading Backtest Results',
    type: 'backtest',
    timestamp: new Date('2025-03-18'),
    confidence: 0.92,
    summary: 'Backtest results for grid trading strategy on EUR/USD pair showing 8.5% annual return.'
  },
  {
    id: 'doc4',
    title: 'Volatility Index Correlation Study',
    type: 'research',
    timestamp: new Date('2025-03-05'),
    confidence: 0.81,
    summary: 'Research paper examining the correlation between market volatility indices and cryptocurrency prices.'
  }
]

export function StrategyKnowledgeBase() {
  const { selectedDocument, setSelectedDocument } = useKnowledgeChat()
  const [documents] = useState(mockDocuments)
  
  const handleSelectDocument = (document: any) => {
    setSelectedDocument(document)
  }
  
  // Function to get badge color based on document type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'strategy': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
      case 'backtest': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      case 'market': return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
      case 'research': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Select a document to analyze with AI
      </div>
      
      <ScrollArea className="h-[400px] rounded-md border p-2">
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card 
              key={doc.id}
              className={`p-3 cursor-pointer transition-colors ${
                selectedDocument?.id === doc.id 
                  ? 'bg-muted/50 border-primary/50' 
                  : 'hover:bg-muted/30'
              }`}
              onClick={() => handleSelectDocument(doc)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={getTypeColor(doc.type)} variant="outline">
                    {doc.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {doc.timestamp.toLocaleDateString()}
                  </span>
                </div>
                
                <h4 className="text-sm font-medium">{doc.title}</h4>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {doc.summary}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {selectedDocument && (
        <div className="bg-muted/50 p-3 rounded-md text-xs">
          <p className="font-medium">Selected for AI analysis:</p>
          <p className="text-muted-foreground mt-1">{selectedDocument.title}</p>
        </div>
      )}
    </div>
  )
}
