'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Brain, 
  Network, 
  MessageSquare, 
  Share2, 
  FileText, 
  Bot, 
  Lightbulb, 
  ChevronRight,
  Clock,
  ArrowUpRight,
  Plus,
  Settings,
  Search
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { TeamworkHub } from './TeamworkHub';
import { useToast } from '@/hooks/use-toast';

// Type definitions
interface CollaborativeInsight {
  id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  votes: number;
  type: 'market' | 'strategy' | 'risk' | 'technology';
  status: 'active' | 'implemented' | 'archived';
  tags: string[];
}

interface SharedResource {
  id: string;
  title: string;
  type: 'document' | 'strategy' | 'dataset' | 'analysis';
  owner: string;
  createdAt: string;
  lastModified: string;
  accessLevel: 'public' | 'team' | 'private';
  tags: string[];
}

interface CollaborationTask {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'under_review' | 'complete';
  assignees: string[];
  dueDate?: string;
  progress: number;
  tags: string[];
}

interface CollaborativeAgentTeam {
  id: string;
  name: string;
  description: string;
  members: {
    id: string;
    name: string;
    role: 'leader' | 'analyst' | 'executor' | 'observer';
    type: 'human' | 'agent';
    avatar?: string;
  }[];
  activeTask?: string;
  createdAt: string;
}

interface CollaborativeIntelligenceCenterProps {
  userId?: string;
  farmId?: string;
  className?: string;
}

