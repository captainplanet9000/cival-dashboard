"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Terminal, X, Maximize2, Minimize2, Copy, CheckCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/utils/cn"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

export type CommandMessageType = "command" | "query" | "analysis" | "alert" | "system"
export type CommandSourceType = "knowledge-base" | "market-data" | "strategy" | "system" | "user"

export interface CommandMessage {
  id: string
  content: string
  timestamp: Date | string
  type: CommandMessageType
  source?: CommandSourceType
  metadata?: Record<string, any>
}

interface CommandTerminalProps {
  className?: string
  title?: string
  messages: CommandMessage[]
  onSendCommand: (command: string) => void
  isLoading?: boolean
  showHeader?: boolean
  fullWidth?: boolean
  maxHeight?: string
}

export function CommandTerminal({
  className,
  title = "ElizaOS Command Console",
  messages,
  onSendCommand,
  isLoading = false,
  showHeader = true,
  fullWidth = false,
  maxHeight = "500px",
}: CommandTerminalProps) {
  const { theme } = useTheme()
  const [command, setCommand] = React.useState("")
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim() && !isLoading) {
      onSendCommand(command)
      setCommand("")
    }
  }

  const copyMessagesToClipboard = () => {
    const text = messages
      .map((msg) => {
        const time = typeof msg.timestamp === 'string' 
          ? msg.timestamp 
          : msg.timestamp.toLocaleTimeString()
        return `[${time}] ${msg.source ? `[${msg.source}] ` : ''}${msg.content}`
      })
      .join("\n")
    
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    })
  }

  const getMessageColorClass = (type: CommandMessageType) => {
    switch (type) {
      case "command":
        return "text-blue-500 dark:text-blue-400"
      case "query":
        return "text-green-500 dark:text-green-400"
      case "analysis":
        return "text-purple-500 dark:text-purple-400"
      case "alert":
        return "text-red-500 dark:text-red-400"
      case "system":
        return "text-gray-500 dark:text-gray-400"
      default:
        return "text-foreground"
    }
  }

  const getSourceBadgeClass = (source?: CommandSourceType) => {
    switch (source) {
      case "knowledge-base":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "market-data":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "strategy":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "system":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "user":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const handleFocus = () => {
    inputRef.current?.focus()
  }

  return (
    <Card 
      className={cn(
        "border shadow-md relative",
        isExpanded ? "fixed inset-4 z-50" : "",
        fullWidth ? "w-full" : "w-full max-w-3xl",
        className
      )}
      onClick={handleFocus}
    >
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {!isCopied ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={copyMessagesToClipboard} 
                title="Copy messages"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setIsExpanded(!isExpanded)} 
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <ScrollArea 
          className={cn(
            "p-4 font-mono text-sm", 
            isExpanded ? "h-[calc(100vh-180px)]" : `max-h-${maxHeight}`
          )}
        >
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Welcome to ElizaOS Command Console</p>
              <p className="text-xs mt-2">Type a command to begin.</p>
            </div>
          ) : (
            messages.map((message) => {
              const time = typeof message.timestamp === 'string'
                ? message.timestamp
                : message.timestamp instanceof Date 
                  ? message.timestamp.toLocaleTimeString()
                  : new Date().toLocaleTimeString()
                  
              return (
                <div key={message.id} className="mb-3">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>{time}</span>
                    {message.source && (
                      <span className={cn("ml-2 px-1.5 py-0.5 rounded-md text-xs", getSourceBadgeClass(message.source))}>
                        {message.source}
                      </span>
                    )}
                  </div>
                  <div className={cn("mt-1", getMessageColorClass(message.type))}>
                    {message.content}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-2 border-t">
        <form onSubmit={handleSendCommand} className="w-full flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={isLoading ? "Processing..." : "Type your command..."}
            disabled={isLoading}
            className="font-mono text-sm"
            autoComplete="off"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={isLoading || !command.trim()}
          >
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
