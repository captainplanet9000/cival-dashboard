"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSocket } from '@/providers/socket-provider'
import { TRADING_EVENTS } from '@/constants/socket-events'

interface KnowledgeResponse {
  id: string
  content: string
  source: 'knowledge-base' | 'market-data' | 'strategy' | 'system'
  timestamp: string
  metadata?: Record<string, any>
}

interface KnowledgeState {
  isLoading: boolean
  messages: Array<{
    id: string
    content: string
    type: 'user' | 'system' | 'knowledge'
    source?: 'knowledge-base' | 'market-data' | 'strategy' | 'system'
    timestamp: string
    metadata?: Record<string, any>
  }>
  sendMessage: (message: string) => void
  clearMessages: () => void
}

const KnowledgeChatContext = createContext<KnowledgeState | undefined>(undefined)

export function KnowledgeChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<KnowledgeState['messages']>([])
  const [isLoading, setIsLoading] = useState(false)
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    // Listen for knowledge responses from the system
    const handleKnowledgeResponse = (data: KnowledgeResponse) => {
      setIsLoading(false)
      setMessages(prev => [
        ...prev,
        {
          id: data.id || `system-${Date.now()}`,
          content: data.content,
          type: 'knowledge',
          source: data.source,
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: data.metadata
        }
      ])
    }

    // Setup event listeners
    socket.on(TRADING_EVENTS.KNOWLEDGE_RESPONSE, handleKnowledgeResponse)

    // Clean up on unmount
    return () => {
      socket.off(TRADING_EVENTS.KNOWLEDGE_RESPONSE, handleKnowledgeResponse)
    }
  }, [socket])

  const sendMessage = (content: string) => {
    if (!content.trim() || !socket) return

    // Add user message to chat
    const messageId = `user-${Date.now()}`
    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        content,
        type: 'user',
        timestamp: new Date().toISOString()
      }
    ])

    // Set loading state
    setIsLoading(true)

    // Send the query to the system
    socket.emit(TRADING_EVENTS.KNOWLEDGE_QUERY, {
      id: messageId,
      content,
      timestamp: new Date().toISOString()
    })
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <KnowledgeChatContext.Provider
      value={{ messages, isLoading, sendMessage, clearMessages }}
    >
      {children}
    </KnowledgeChatContext.Provider>
  )
}

export const useKnowledgeChat = () => {
  const context = useContext(KnowledgeChatContext)
  if (context === undefined) {
    throw new Error('useKnowledgeChat must be used within a KnowledgeChatProvider')
  }
  return context
}
