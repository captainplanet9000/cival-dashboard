'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Users,
  FileText,
  PanelRight,
  Brain
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Member {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar: string;
  isAgent: boolean;
  status: 'online' | 'offline';
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  isAgent: boolean;
  content: string;
  timestamp: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CollaborationWorkspaceProps {
  farmId: string;
}

export function CollaborationWorkspace({ farmId }: CollaborationWorkspaceProps) {
  const [activeTab, setActiveTab] = React.useState('chat');
  const [members, setMembers] = React.useState<Member[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [knowledgeBase, setKnowledgeBase] = React.useState<KnowledgeItem[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState({
    members: false,
    messages: false,
    knowledge: false
  });
  const [searchQuery, setSearchQuery] = React.useState('');

  // Fetch members, messages, and knowledge base on component mount
  React.useEffect(() => {
    fetchMembers();
    fetchMessages();
    fetchKnowledgeBase();
  }, [farmId]);

  // Fetch farm members
  const fetchMembers = async () => {
    setLoading(prev => ({ ...prev, members: true }));
    try {
      // Mock data for demonstration
      const mockMembers: Member[] = [
        {
          id: '1',
          name: 'John Trader',
          role: 'owner',
          avatar: '/avatars/user-01.png',
          isAgent: false,
          status: 'online'
        },
        {
          id: '2',
          name: 'TrendBot',
          role: 'editor',
          avatar: '/avatars/bot-01.png',
          isAgent: true,
          status: 'online'
        },
        {
          id: '3',
          name: 'MeanReversionAgent',
          role: 'editor',
          avatar: '/avatars/bot-02.png',
          isAgent: true,
          status: 'online'
        },
        {
          id: '4',
          name: 'Sarah Analyst',
          role: 'viewer',
          avatar: '/avatars/user-02.png',
          isAgent: false,
          status: 'offline'
        }
      ];
      
      setMembers(mockMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch farm members',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, members: false }));
    }
  };

  // Fetch chat messages
  const fetchMessages = async () => {
    setLoading(prev => ({ ...prev, messages: true }));
    try {
      // Mock data for demonstration
      const mockMessages: Message[] = [
        {
          id: '1',
          senderId: '1',
          senderName: 'John Trader',
          senderAvatar: '/avatars/user-01.png',
          isAgent: false,
          content: "I've set up a new trend following strategy for BTC. Can anyone review it?",
          timestamp: '2025-04-03T14:30:00Z'
        },
        {
          id: '2',
          senderId: '2',
          senderName: 'TrendBot',
          senderAvatar: '/avatars/bot-01.png',
          isAgent: true,
          content: "Looking at your strategy parameters, I recommend increasing the lookback period from 14 to 21 days due to recent market conditions.",
          timestamp: '2025-04-03T14:32:00Z'
        },
        {
          id: '3',
          senderId: '4',
          senderName: 'Sarah Analyst',
          senderAvatar: '/avatars/user-02.png',
          isAgent: false,
          content: "I agree with TrendBot. Also, have you considered adding a volume filter? Recent BTC movements have had low volume which could lead to false breakouts.",
          timestamp: '2025-04-03T14:35:00Z'
        },
        {
          id: '4',
          senderId: '3',
          senderName: 'MeanReversionAgent',
          senderAvatar: '/avatars/bot-02.png',
          isAgent: true,
          content: "I've detected increased volatility in BTC over the past 4 hours. This may impact trend following strategies. Consider adjusting your parameters or using a volatility filter.",
          timestamp: '2025-04-03T14:40:00Z',
          attachments: [
            {
              id: 'a1',
              name: 'volatility_analysis.json',
              type: 'json',
              url: '/attachments/volatility_analysis.json'
            }
          ]
        }
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch chat messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  // Fetch knowledge base
  const fetchKnowledgeBase = async () => {
    setLoading(prev => ({ ...prev, knowledge: true }));
    try {
      // Mock data for demonstration
      const mockKnowledge: KnowledgeItem[] = [
        {
          id: '1',
          title: 'Trend Following Strategy Guide',
          content: 'Comprehensive guide to implementing trend following strategies for cryptocurrency markets, including parameter optimization and risk management techniques.',
          tags: ['strategy', 'trend', 'crypto'],
          createdBy: 'John Trader',
          createdAt: '2025-03-20T10:00:00Z',
          updatedAt: '2025-04-01T15:30:00Z'
        },
        {
          id: '2',
          title: 'Cryptocurrency Volatility Analysis',
          content: 'Analysis of volatility patterns across major cryptocurrencies and their impact on different trading strategies.',
          tags: ['analysis', 'volatility', 'crypto'],
          createdBy: 'TrendBot',
          createdAt: '2025-03-25T14:20:00Z',
          updatedAt: '2025-03-25T14:20:00Z'
        },
        {
          id: '3',
          title: 'Market Correlation Study',
          content: 'Study of correlations between crypto assets and traditional markets, with implications for portfolio diversification.',
          tags: ['analysis', 'correlation', 'diversification'],
          createdBy: 'Sarah Analyst',
          createdAt: '2025-03-28T09:15:00Z',
          updatedAt: '2025-04-02T11:45:00Z'
        },
        {
          id: '4',
          title: 'Risk Management Framework',
          content: 'Comprehensive risk management framework for algorithmic trading, including position sizing, drawdown control, and exposure management.',
          tags: ['risk', 'management', 'position sizing'],
          createdBy: 'MeanReversionAgent',
          createdAt: '2025-04-01T16:40:00Z',
          updatedAt: '2025-04-01T16:40:00Z'
        }
      ];
      
      setKnowledgeBase(mockKnowledge);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch knowledge base',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, knowledge: false }));
    }
  };

  // Send a new message
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const newMessageObj: Message = {
      id: Date.now().toString(),
      senderId: '1', // Current user ID
      senderName: 'John Trader', // Current user name
      senderAvatar: '/avatars/user-01.png', // Current user avatar
      isAgent: false,
      content: newMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessageObj]);
    setNewMessage('');
    
    toast({
      title: 'Message Sent',
      description: 'Your message has been sent to the workspace',
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter knowledge base items based on search query
  const filteredKnowledge = knowledgeBase.filter(item => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(search) ||
      item.content.toLowerCase().includes(search) ||
      item.tags.some(tag => tag.toLowerCase().includes(search))
    );
  });

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Collaboration Workspace</CardTitle>
            <CardDescription>
              Collaborate with team members and agents
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                fetchMembers();
                fetchMessages();
                fetchKnowledgeBase();
              }}
              disabled={loading.members || loading.messages || loading.knowledge}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading.members || loading.messages || loading.knowledge ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="knowledge">
                <Brain className="h-4 w-4 mr-2" />
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="flex-1 flex flex-col px-6">
            <div className="flex-1 py-4">
              <ScrollArea className="h-[400px] pr-4">
                {messages.map((message, index) => (
                  <div key={message.id} className="mb-4">
                    <div className="flex items-start">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                        <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="flex items-center">
                          <p className="text-sm font-medium">{message.senderName}</p>
                          {message.isAgent && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Agent
                            </Badge>
                          )}
                          <p className="ml-auto text-xs text-muted-foreground">
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                        <div className="mt-1 rounded-md bg-muted p-3">
                          <p className="text-sm">{message.content}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map(attachment => (
                                <div key={attachment.id} className="flex items-center rounded-md bg-background px-2 py-1">
                                  <FileText className="h-3 w-3 mr-1" />
                                  <p className="text-xs">{attachment.name}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className="py-4 border-t">
              <div className="flex items-center space-x-2">
                <Textarea
                  placeholder="Type your message..."
                  className="min-h-[80px]"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage} className="self-end">
                  Send
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="knowledge" className="px-6 py-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge base..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {filteredKnowledge.map(item => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="text-xs">
                      By {item.createdBy} • Updated {formatDate(item.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm line-clamp-3">{item.content}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredKnowledge.length === 0 && (
              <Alert>
                <AlertDescription>
                  No knowledge base items found. Try adjusting your search or add new items.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="mt-4 flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Knowledge Item
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="members" className="px-6 py-4">
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-sm font-medium">Member</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Role</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Type</th>
                    <th className="py-3 px-4 text-left text-sm font-medium">Status</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, index) => (
                    <tr key={member.id} className={index < members.length - 1 ? 'border-b' : ''}>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <p className="ml-3 font-medium">{member.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            member.role === 'owner'
                              ? 'default'
                              : member.role === 'editor'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {member.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {member.isAgent ? 'Agent' : 'Human'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div 
                            className={`h-2 w-2 rounded-full mr-2 ${
                              member.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                          <span className="text-sm">{member.status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
