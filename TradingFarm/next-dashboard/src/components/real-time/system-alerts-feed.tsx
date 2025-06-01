"use client";

import { useEffect, useState } from "react";
import { useSocketAlerts, SystemAlert, AlertSeverity } from "@/hooks/use-socket-alerts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  InfoIcon, 
  Bell,
  ExternalLink,
  XCircle,
  MessageSquare,
  Database
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SystemAlertsFeedProps {
  maxItems?: number;
  showEmptyState?: boolean;
  className?: string;
  onAlertClick?: (alert: SystemAlert) => void;
  onKnowledgeAction?: (alert: SystemAlert) => void;
}

export function SystemAlertsFeed({
  maxItems = 10,
  showEmptyState = true,
  className,
  onAlertClick,
  onKnowledgeAction,
}: SystemAlertsFeedProps) {
  const { alerts, unreadCount, isLoading, markAsRead, executeAlertAction } = useSocketAlerts();
  const [filteredAlerts, setFilteredAlerts] = useState<SystemAlert[]>([]);
  const [filter, setFilter] = useState<string>("all");

  // Apply filter to alerts
  useEffect(() => {
    if (alerts.length === 0) {
      setFilteredAlerts([]);
      return;
    }
    
    let result = [...alerts];
    
    if (filter === "unread") {
      result = result.filter(alert => !alert.read);
    } else if (filter === "warnings") {
      result = result.filter(alert => alert.severity === "warning" || alert.severity === "error");
    } else if (filter === "knowledge") {
      // Filter for alerts related to the ElizaOS knowledge system
      result = result.filter(alert => 
        alert.category === "knowledge" || 
        alert.source === "eliza" || 
        alert.source.includes("knowledge")
      );
    }
    
    // Limit the number of alerts
    setFilteredAlerts(result.slice(0, maxItems));
  }, [alerts, filter, maxItems]);

  const formatTime = (timestamp: number) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMs = now.getTime() - alertTime.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSecs < 60) return 'just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return alertTime.toLocaleDateString();
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch(severity) {
      case "error": return <AlertCircle className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "success": return <CheckCircle className="h-4 w-4" />;
      case "info": default: return <InfoIcon className="h-4 w-4" />;
    }
  };
  
  const getSeverityColor = (severity: AlertSeverity) => {
    switch(severity) {
      case "error": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "warning": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "success": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "info": default: return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };
  
  const handleMarkAsRead = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    markAsRead([alertId]);
  };
  
  const handleKnowledgeAction = (e: React.MouseEvent, alert: SystemAlert) => {
    e.stopPropagation();
    onKnowledgeAction?.(alert);
    
    // If this is a knowledge-related alert, attempt to store it in the knowledge base
    if (alert.category === "knowledge" || alert.source === "eliza") {
      executeAlertAction(alert.id, "store_in_knowledge_base");
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Real-time system notifications</CardDescription>
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full">
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            Live
          </Badge>
        </div>
      </CardHeader>
      <div className="px-6 pt-0 pb-2">
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Bell className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
        ) : filteredAlerts.length === 0 && showEmptyState ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="text-muted-foreground">All clear</p>
            <p className="text-sm text-muted-foreground mt-1">
              No {filter !== "all" ? filter + " " : ""}alerts at the moment
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="divide-y">
              {filteredAlerts.map((alert) => {
                // Check if this is a knowledge-related alert
                const isKnowledgeAlert = 
                  alert.category === "knowledge" || 
                  alert.source === "eliza" || 
                  alert.source.includes("knowledge");
                
                return (
                  <div 
                    key={alert.id}
                    onClick={() => onAlertClick?.(alert)}
                    className={cn(
                      "flex items-start gap-3 py-3 px-4",
                      !alert.read && "bg-muted/40",
                      onAlertClick && "cursor-pointer hover:bg-muted/70 transition-colors"
                    )}
                  >
                    <div 
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                        getSeverityColor(alert.severity)
                      )}
                    >
                      {getSeverityIcon(alert.severity)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{alert.title}</span>
                          {!alert.read && (
                            <Badge variant="secondary" className="h-1.5 w-1.5 p-0 rounded-full" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {alert.source}
                          </Badge>
                          {isKnowledgeAlert && (
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                              <Database className="h-2.5 w-2.5 mr-1" />
                              Knowledge
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {isKnowledgeAlert && (
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => handleKnowledgeAction(e, alert)}
                              title="Save to Knowledge Base"
                            >
                              <Database className="h-3.5 w-3.5 text-indigo-500" />
                            </Button>
                          )}
                          
                          {alert.link && (
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              asChild
                            >
                              <a href={alert.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          
                          {!alert.read && (
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => handleMarkAsRead(e, alert.id)}
                              title="Mark as Read"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/50">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full flex gap-1.5 items-center"
          disabled={alerts.length === 0}
          onClick={() => markAsRead(alerts.map(a => a.id))}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Mark All as Read
        </Button>
      </CardFooter>
    </Card>
  );
}
