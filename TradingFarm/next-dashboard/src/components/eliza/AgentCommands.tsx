/**
 * AgentCommands.tsx
 * 
 * This component displays agent commands and responses,
 * allowing users to interact with ElizaOS agents.
 */
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, RefreshCw, Eye, CheckCircle, XCircle } from 'lucide-react'

// Assuming we have an agent-helpers.ts file with utility functions
// Alternative is to directly use the database.types.ts file you generated
type AgentCommand = {
  id: string
  agent_id: number
  order_id: number | null
  command_type: string
  command_content: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  response_id: string | null
  context: Record<string, any>
  created_at: string
  updated_at: string
}

type AgentResponse = {
  id: string
  agent_id: number
  command_id: string
  response_type: string
  response_content: string
  status: 'pending' | 'completed' | 'failed'
  context: Record<string, any>
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

type Order = {
  id: number
  symbol: string
  order_type: string
  side: string
  quantity: number
  price: number | null
  status: string
  exchange: string
  exchange_order_id: string | null
  created_at: string
  executed_at: string | null
}

type Agent = {
  id: number
  name: string
  is_active: boolean
}

// Status badge component for commands and responses
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>
    case 'processing':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Processing</Badge>
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>
    case 'failed':
      return <Badge variant="outline" className="bg-red-50 text-red-700">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function AgentCommands() {
  const supabase = createBrowserClient()
  const { toast } = useToast()
  
  const [commands, setCommands] = useState<AgentCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCommand, setSelectedCommand] = useState<AgentCommand | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<AgentResponse | null>(null)
  const [relatedOrder, setRelatedOrder] = useState<Order | null>(null)
  const [relatedAgent, setRelatedAgent] = useState<Agent | null>(null)
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  
  // Fetch agent commands
  const fetchCommands = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('agent_commands')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
        
      if (error) {
        throw error
      }
      
      setCommands(data || [])
    } catch (error) {
      console.error('Error fetching commands:', error)
      toast({
        title: 'Error',
        description: 'Failed to load agent commands',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch response for a command
  const fetchResponse = async (commandId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_responses')
        .select('*')
        .eq('command_id', commandId)
        .maybeSingle()
        
      if (error) {
        throw error
      }
      
      setSelectedResponse(data)
      return data
    } catch (error) {
      console.error('Error fetching response:', error)
      toast({
        title: 'Error',
        description: 'Failed to load response',
        variant: 'destructive',
      })
      return null
    }
  }
  
  // Fetch order details
  const fetchOrder = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
        
      if (error) {
        throw error
      }
      
      setRelatedOrder(data)
      return data
    } catch (error) {
      console.error('Error fetching order:', error)
      setRelatedOrder(null)
      return null
    }
  }
  
  // Fetch agent details
  const fetchAgent = async (agentId: number) => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, is_active')
        .eq('id', agentId)
        .single()
        
      if (error) {
        throw error
      }
      
      setRelatedAgent(data)
      return data
    } catch (error) {
      console.error('Error fetching agent:', error)
      setRelatedAgent(null)
      return null
    }
  }
  
  // Handle command selection
  const handleCommandSelect = async (command: AgentCommand) => {
    setSelectedCommand(command)
    
    // Fetch related data
    if (command.order_id) {
      await fetchOrder(command.order_id)
    }
    
    await fetchAgent(command.agent_id)
    
    // Fetch response if available
    const response = await fetchResponse(command.id)
    
    // Open dialog
    setResponseDialogOpen(true)
  }
  
  // Simulate a response (for manual testing)
  const simulateResponse = async () => {
    if (!selectedCommand) return
    
    try {
      // Create a response
      const { data: response, error: responseError } = await supabase
        .from('agent_responses')
        .insert({
          agent_id: selectedCommand.agent_id,
          command_id: selectedCommand.id,
          response_type: 'order_execution',
          response_content: 'Order executed successfully on the exchange',
          status: 'completed',
          context: {
            order_id: selectedCommand.order_id,
            execution_status: 'FILLED',
            execution_price: selectedCommand.context.price || 65000,
            execution_timestamp: new Date().toISOString()
          },
          metadata: {
            simulated: true,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single()
        
      if (responseError) {
        throw responseError
      }
      
      // Update command status
      const { error: updateError } = await supabase
        .from('agent_commands')
        .update({
          status: 'completed',
          response_id: response.id
        })
        .eq('id', selectedCommand.id)
        
      if (updateError) {
        throw updateError
      }
      
      // If there's an order, update its status
      if (selectedCommand.order_id) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'filled',
            executed_at: new Date().toISOString(),
            exchange_order_id: `SIM${Math.floor(Math.random() * 1000000)}`
          })
          .eq('id', selectedCommand.order_id)
          
        if (orderError) {
          throw orderError
        }
      }
      
      // Refresh data
      fetchCommands()
      await fetchResponse(selectedCommand.id)
      
      toast({
        title: 'Success',
        description: 'Response simulated successfully',
      })
    } catch (error) {
      console.error('Error simulating response:', error)
      toast({
        title: 'Error',
        description: 'Failed to simulate response',
        variant: 'destructive',
      })
    }
  }
  
  // Load commands on component mount
  useEffect(() => {
    fetchCommands()
  }, [])
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Agent Commands</h2>
        <Button onClick={fetchCommands} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>ElizaOS Commands</CardTitle>
          <CardDescription>
            View and manage commands issued to trading agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : commands.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No commands found. Create an order with an agent assigned to generate commands.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Command</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell className="font-medium">{command.command_content}</TableCell>
                    <TableCell>{command.command_type}</TableCell>
                    <TableCell>
                      <StatusBadge status={command.status} />
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(command.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCommandSelect(command)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Command details dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Command Details</DialogTitle>
            <DialogDescription>
              View information about this command and any responses
            </DialogDescription>
          </DialogHeader>
          
          {selectedCommand && (
            <Tabs defaultValue="command" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="command">Command</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="related">Related Data</TabsTrigger>
              </TabsList>
              
              <TabsContent value="command" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Command ID</h4>
                    <p className="text-sm break-all">{selectedCommand.id}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    <StatusBadge status={selectedCommand.status} />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Command</h4>
                  <p className="text-base">{selectedCommand.command_content}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                  <p className="text-sm">{selectedCommand.command_type}</p>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="context">
                    <AccordionTrigger>Command Context</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-slate-50 p-4 rounded-md text-xs overflow-auto">
                        {JSON.stringify(selectedCommand.context, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Created At</h4>
                    <p className="text-sm">{new Date(selectedCommand.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Updated At</h4>
                    <p className="text-sm">{new Date(selectedCommand.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="response" className="mt-4 space-y-4">
                {selectedResponse ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Response ID</h4>
                        <p className="text-sm break-all">{selectedResponse.id}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                        <StatusBadge status={selectedResponse.status} />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Response</h4>
                      <p className="text-base">{selectedResponse.response_content}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                      <p className="text-sm">{selectedResponse.response_type}</p>
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="context">
                        <AccordionTrigger>Response Context</AccordionTrigger>
                        <AccordionContent>
                          <pre className="bg-slate-50 p-4 rounded-md text-xs overflow-auto">
                            {JSON.stringify(selectedResponse.context, null, 2)}
                          </pre>
                        </AccordionContent>
                      </AccordionItem>
                      
                      {selectedResponse.metadata && (
                        <AccordionItem value="metadata">
                          <AccordionTrigger>Metadata</AccordionTrigger>
                          <AccordionContent>
                            <pre className="bg-slate-50 p-4 rounded-md text-xs overflow-auto">
                              {JSON.stringify(selectedResponse.metadata, null, 2)}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Created At</h4>
                        <p className="text-sm">{new Date(selectedResponse.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Updated At</h4>
                        <p className="text-sm">{new Date(selectedResponse.updated_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                ) : selectedCommand.status === 'pending' ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No response yet for this command</p>
                    <Button onClick={simulateResponse}>
                      Simulate Response (Testing Only)
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="related" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {relatedAgent && (
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Agent</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Name</h4>
                            <p className="text-sm">{relatedAgent.name}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                            <Badge variant={relatedAgent.is_active ? "default" : "secondary"}>
                              {relatedAgent.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {relatedOrder && (
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-base">Order</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 space-y-2">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Symbol</h4>
                            <p className="text-sm">{relatedOrder.symbol}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Side</h4>
                            <Badge variant={relatedOrder.side === 'buy' ? "default" : "destructive"}>
                              {relatedOrder.side.toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                            <p className="text-sm">{relatedOrder.order_type}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Quantity</h4>
                            <p className="text-sm">{relatedOrder.quantity}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Price</h4>
                            <p className="text-sm">{relatedOrder.price || 'Market'}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                            <StatusBadge status={relatedOrder.status} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Exchange</h4>
                            <p className="text-sm">{relatedOrder.exchange}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Exchange Order ID</h4>
                            <p className="text-sm">{relatedOrder.exchange_order_id || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Created At</h4>
                            <p className="text-sm">{new Date(relatedOrder.created_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Executed At</h4>
                            <p className="text-sm">
                              {relatedOrder.executed_at 
                                ? new Date(relatedOrder.executed_at).toLocaleString() 
                                : 'Not executed'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
