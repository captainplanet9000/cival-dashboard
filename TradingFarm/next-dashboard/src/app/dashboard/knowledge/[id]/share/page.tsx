'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import knowledgeService from '@/services/knowledge-service-factory';
import { KnowledgeDocument } from '@/services/knowledge-service';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Share2, Users, Robot, Building, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ShareDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [document, setDocument] = useState<KnowledgeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Sharing options
  const [isPublic, setIsPublic] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'write' | 'admin'>('read');
  const [activeTab, setActiveTab] = useState('users');
  
  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedFarms, setSelectedFarms] = useState<number[]>([]);
  
  // Mock data for UI development
  const [users, setUsers] = useState([
    { id: 'user-1', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 'user-2', name: 'Bob Smith', email: 'bob@example.com' },
    { id: 'user-3', name: 'Carol Williams', email: 'carol@example.com' },
    { id: 'user-4', name: 'Dave Brown', email: 'dave@example.com' },
  ]);
  
  const [agents, setAgents] = useState([
    { id: 'agent-1', name: 'Trading Assistant', farm_id: 1 },
    { id: 'agent-2', name: 'Market Analyzer', farm_id: 1 },
    { id: 'agent-3', name: 'Strategy Executor', farm_id: 2 },
    { id: 'agent-4', name: 'Risk Manager', farm_id: 3 },
  ]);
  
  const [farms, setFarms] = useState([
    { id: 1, name: 'Crypto Trading Farm' },
    { id: 2, name: 'Stock Trading Farm' },
    { id: 3, name: 'Forex Trading Farm' },
  ]);
  
  const id = params.id as string;
  
  useEffect(() => {
    fetchDocument();
    // In a real app, we would fetch users, agents, and farms here
  }, [id]);
  
  async function fetchDocument() {
    setLoading(true);
    
    try {
      const result = await knowledgeService.getDocument(id);
      
      if (result.success) {
        setDocument(result.data);
        // Initialize isPublic based on the document's current state
        setIsPublic(result.data.is_public || false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load document',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching document:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading the document',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  function handleUserToggle(userId: string) {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }
  
  function handleAgentToggle(agentId: string) {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  }
  
  function handleFarmToggle(farmId: number) {
    setSelectedFarms(prev =>
      prev.includes(farmId)
        ? prev.filter(id => id !== farmId)
        : [...prev, farmId]
    );
  }
  
  async function handleShare() {
    if (!document) return;
    
    setSubmitting(true);
    
    try {
      const result = await knowledgeService.shareKnowledge(document.id!, {
        agentIds: selectedAgents.length > 0 ? selectedAgents : undefined,
        farmIds: selectedFarms.length > 0 ? selectedFarms : undefined,
        userIds: selectedUsers.length > 0 ? selectedUsers : undefined,
        permissionLevel,
        isPublic
      });
      
      if (result.success) {
        toast({
          title: 'Document shared',
          description: 'The document was successfully shared',
        });
        router.push(`/dashboard/knowledge/${id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to share document',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error sharing document:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while sharing the document',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }
  
  function handleBack() {
    router.push(`/dashboard/knowledge/${id}`);
  }
  
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document
        </Button>
        
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Document Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested document could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={handleBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document
      </Button>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Share2 className="mr-2 h-6 w-6" /> Share Document
        </h1>
        <p className="text-muted-foreground mt-1">
          Share &quot;{document.title}&quot; with users, agents, or farms
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibility Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is_public" 
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(!!checked)}
                  />
                  <Label htmlFor="is_public">Make document public</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Public documents are visible to all users in the system, regardless of specific permissions.
                </p>
                
                <div className="space-y-2 pt-4">
                  <Label>Permission Level</Label>
                  <RadioGroup 
                    value={permissionLevel}
                    onValueChange={(value) => setPermissionLevel(value as 'read' | 'write' | 'admin')}
                  >
                    <div className="flex items-center space-x-2 py-1">
                      <RadioGroupItem value="read" id="read" />
                      <Label htmlFor="read">Read only</Label>
                    </div>
                    <div className="flex items-center space-x-2 py-1">
                      <RadioGroupItem value="write" id="write" />
                      <Label htmlFor="write">Can edit</Label>
                    </div>
                    <div className="flex items-center space-x-2 py-1">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin">Full control (can share and delete)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Title:</span> {document.title}
                </div>
                {document.description && (
                  <div>
                    <span className="font-medium">Description:</span> {document.description}
                  </div>
                )}
                <div>
                  <span className="font-medium">Type:</span> {document.document_type}
                </div>
                <div>
                  <span className="font-medium">Current visibility:</span> {document.is_public ? 'Public' : 'Private'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Share With</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="users" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" /> Users
                  </TabsTrigger>
                  <TabsTrigger value="agents" className="flex items-center">
                    <Robot className="mr-2 h-4 w-4" /> Agents
                  </TabsTrigger>
                  <TabsTrigger value="farms" className="flex items-center">
                    <Building className="mr-2 h-4 w-4" /> Farms
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="users" className="p-2">
                  <div className="space-y-4">
                    <div className="max-h-[400px] overflow-y-auto">
                      {users.map(user => (
                        <div key={user.id} className="flex items-center space-x-2 py-2 border-b">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => handleUserToggle(user.id)}
                          />
                          <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                            <div>{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedUsers.length} user(s) selected
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="agents" className="p-2">
                  <div className="space-y-4">
                    <div className="max-h-[400px] overflow-y-auto">
                      {agents.map(agent => (
                        <div key={agent.id} className="flex items-center space-x-2 py-2 border-b">
                          <Checkbox
                            id={`agent-${agent.id}`}
                            checked={selectedAgents.includes(agent.id)}
                            onCheckedChange={() => handleAgentToggle(agent.id)}
                          />
                          <Label htmlFor={`agent-${agent.id}`} className="flex-1 cursor-pointer">
                            <div>{agent.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Farm: {farms.find(f => f.id === agent.farm_id)?.name || agent.farm_id}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedAgents.length} agent(s) selected
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="farms" className="p-2">
                  <div className="space-y-4">
                    <div className="max-h-[400px] overflow-y-auto">
                      {farms.map(farm => (
                        <div key={farm.id} className="flex items-center space-x-2 py-2 border-b">
                          <Checkbox
                            id={`farm-${farm.id}`}
                            checked={selectedFarms.includes(farm.id)}
                            onCheckedChange={() => handleFarmToggle(farm.id)}
                          />
                          <Label htmlFor={`farm-${farm.id}`} className="flex-1 cursor-pointer">
                            <div>{farm.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {farm.id}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedFarms.length} farm(s) selected
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="flex justify-end mt-6 space-x-2">
            <Button variant="outline" onClick={handleBack}>Cancel</Button>
            <Button onClick={handleShare} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Document
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