export function CollaborativeIntelligenceCenter({ 
  userId,
  farmId,
  className = ''
}: CollaborativeIntelligenceCenterProps) {
  // State
  const [activeTab, setActiveTab] = useState<string>('insights');
  const [insights, setInsights] = useState<CollaborativeInsight[]>([]);
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [collaborationTasks, setCollaborationTasks] = useState<CollaborationTask[]>([]);
  const [agentTeams, setAgentTeams] = useState<CollaborativeAgentTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const { toast } = useToast();

  // Mock data initialization
  useEffect(() => {
    // Mock insights
    setInsights([
      {
        id: 'insight-1',
        title: 'Market volatility pattern detected in tech sector',
        content: 'Analysis of the last 3 trading sessions indicates an emerging volatility pattern in technology stocks that could present arbitrage opportunities.',
        author: 'Jane Smith',
        authorAvatar: '/avatars/jane.jpg',
        createdAt: '2025-04-12T14:30:00Z',
        votes: 12,
        type: 'market',
        status: 'active',
        tags: ['volatility', 'tech stocks', 'pattern analysis']
      },
      {
        id: 'insight-2',
        title: 'Risk-adjusted yield strategy outperforming benchmarks',
        content: 'The new risk-adjusted yield strategy has consistently outperformed benchmarks by 3.2% over the past month with lower volatility.',
        author: 'AI-Analyst-07',
        authorAvatar: '',
        createdAt: '2025-04-11T09:15:00Z',
        votes: 8,
        type: 'strategy',
        status: 'implemented',
        tags: ['yield', 'risk management', 'performance']
      },
      {
        id: 'insight-3',
        title: 'Correlation breakdown between traditional pairs',
        content: 'Traditional correlation patterns between USD/JPY and US Treasury yields have weakened by 27% since March 2025.',
        author: 'Alex Wong',
        authorAvatar: '/avatars/alex.jpg',
        createdAt: '2025-04-10T16:45:00Z',
        votes: 15,
        type: 'market',
        status: 'active',
        tags: ['forex', 'correlation', 'treasuries']
      },
      {
        id: 'insight-4',
        title: 'New NLP model improving sentiment accuracy by 18%',
        content: 'Implementation of advanced NLP with fine-tuning on financial texts has improved sentiment analysis accuracy from 72% to 90%.',
        author: 'Sarah Chen',
        authorAvatar: '/avatars/sarah.jpg',
        createdAt: '2025-04-09T11:30:00Z',
        votes: 22,
        type: 'technology',
        status: 'implemented',
        tags: ['NLP', 'sentiment analysis', 'AI']
      },
      {
        id: 'insight-5',
        title: 'Emerging liquidity risk in small-cap commodities',
        content: 'Trading volume analysis shows concerning liquidity decline in small-cap commodity futures, particularly in agricultural sectors.',
        author: 'TradingAgent-05',
        authorAvatar: '',
        createdAt: '2025-04-08T15:20:00Z',
        votes: 7,
        type: 'risk',
        status: 'active',
        tags: ['liquidity', 'commodities', 'risk management']
      }
    ]);

    // Mock shared resources
    setSharedResources([
      {
        id: 'resource-1',
        title: 'Q2 2025 Market Outlook Report',
        type: 'document',
        owner: 'Jane Smith',
        createdAt: '2025-04-05T10:30:00Z',
        lastModified: '2025-04-11T14:20:00Z',
        accessLevel: 'team',
        tags: ['report', 'outlook', 'quarterly']
      },
      {
        id: 'resource-2',
        title: 'Enhanced Momentum Strategy v2.3',
        type: 'strategy',
        owner: 'John Davis',
        createdAt: '2025-03-28T09:15:00Z',
        lastModified: '2025-04-10T11:45:00Z',
        accessLevel: 'team',
        tags: ['momentum', 'strategy', 'algorithm']
      },
      {
        id: 'resource-3',
        title: 'Forex Volatility Dataset 2020-2025',
        type: 'dataset',
        owner: 'Sarah Chen',
        createdAt: '2025-04-02T16:30:00Z',
        lastModified: '2025-04-09T08:20:00Z',
        accessLevel: 'public',
        tags: ['forex', 'volatility', 'historical data']
      },
      {
        id: 'resource-4',
        title: 'Sector Rotation Analysis Tool',
        type: 'analysis',
        owner: 'Mike Johnson',
        createdAt: '2025-03-15T13:45:00Z',
        lastModified: '2025-04-07T15:10:00Z',
        accessLevel: 'team',
        tags: ['sectors', 'rotation', 'analysis']
      }
    ]);

    // Mock collaboration tasks
    setCollaborationTasks([
      {
        id: 'task-1',
        title: 'Develop new yield curve analysis model',
        status: 'in_progress',
        assignees: ['Jane Smith', 'Sarah Chen', 'AI-Analyst-03'],
        dueDate: '2025-04-30T23:59:59Z',
        progress: 45,
        tags: ['model development', 'yield curve', 'analysis']
      },
      {
        id: 'task-2',
        title: 'Quarterly strategy performance review',
        status: 'under_review',
        assignees: ['John Davis', 'Alex Wong', 'TradingAgent-05'],
        dueDate: '2025-04-15T23:59:59Z',
        progress: 80,
        tags: ['review', 'performance', 'quarterly']
      },
      {
        id: 'task-3',
        title: 'Implement enhanced risk model',
        status: 'not_started',
        assignees: ['Alex Wong', 'Mike Johnson'],
        dueDate: '2025-05-10T23:59:59Z',
        progress: 0,
        tags: ['risk', 'model', 'implementation']
      },
      {
        id: 'task-4',
        title: 'Backtest multi-strategy portfolio',
        status: 'complete',
        assignees: ['Sarah Chen', 'AI-Analyst-07'],
        dueDate: '2025-04-08T23:59:59Z',
        progress: 100,
        tags: ['backtest', 'portfolio', 'multi-strategy']
      }
    ]);

    // Mock agent teams
    setAgentTeams([
      {
        id: 'team-1',
        name: 'Market Analysis Team',
        description: 'Team focused on real-time market analysis and opportunity identification',
        members: [
          {
            id: 'user-1',
            name: 'Jane Smith',
            role: 'leader',
            type: 'human',
            avatar: '/avatars/jane.jpg'
          },
          {
            id: 'agent-1',
            name: 'AI-Analyst-03',
            role: 'analyst',
            type: 'agent'
          },
          {
            id: 'agent-2',
            name: 'AI-Analyst-07',
            role: 'analyst',
            type: 'agent'
          },
          {
            id: 'user-2',
            name: 'John Davis',
            role: 'observer',
            type: 'human',
            avatar: '/avatars/john.jpg'
          }
        ],
        activeTask: 'task-1',
        createdAt: '2025-03-15T10:00:00Z'
      },
      {
        id: 'team-2',
        name: 'Trading Execution Squad',
        description: 'Team responsible for optimal trade execution and transaction cost analysis',
        members: [
          {
            id: 'user-3',
            name: 'Alex Wong',
            role: 'leader',
            type: 'human',
            avatar: '/avatars/alex.jpg'
          },
          {
            id: 'agent-3',
            name: 'TradingAgent-05',
            role: 'executor',
            type: 'agent'
          },
          {
            id: 'agent-4',
            name: 'RiskAgent-02',
            role: 'observer',
            type: 'agent'
          }
        ],
        createdAt: '2025-03-20T14:30:00Z'
      },
      {
        id: 'team-3',
        name: 'Strategy Development Crew',
        description: 'Collaborative team for developing and refining trading strategies',
        members: [
          {
            id: 'user-4',
            name: 'Sarah Chen',
            role: 'leader',
            type: 'human',
            avatar: '/avatars/sarah.jpg'
          },
          {
            id: 'user-5',
            name: 'Mike Johnson',
            role: 'analyst',
            type: 'human',
            avatar: '/avatars/mike.jpg'
          },
          {
            id: 'agent-5',
            name: 'StrategyAgent-08',
            role: 'executor',
            type: 'agent'
          }
        ],
        activeTask: 'task-3',
        createdAt: '2025-04-01T09:45:00Z'
      }
    ]);
  }, []);

  // Filter insights based on search query and filter type
  const filteredInsights = insights.filter(insight => {
    const matchesSearch = searchQuery === '' || 
      insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = filterType === 'all' || insight.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Filter resources based on search query and filter type
  const filteredResources = sharedResources.filter(resource => {
    const matchesSearch = searchQuery === '' || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = filterType === 'all' || resource.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Filter tasks based on search query and filter type
  const filteredTasks = collaborationTasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = filterType === 'all' || task.status === filterType;
    
    return matchesSearch && matchesType;
  });

  // Event handlers
  const handleCreateSession = () => {
    toast({
      title: "New collaboration session",
      description: "Creating a new collaboration session...",
    });
  };

  const handleInviteUser = () => {
    toast({
      title: "Team invitation",
      description: "Invitation sent successfully",
    });
  };

  const handleVoteInsight = (id: string) => {
    setInsights(insights.map(insight => 
      insight.id === id 
        ? { ...insight, votes: insight.votes + 1 } 
        : insight
    ));
    
    toast({
      title: "Vote recorded",
      description: "Your vote has been added to this insight",
    });
  };

  const handleShareResource = (id: string) => {
    toast({
      title: "Resource shared",
      description: "Resource link copied to clipboard",
    });
  };

  const handleCreateTeam = () => {
    toast({
      title: "Team creation",
      description: "New collaborative team creation started",
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          {status.replace('_', ' ')}
        </Badge>;
      case 'implemented':
      case 'complete':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          {status.replace('_', ' ')}
        </Badge>;
      case 'under_review':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
          {status.replace('_', ' ')}
        </Badge>;
      case 'not_started':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {status.replace('_', ' ')}
        </Badge>;
      case 'archived':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {status}
        </Badge>;
      default:
        return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  // Get type badge color
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'market':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{type}</Badge>;
      case 'strategy':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">{type}</Badge>;
      case 'risk':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">{type}</Badge>;
      case 'technology':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{type}</Badge>;
      case 'document':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">{type}</Badge>;
      case 'dataset':
        return <Badge variant="outline" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300">{type}</Badge>;
      case 'analysis':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">{type}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Collaborative Intelligence</h2>
          <p className="text-muted-foreground">
            Share insights and collaborate with team members and AI agents
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {['jane', 'john', 'sarah', 'mike', 'alex'].map((user, index) => (
              <Avatar key={user} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={`/avatars/${user}.jpg`} alt={`${user}'s avatar`} />
                <AvatarFallback>{user.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
              +3
            </div>
          </div>
          
          <Badge variant="secondary" className="ml-2">
            <Network className="mr-1 h-3 w-3" />
            Online
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search insights, resources, tasks..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            
            {activeTab === 'insights' && (
              <>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
              </>
            )}
            
            {activeTab === 'resources' && (
              <>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="strategy">Strategies</SelectItem>
                <SelectItem value="dataset">Datasets</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
              </>
            )}
            
            {activeTab === 'tasks' && (
              <>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <Clock className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="h-4 w-4 mr-2" />
            Teams
          </TabsTrigger>
        </TabsList>
        
        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Collaborative Insights</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Insight
            </Button>
          </div>
          
          {filteredInsights.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Lightbulb className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-lg font-medium text-center">No insights found</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {searchQuery 
                    ? `No results matching "${searchQuery}"`
                    : "Create your first collaborative insight to share with your team"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInsights.map((insight) => (
                <Card key={insight.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start space-x-4">
                      <CardTitle className="text-lg line-clamp-2">{insight.title}</CardTitle>
                      {getStatusBadge(insight.status)}
                    </div>
                    <CardDescription className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        {insight.authorAvatar ? (
                          <AvatarImage src={insight.authorAvatar} alt={insight.author} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-xs">
                            {insight.author.includes('AI') ? <Bot className="h-3 w-3" /> : insight.author.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span>{insight.author}</span>
                      <span>•</span>
                      <span>{formatDate(insight.createdAt)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm line-clamp-3">{insight.content}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {getTypeBadge(insight.type)}
                      {insight.tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button variant="ghost" size="sm" onClick={() => handleVoteInsight(insight.id)}>
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      <span>{insight.votes} Votes</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleShareResource(insight.id)}>
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Shared Resources</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Share Resource
            </Button>
          </div>
          
          {filteredResources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-lg font-medium text-center">No resources found</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {searchQuery 
                    ? `No results matching "${searchQuery}"`
                    : "Share your first resource with the team"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{resource.title}</h4>
                        {getTypeBadge(resource.type)}
                        <Badge 
                          variant={resource.accessLevel === 'public' ? 'default' : 'outline'}
                          className={resource.accessLevel === 'public' ? '' : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300'}
                        >
                          {resource.accessLevel}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                        <span>Owner: {resource.owner}</span>
                        <span>•</span>
                        <span>Created: {formatDate(resource.createdAt)}</span>
                        <span>•</span>
                        <span>Updated: {formatDate(resource.lastModified)}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleShareResource(resource.id)}>
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Collaboration Tasks</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
          
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-lg font-medium text-center">No tasks found</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {searchQuery 
                    ? `No results matching "${searchQuery}"`
                    : "Create your first collaboration task"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{task.title}</h4>
                        {getStatusBadge(task.status)}
                      </div>
                      
                      {task.dueDate && (
                        <div className="text-sm">
                          Due: <span className={new Date(task.dueDate) < new Date() && task.status !== 'complete' ? 'text-red-500' : ''}>
                            {formatDate(task.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <Progress value={task.progress} className="h-2 mb-2" />
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee, index) => (
                          <Avatar key={index} className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className={assignee.includes('AI') ? 'bg-primary/10' : ''}>
                              {assignee.includes('AI') ? <Bot className="h-3 w-3" /> : assignee.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Collaborative Agent Teams</h3>
            <Button onClick={handleCreateTeam}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
          
          {agentTeams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-lg font-medium text-center">No teams found</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Create your first collaborative team
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agentTeams.map((team) => (
                <Card key={team.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>{team.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Team Members</div>
                        <div className="flex flex-wrap gap-2">
                          {team.members.map((member) => (
                            <div key={member.id} className="flex items-center space-x-1">
                              <Avatar className="h-6 w-6">
                                {member.avatar ? (
                                  <AvatarImage src={member.avatar} alt={member.name} />
                                ) : (
                                  <AvatarFallback className={member.type === 'agent' ? 'bg-primary/10' : ''}>
                                    {member.type === 'agent' ? <Bot className="h-3 w-3" /> : member.name.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="text-sm">{member.name}</div>
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                              >
                                {member.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {team.activeTask && (
                        <div>
                          <div className="text-sm font-medium mb-1">Current Task</div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {collaborationTasks.find(task => task.id === team.activeTask)?.title || team.activeTask}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button variant="outline" size="sm" className="mr-2">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Collaborate
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CollaborativeIntelligenceCenter; 