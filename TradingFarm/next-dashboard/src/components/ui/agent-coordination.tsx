"use client"

import * as React from "react"
import { Users, Brain, MessageSquare, RefreshCw, Zap, AlertCircle, Check, Sparkles, Network } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { cn } from "@/utils/cn"

export type AgentRole = "primary" | "trader" | "analyst" | "risk" | "executor" | "observer"
export type CoordinationStatus = "active" | "planning" | "executing" | "reviewing" | "idle" | "error"
export type MessageType = "coordination" | "strategy" | "alert" | "decision" | "query" | "response"

export interface AgentMember {
  id: string
  name: string
  role: AgentRole
  isActive: boolean
  status: string
  metrics?: {
    name: string
    value: number | string
  }[]
}

export interface AgentMessage {
  id: string
  agentId: string
  agentName: string
  role: AgentRole
  content: string
  timestamp: string | Date
  type: MessageType
  metadata?: Record<string, any>
}

export interface AgentTeamAction {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "failed"
  progress?: number
  assignedAgents: string[]
  timestamp: string | Date
  deadline?: string | Date
  priority: "low" | "medium" | "high" | "critical"
}

interface AgentCoordinationProps {
  teamName: string
  teamId: string
  status: CoordinationStatus
  members: AgentMember[]
  messages: AgentMessage[]
  actions: AgentTeamAction[]
  onRefresh?: () => void
  onAddAgent?: () => void
  onRemoveAgent?: (agentId: string) => void
  onSendCoordination?: (message: string) => void
  onActionComplete?: (actionId: string) => void
  className?: string
  isLoading?: boolean
  lastSync?: string | Date
}

export function AgentCoordination({
  teamName,
  teamId,
  status,
  members,
  messages,
  actions,
  onRefresh,
  onAddAgent,
  onRemoveAgent,
  onSendCoordination,
  onActionComplete,
  className,
  isLoading = false,
  lastSync,
}: AgentCoordinationProps) {
  const { theme } = useTheme()
  const [newMessage, setNewMessage] = React.useState("")
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  
  const formatDate = (date?: string | Date) => {
    if (!date) return ""
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleString()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && onSendCoordination) {
      onSendCoordination(newMessage)
      setNewMessage("")
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Active
          </Badge>
        )
      case "planning":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1">
            <Brain className="h-3 w-3" />
            Planning
          </Badge>
        )
      case "executing":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Executing
          </Badge>
        )
      case "reviewing":
        return (
          <Badge className="bg-purple-500 hover:bg-purple-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Reviewing
          </Badge>
        )
      case "idle":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Idle
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        )
    }
  }

  const getRoleBadge = (role: AgentRole) => {
    switch (role) {
      case "primary":
        return <Badge className="bg-blue-500">Primary</Badge>
      case "trader":
        return <Badge className="bg-green-500">Trader</Badge>
      case "analyst":
        return <Badge className="bg-purple-500">Analyst</Badge>
      case "risk":
        return <Badge className="bg-red-500">Risk</Badge>
      case "executor":
        return <Badge className="bg-yellow-500">Executor</Badge>
      case "observer":
        return <Badge variant="secondary">Observer</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getMessageTypeStyle = (type: MessageType) => {
    switch (type) {
      case "coordination":
        return "border-l-4 border-l-blue-500"
      case "strategy":
        return "border-l-4 border-l-green-500"
      case "alert":
        return "border-l-4 border-l-red-500"
      case "decision":
        return "border-l-4 border-l-purple-500"
      case "query":
        return "border-l-4 border-l-yellow-500"
      case "response":
        return "border-l-4 border-l-slate-500"
      default:
        return ""
    }
  }

  const getPriorityBadge = (priority: "low" | "medium" | "high" | "critical") => {
    switch (priority) {
      case "low":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300">Low</Badge>
      case "medium":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300">Medium</Badge>
      case "high":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-300">High</Badge>
      case "critical":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300">Critical</Badge>
    }
  }

  const getActionStatusBadge = (status: "pending" | "in_progress" | "completed" | "failed") => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              <span>{teamName}</span>
            </CardTitle>
            <CardDescription>Agent Team ID: {teamId}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                Last synced: {formatDate(lastSync)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Agent Members Sidebar */}
          <div className="w-full md:w-64 border-r">
            <div className="p-3 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Team Members</h3>
                {onAddAgent && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0" 
                    onClick={onAddAgent}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <ScrollArea className="h-[220px]">
              <div className="divide-y">
                {members.map((member) => (
                  <div key={member.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            member.isActive ? "bg-green-500" : "bg-gray-300"
                          )} />
                          <h4 className="font-medium text-sm">{member.name}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {getRoleBadge(member.role)}
                          <span className="text-xs text-muted-foreground">{member.status}</span>
                        </div>
                      </div>
                      
                      {onRemoveAgent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onRemoveAgent(member.id)}
                        >
                          <AlertCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {member.metrics && member.metrics.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {member.metrics.map((metric, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">{metric.name}</span>
                              <span>{metric.value}</span>
                            </div>
                            {typeof metric.value === 'number' && (
                              <Progress value={metric.value as number} className="h-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Actions Section */}
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium mb-2">Active Coordination</h3>
              <ScrollArea className="h-[120px]">
                {actions.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No active coordination tasks
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actions.map((action) => (
                      <div 
                        key={action.id} 
                        className={cn(
                          "p-2 rounded-md border",
                          action.status === "in_progress" && "bg-blue-50/50 dark:bg-blue-950/50", 
                          action.status === "completed" && "bg-green-50/50 dark:bg-green-950/50"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium">{action.title}</h4>
                              {getActionStatusBadge(action.status)}
                              {getPriorityBadge(action.priority)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                          </div>
                          
                          {onActionComplete && action.status !== "completed" && action.status !== "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => onActionComplete(action.id)}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                        
                        {action.progress !== undefined && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span>{action.progress}%</span>
                            </div>
                            <Progress value={action.progress} className="h-1" />
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{action.assignedAgents.length} agents</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span>Created: {formatDate(action.timestamp)}</span>
                            {action.deadline && (
                              <span className={cn(
                                new Date(action.deadline) < new Date() ? "text-red-500" : ""
                              )}>
                                Due: {formatDate(action.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Coordination Messages */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No coordination messages yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Agent coordination will appear here</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={cn(
                          "p-3 rounded-md border",
                          getMessageTypeStyle(message.type)
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{message.agentName}</span>
                              {getRoleBadge(message.role)}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(message.timestamp)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Message Input */}
              {onSendCoordination && (
                <div className="p-3 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Send coordination message..."
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <Button type="submit" disabled={!newMessage.trim() || isLoading}>
                      Send
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between py-2 px-3 border-t">
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
          Sync
        </Button>
        <span className="text-xs text-muted-foreground">
          Powered by ElizaOS Multi-Agent Coordination
        </span>
      </CardFooter>
    </Card>
  )
}
