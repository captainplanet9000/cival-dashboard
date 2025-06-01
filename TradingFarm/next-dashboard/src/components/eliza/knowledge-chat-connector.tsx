"use client"

import { createContext, useContext, useState, ReactNode, RefObject, MutableRefObject } from 'react'

// Define the document interface
export interface KnowledgeDocument {
  id: string
  title: string
  type: string
  timestamp: Date
  confidence: number
  summary: string
  [key: string]: any
}

// Create context with default values
interface KnowledgeChatContextType {
  selectedDocument: KnowledgeDocument | null
  setSelectedDocument: (document: KnowledgeDocument | null) => void
  registerChatInput: (inputRef: RefObject<HTMLTextAreaElement>) => void
  chatInputRef: MutableRefObject<HTMLTextAreaElement | null> | null
}

const defaultContext: KnowledgeChatContextType = {
  selectedDocument: null,
  setSelectedDocument: () => {},
  registerChatInput: () => {},
  chatInputRef: null
}

// Create the context
const KnowledgeChatContext = createContext<KnowledgeChatContextType>(defaultContext)

// Provider component
export function KnowledgeChatProvider({ children }: { children: ReactNode }) {
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null)
  const [chatInputRef, setChatInputRef] = useState<MutableRefObject<HTMLTextAreaElement | null> | null>(null)

  // Function to register chat input references
  const registerChatInput = (inputRef: RefObject<HTMLTextAreaElement>) => {
    setChatInputRef(inputRef as MutableRefObject<HTMLTextAreaElement | null>)
  }

  return (
    <KnowledgeChatContext.Provider value={{ 
      selectedDocument, 
      setSelectedDocument,
      registerChatInput,
      chatInputRef
    }}>
      {children}
    </KnowledgeChatContext.Provider>
  )
}

// Hook for using the context
export function useKnowledgeChat() {
  return useContext(KnowledgeChatContext)
}
