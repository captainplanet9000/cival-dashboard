"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain,
  FileText,
  Plus,
  Calendar,
  Users,
  PieChart,
  BarChart2,
  BookOpen,
  Edit,
  Star,
  Filter,
  Paperclip,
  Share2,
  Clock,
  MessageSquare,
  FileUp,
  CheckCircle,
  X,
  Search,
  FolderOpen
} from "lucide-react";

export function ResearchCollaboration() {
  // State
  const [activeTab, setActiveTab] = useState("projects");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock research projects
  const researchProjects = [
    {
      id: "project-1",
      title: "Market Regime Detection Framework",
      description: "Developing a framework to automatically identify and classify market regimes",
      status: "active",
      progress: 68,
      members: [
        { id: "user-1", name: "Jane Smith", avatar: "/avatars/jane.jpg" },
        { id: "user-2", name: "John Davis", avatar: "/avatars/john.jpg" },
        { id: "user-3", name: "Sarah Chen", avatar: "/avatars/sarah.jpg" }
      ],
      documents: 8,
      datasets: 3,
      tasksCompleted: 12,
      tasksTotal: 18,
      lastUpdated: "2025-04-12T14:30:00Z",
      tags: ["market analysis", "machine learning", "classification"]
    },
    {
      id: "project-2",
      title: "Volatility Forecasting Model",
      description: "Research on advanced volatility forecasting techniques using deep learning",
      status: "active",
      progress: 42,
      members: [
        { id: "user-2", name: "John Davis", avatar: "/avatars/john.jpg" },
        { id: "user-5", name: "Alex Wong", avatar: "/avatars/alex.jpg" }
      ],
      documents: 5,
      datasets: 2,
      tasksCompleted: 7,
      tasksTotal: 15,
      lastUpdated: "2025-04-11T16:45:00Z",
      tags: ["volatility", "deep learning", "forecasting"]
    },
    {
      id: "project-3",
      title: "Correlation Analysis Across Asset Classes",
      description: "Studying cross-asset correlations during different market conditions",
      status: "completed",
      progress: 100,
      members: [
        { id: "user-1", name: "Jane Smith", avatar: "/avatars/jane.jpg" },
        { id: "user-4", name: "Mike Johnson", avatar: "/avatars/mike.jpg" }
      ],
      documents: 12,
      datasets: 5,
      tasksCompleted: 20,
      tasksTotal: 20,
      lastUpdated: "2025-04-05T11:20:00Z",
      tags: ["correlation", "market conditions", "diversification"]
    },
    {
      id: "project-4",
      title: "Order Flow Analysis Methods",
      description: "Analyzing order flow patterns and their predictive power for market movements",
      status: "draft",
      progress: 15,
      members: [
        { id: "user-3", name: "Sarah Chen", avatar: "/avatars/sarah.jpg" }
      ],
      documents: 2,
      datasets: 1,
      tasksCompleted: 3,
      tasksTotal: 12,
      lastUpdated: "2025-04-10T09:15:00Z",
      tags: ["order flow", "market microstructure", "price action"]
    }
  ];
  
  // Mock research documents
  const researchDocuments = [
    {
      id: "doc-1",
      title: "Market Regime Classification Methods",
      projectId: "project-1",
      author: "Jane Smith",
      type: "document",
      status: "in-review",
      lastUpdated: "2025-04-12T10:30:00Z",
      collaborators: 3,
      comments: 8,
      version: "1.3",
      tags: ["classification", "machine learning"]
    },
    {
      id: "doc-2",
      title: "Regime Detection Literature Review",
      projectId: "project-1",
      author: "Sarah Chen",
      type: "document",
      status: "final",
      lastUpdated: "2025-04-08T14:15:00Z",
      collaborators: 2,
      comments: 5,
      version: "2.0",
      tags: ["literature review", "market regimes"]
    },
    {
      id: "doc-3",
      title: "Statistical Features of Market Regimes Dataset",
      projectId: "project-1",
      author: "John Davis",
      type: "dataset",
      status: "in-progress",
      lastUpdated: "2025-04-11T16:45:00Z",
      collaborators: 2,
      comments: 3,
      version: "0.8",
      tags: ["dataset", "statistics", "features"]
    },
    {
      id: "doc-4",
      title: "Market Regime Classifier - Initial Results",
      projectId: "project-1",
      author: "Jane Smith",
      type: "visualization",
      status: "in-progress",
      lastUpdated: "2025-04-12T11:05:00Z",
      collaborators: 3,
      comments: 7,
      version: "0.9",
      tags: ["visualization", "results", "classifier"]
    }
  ];
  
  // Mock research tasks
  const researchTasks = [
    {
      id: "task-1",
      projectId: "project-1",
      title: "Implement Hidden Markov Model for regime detection",
      assignee: "John Davis",
      status: "in-progress",
      priority: "high",
      dueDate: "2025-04-20T00:00:00Z",
      created: "2025-04-05T09:30:00Z",
      description: "Create a Hidden Markov Model implementation to detect market regimes based on price and volume data."
    },
    {
      id: "task-2",
      projectId: "project-1",
      title: "Compile financial crisis historical data",
      assignee: "Sarah Chen",
      status: "completed",
      priority: "medium",
      dueDate: "2025-04-10T00:00:00Z",
      created: "2025-04-03T14:15:00Z",
      description: "Gather historical market data from past financial crises for backtesting the regime detection model."
    },
    {
      id: "task-3",
      projectId: "project-1",
      title: "Create visualization dashboard for regime transitions",
      assignee: "Jane Smith",
      status: "not-started",
      priority: "medium",
      dueDate: "2025-04-25T00:00:00Z",
      created: "2025-04-08T11:45:00Z",
      description: "Develop a dashboard to visualize transitions between different market regimes over time."
    },
    {
      id: "task-4",
      projectId: "project-1",
      title: "Evaluate classifier performance metrics",
      assignee: "Jane Smith",
      status: "in-progress",
      priority: "high",
      dueDate: "2025-04-18T00:00:00Z",
      created: "2025-04-07T16:30:00Z",
      description: "Calculate and analyze performance metrics for the market regime classifier, including accuracy, precision, and recall."
    }
  ];
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  
  // Get document type icon
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "dataset":
        return <BarChart2 className="h-4 w-4 text-green-500" />;
      case "visualization":
        return <PieChart className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  // Get document status badge
  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case "in-progress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Progress</Badge>;
      case "in-review":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">In Review</Badge>;
      case "final":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Final</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get task priority badge
  const getTaskPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">High</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  // Get task status icon
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "not-started":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  // Filter projects based on search query
  const filteredProjects = researchProjects.filter(project => 
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Get project documents
  const getProjectDocuments = (projectId: string) => {
    return researchDocuments.filter(doc => doc.projectId === projectId);
  };
  
  // Get project tasks
  const getProjectTasks = (projectId: string) => {
    return researchTasks.filter(task => task.projectId === projectId);
  };
  
  // Get selected project
  const getSelectedProject = () => {
    return researchProjects.find(project => project.id === selectedProject);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Research Collaboration</h2>
          <p className="text-muted-foreground">
            Collaborative research environment for market analysis
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline">
            <FolderOpen className="h-4 w-4 mr-2" />
            Browse Library
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Research Project
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Projects</CardTitle>
            <CardDescription>Current research initiatives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <div className="text-sm text-muted-foreground">
              with 8 team members
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Research Documents</CardTitle>
            <CardDescription>Collaborative documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27</div>
            <div className="text-sm text-muted-foreground">
              across all projects
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Research Tasks</CardTitle>
            <CardDescription>Work items and assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <div className="text-sm text-muted-foreground">
              65% completion rate
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Research Projects</span>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </CardTitle>
            <CardDescription>
              Browse and manage research initiatives
            </CardDescription>
            <div className="mt-2 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  className={`px-6 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    project.id === selectedProject ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{project.title}</div>
                      <div className="text-sm text-muted-foreground">{project.description}</div>
                    </div>
                    <Badge variant={
                      project.status === 'active' ? 'default' :
                      project.status === 'completed' ? 'secondary' :
                      'outline'
                    }>
                      {project.status === 'active' ? 'Active' :
                       project.status === 'completed' ? 'Completed' :
                       'Draft'}
                    </Badge>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                    <div className="flex -space-x-2">
                      {project.members.slice(0, 3).map((member, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {project.members.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                          +{project.members.length - 3}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Updated {formatRelativeTime(project.lastUpdated)}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredProjects.length === 0 && (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>No research projects found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="col-span-8">
          {selectedProject ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{getSelectedProject()?.title}</CardTitle>
                    <CardDescription>{getSelectedProject()?.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Project
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex -space-x-2">
                    {getSelectedProject()?.members.map((member, i) => (
                      <Avatar key={i} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getSelectedProject()?.members.length} team members
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                </div>
                
                <Tabs defaultValue="documents" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="documents">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="tasks">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tasks
                    </TabsTrigger>
                    <TabsTrigger value="discussions">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Discussions
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="documents" className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {getProjectDocuments(selectedProject).length} documents in this project
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <FileUp className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          New Document
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {getProjectDocuments(selectedProject).map((document) => (
                        <Card key={document.id} className="overflow-hidden">
                          <div className="flex items-center p-4">
                            <div className="mr-4">
                              {getDocumentIcon(document.type)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{document.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Created by {document.author} • Version {document.version}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getDocumentStatusBadge(document.status)}
                                  <Badge variant="outline">{document.type}</Badge>
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center mt-2 text-sm">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center">
                                    <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <span>{document.collaborators} collaborators</span>
                                  </div>
                                  <div className="flex items-center">
                                    <MessageSquare className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <span>{document.comments} comments</span>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Updated {formatRelativeTime(document.lastUpdated)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="tasks" className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {getProjectTasks(selectedProject).length} tasks in this project
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                        </Button>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {getProjectTasks(selectedProject).map((task) => (
                        <Card key={task.id} className="overflow-hidden">
                          <div className="flex items-center p-4">
                            <div className="mr-4">
                              {getTaskStatusIcon(task.status)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{task.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Assigned to {task.assignee}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getTaskPriorityBadge(task.priority)}
                                  <Badge variant={
                                    task.status === 'completed' ? 'secondary' :
                                    task.status === 'in-progress' ? 'default' :
                                    'outline'
                                  }>
                                    {task.status === 'completed' ? 'Completed' :
                                    task.status === 'in-progress' ? 'In Progress' :
                                    'Not Started'}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-sm text-muted-foreground">
                                {task.description}
                              </div>
                              
                              <div className="flex justify-between items-center mt-2 text-xs">
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span>Due by {formatDate(task.dueDate)}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  Created {formatRelativeTime(task.created)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="discussions" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Project Discussions</CardTitle>
                        <CardDescription>
                          Collaborative discussions about this research project
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground space-y-2">
                          <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
                          <p>No discussions have been started yet.</p>
                          <p className="text-sm">Start a new thread to discuss aspects of this research project.</p>
                          <Button className="mt-4">
                            <Plus className="h-4 w-4 mr-2" />
                            New Discussion Thread
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center py-12 px-4 space-y-4">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-20" />
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Select a Research Project</h3>
                  <p className="text-muted-foreground">
                    Choose a project from the list to view its details, documents, and tasks.
                  </p>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
