"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users,
  MessageSquare,
  Video,
  UserPlus,
  Send,
  Calendar,
  FileText,
  Zap,
  Paperclip,
  PieChart,
  Clock,
  MessageCircle,
  ThumbsUp,
  Plus,
  Search,
  Bell,
  Flag,
  Trash,
  Bookmark,
  CheckCircle2
} from "lucide-react";

interface TeamworkHubProps {
  onCreateSession?: () => void;
  onInviteUser?: (email: string) => void;
}

export function TeamworkHub({
  onCreateSession,
  onInviteUser
}: TeamworkHubProps) {
  // State
  const [activeTab, setActiveTab] = useState("collaboration");
  const [newMessage, setNewMessage] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  
  // Mock team members
  const teamMembers = [
    { 
      id: "user-1", 
      name: "Jane Smith", 
      email: "jane.smith@example.com", 
      avatar: "/avatars/jane.jpg", 
      role: "Quantitative Analyst",
      status: "online",
      lastActive: new Date().toISOString(),
      recentActivity: "Updated Momentum Strategy parameters"
    },
    { 
      id: "user-2", 
      name: "John Davis", 
      email: "john.davis@example.com", 
      avatar: "/avatars/john.jpg", 
      role: "Trading Strategist",
      status: "online",
      lastActive: new Date().toISOString(),
      recentActivity: "Created new volatility analysis"
    },
    { 
      id: "user-3", 
      name: "Sarah Chen", 
      email: "sarah.chen@example.com", 
      avatar: "/avatars/sarah.jpg", 
      role: "ML Engineer",
      status: "away",
      lastActive: new Date(Date.now() - 30 * 60000).toISOString(),
      recentActivity: "Training new agent model"
    },
    { 
      id: "user-4", 
      name: "Mike Johnson", 
      email: "mike.johnson@example.com", 
      avatar: "/avatars/mike.jpg", 
      role: "Data Scientist",
      status: "offline",
      lastActive: new Date(Date.now() - 120 * 60000).toISOString(),
      recentActivity: "Added new data feeds"
    },
    { 
      id: "user-5", 
      name: "Alex Wong", 
      email: "alex.wong@example.com", 
      avatar: "/avatars/alex.jpg", 
      role: "Risk Manager",
      status: "online",
      lastActive: new Date().toISOString(),
      recentActivity: "Updated risk parameters"
    }
  ];
  
  // Mock active sessions
  const activeSessions = [
    {
      id: "session-1",
      name: "Market Analysis - April 2025",
      creator: "Jane Smith",
      createdAt: "2025-04-12T14:30:00Z",
      participants: ["Jane Smith", "John Davis", "Sarah Chen"],
      type: "research",
      status: "active"
    },
    {
      id: "session-2",
      name: "Volatility Strategy Development",
      creator: "John Davis",
      createdAt: "2025-04-12T10:15:00Z",
      participants: ["John Davis", "Alex Wong", "You"],
      type: "development",
      status: "active"
    },
    {
      id: "session-3",
      name: "Risk Management Review",
      creator: "Alex Wong",
      createdAt: "2025-04-11T16:45:00Z",
      participants: ["Alex Wong", "Jane Smith", "Mike Johnson", "You"],
      type: "review",
      status: "scheduled",
      scheduledFor: "2025-04-13T09:00:00Z"
    }
  ];
  
  // Mock chat messages
  const chatMessages = [
    {
      id: "msg-1",
      sender: "Jane Smith",
      content: "I've just updated the parameters for the Momentum Strategy based on our last backtesting results.",
      timestamp: "2025-04-12T16:05:23Z",
      avatar: "/avatars/jane.jpg"
    },
    {
      id: "msg-2",
      sender: "John Davis",
      content: "Looking good. The win rate has improved by 8% in our simulations.",
      timestamp: "2025-04-12T16:07:45Z",
      avatar: "/avatars/john.jpg"
    },
    {
      id: "msg-3",
      sender: "You",
      content: "Should we deploy this to the staging environment for further testing?",
      timestamp: "2025-04-12T16:09:12Z",
      avatar: ""
    },
    {
      id: "msg-4",
      sender: "Jane Smith",
      content: "Yes, I think we're ready for that. I've added some documentation about the changes as well.",
      timestamp: "2025-04-12T16:11:38Z",
      avatar: "/avatars/jane.jpg",
      attachment: {
        type: "document",
        name: "momentum_strategy_updates.pdf",
        size: "1.2 MB"
      }
    },
    {
      id: "msg-5",
      sender: "John Davis",
      content: "Great. I'll set up the deployment pipeline. Should be ready in about 30 minutes.",
      timestamp: "2025-04-12T16:13:52Z",
      avatar: "/avatars/john.jpg"
    },
    {
      id: "msg-6",
      sender: "ElizaOS Assistant",
      content: "I've analyzed the updated parameters and have identified an additional optimization that could potentially improve performance by another 2-3%. Would you like me to generate a report?",
      timestamp: "2025-04-12T16:15:20Z",
      avatar: "/avatars/eliza.jpg",
      isAI: true
    }
  ];
  
  // Mock activity feed
  const activityFeed = [
    {
      id: "activity-1",
      user: "Jane Smith",
      action: "updated",
      target: "Momentum Strategy parameters",
      timestamp: "2025-04-12T16:05:23Z",
      avatar: "/avatars/jane.jpg"
    },
    {
      id: "activity-2",
      user: "John Davis",
      action: "created",
      target: "new backtesting scenario",
      timestamp: "2025-04-12T15:42:15Z",
      avatar: "/avatars/john.jpg"
    },
    {
      id: "activity-3",
      user: "Sarah Chen",
      action: "started training",
      target: "new agent model",
      timestamp: "2025-04-12T15:15:08Z",
      avatar: "/avatars/sarah.jpg"
    },
    {
      id: "activity-4",
      user: "Alex Wong",
      action: "updated",
      target: "risk management parameters",
      timestamp: "2025-04-12T14:50:32Z",
      avatar: "/avatars/alex.jpg"
    },
    {
      id: "activity-5",
      user: "You",
      action: "commented on",
      target: "Volatility Strategy Development",
      timestamp: "2025-04-12T14:35:47Z",
      avatar: ""
    },
    {
      id: "activity-6",
      user: "ElizaOS Assistant",
      action: "generated",
      target: "market analysis report",
      timestamp: "2025-04-12T14:22:10Z",
      avatar: "/avatars/eliza.jpg",
      isAI: true
    },
    {
      id: "activity-7",
      user: "Mike Johnson",
      action: "integrated",
      target: "new data feeds",
      timestamp: "2025-04-12T13:58:25Z",
      avatar: "/avatars/mike.jpg"
    }
  ];
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format timestamp relative to now
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
  
  // Send chat message
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    // In a real app we would send this to the server
    console.log("Sending message:", newMessage);
    
    // Clear the input
    setNewMessage("");
  };
  
  // Invite user
  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    
    if (onInviteUser) {
      onInviteUser(inviteEmail);
    }
    
    // Clear the input and close the modal
    setInviteEmail("");
    setShowInviteModal(false);
  };
  
  // Get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "online":
        return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
      case "away":
        return <div className="w-2 h-2 rounded-full bg-amber-500"></div>;
      case "offline":
        return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-300"></div>;
    }
  };
  
  // Get session type badge
  const getSessionTypeBadge = (type: string) => {
    switch (type) {
      case "research":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Research</Badge>;
      case "development":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Development</Badge>;
      case "review":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Review</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teamwork Hub</h2>
          <p className="text-muted-foreground">
            Collaborate with team members in real-time
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Team Member
          </Button>
          
          <Button onClick={onCreateSession}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="collaboration" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collaboration">
            <MessageSquare className="h-4 w-4 mr-2" />
            Collaboration
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="h-4 w-4 mr-2" />
            Activity Feed
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="collaboration" className="space-y-6 mt-4">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Active Sessions</CardTitle>
                  <CardDescription>
                    Ongoing and scheduled collaboration sessions
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-6 pb-4 pt-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search sessions..." className="pl-8" />
                    </div>
                  </div>
                  <div className="divide-y">
                    {activeSessions.map((session) => (
                      <div 
                        key={session.id}
                        className={`px-6 py-3 hover:bg-muted/50 cursor-pointer ${
                          session.id === "session-2" ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{session.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created by {session.creator} • {session.participants.length} participants
                            </div>
                          </div>
                          <div>
                            {getSessionTypeBadge(session.type)}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {session.participants.slice(0, 3).map((participant, i) => (
                              <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback>{participant.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                            {session.participants.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                +{session.participants.length - 3}
                              </div>
                            )}
                          </div>
                          
                          {session.status === "active" ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                              Scheduled
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Volatility Strategy Development</CardTitle>
                      <CardDescription>
                        Collaborative session with John Davis, Alex Wong, and You
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Video className="h-4 w-4 mr-2" />
                        Join Call
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Files
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {chatMessages.map((message) => (
                      <div key={message.id} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          {message.avatar ? (
                            <AvatarImage src={message.avatar} />
                          ) : (
                            <AvatarFallback>
                              {message.sender.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">
                              {message.sender}
                              {message.isAI && (
                                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                                  <Zap className="h-3 w-3 mr-1" />
                                  AI
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            {message.content}
                          </div>
                          
                          {message.attachment && (
                            <div className="mt-2 flex items-center p-2 rounded-md bg-muted/50 text-sm">
                              <Paperclip className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{message.attachment.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({message.attachment.size})
                              </span>
                              <Button variant="ghost" size="sm" className="ml-auto h-6 px-2">
                                Download
                              </Button>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-1">
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Like
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>Y</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input 
                          placeholder="Type your message..." 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                        />
                        <Button onClick={sendMessage}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="h-7">
                        <Paperclip className="h-4 w-4 mr-1" />
                        Attach
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7">
                        <PieChart className="h-4 w-4 mr-1" />
                        Share Chart
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 ml-auto">
                        <Zap className="h-4 w-4 mr-1" />
                        Ask ElizaOS
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                People you collaborate with on trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search team members..." className="pl-8" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex items-start p-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          
                          <div className="ml-4 space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{member.name}</div>
                              <div className="flex items-center gap-1">
                                {getStatusIndicator(member.status)}
                                <span className="text-xs capitalize">{member.status}</span>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">{member.role}</div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                        
                        <div className="border-t px-4 py-2 bg-muted/30 flex items-center justify-between">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Recent: </span>
                            {member.recentActivity}
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Message
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                Recent actions by team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between">
                  <Tabs defaultValue="all" className="w-fit">
                    <TabsList>
                      <TabsTrigger value="all">All Activity</TabsTrigger>
                      <TabsTrigger value="mentions">Mentions</TabsTrigger>
                      <TabsTrigger value="actions">My Actions</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <Button variant="outline" size="sm">
                    <Bell className="h-4 w-4 mr-2" />
                    Notification Settings
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {activityFeed.map((activity) => (
                    <div key={activity.id} className="flex gap-3 items-start">
                      <Avatar className="h-8 w-8">
                        {activity.avatar ? (
                          <AvatarImage src={activity.avatar} />
                        ) : (
                          <AvatarFallback>{activity.user.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium">
                            {activity.user}
                            {activity.isAI && (
                              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                                <Zap className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </span>
                          <span className="text-muted-foreground">{activity.action}</span>
                          <span className="font-medium">{activity.target}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            Like
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Comment
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Bookmark className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-md">
            <h3 className="font-medium text-lg mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="invite-email">
                  Email Address
                </label>
                <Input 
                  id="invite-email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="invite-message">
                  Personal Message (Optional)
                </label>
                <Textarea 
                  id="invite-message"
                  placeholder="I'd like to invite you to collaborate on our trading platform..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
