/**
 * Risk Events List Component
 * Displays a list of risk events with filtering and acknowledgment capabilities
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, CheckCircle, XCircle, Search, 
  Filter, Layers, ChevronRight, AlertTriangle,
  Shield, Bot, ChartLine
} from 'lucide-react';
import { RiskEventRecord } from '@/services/enhanced-risk-service';

interface RiskEventsListProps {
  events: RiskEventRecord[];
  isLoading?: boolean;
  onAcknowledge?: (eventId: string) => void;
  onResolve?: (eventId: string, resolution: string) => void;
  showAcknowledged?: boolean;
  maxHeight?: string;
}

export function RiskEventsList({ 
  events, 
  isLoading = false, 
  onAcknowledge, 
  onResolve,
  showAcknowledged = true,
  maxHeight = '500px'
}: RiskEventsListProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  
  // Resolution dialog states
  const [selectedEvent, setSelectedEvent] = useState<RiskEventRecord | null>(null);
  const [isResolutionDialogOpen, setIsResolutionDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [preventFuture, setPreventFuture] = useState(false);
  
  // Apply filters to events
  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchQuery && !event.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Severity filter
    if (severityFilter !== 'all' && event.severity !== severityFilter) {
      return false;
    }
    
    // Event type filter
    if (typeFilter !== 'all' && event.event_type !== typeFilter) {
      return false;
    }
    
    // Target type filter
    if (targetFilter !== 'all' && event.target_type !== targetFilter) {
      return false;
    }
    
    // Filter acknowledged events if needed
    if (!showAcknowledged && event.acknowledged) {
      return false;
    }
    
    return true;
  });
  
  // Handle event acknowledgment
  const handleAcknowledge = (eventId: string) => {
    if (onAcknowledge) {
      onAcknowledge(eventId);
    }
  };
  
  // Handle event resolution
  const handleResolve = () => {
    if (selectedEvent && onResolve) {
      onResolve(selectedEvent.id, resolution);
      setIsResolutionDialogOpen(false);
      setResolution('');
      setPreventFuture(false);
      setSelectedEvent(null);
    }
  };
  
  const openResolutionDialog = (event: RiskEventRecord) => {
    setSelectedEvent(event);
    setIsResolutionDialogOpen(true);
  };
  
  // Extract unique event types and target types for filters
  const eventTypes = Array.from(new Set(events.map(e => e.event_type)));
  const targetTypes = Array.from(new Set(events.map(e => e.target_type)));
  
  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const formatTargetType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'info':
        return <AlertCircle className="h-4 w-4 text-primary" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'farm':
        return <Layers className="h-4 w-4" />;
      case 'strategy':
        return <ChartLine className="h-4 w-4" />;
      case 'agent':
        return <Bot className="h-4 w-4" />;
      case 'goal':
        return <Shield className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };
  
  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  // Loading skeletons
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 w-full sm:w-[200px]" />
            <Skeleton className="h-10 w-full sm:w-[120px]" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 border-b pb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-[80%]" />
                <Skeleton className="h-4 w-[60%]" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Events</CardTitle>
        <CardDescription>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} {!showAcknowledged ? 'requiring attention' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <Select
                value={severityFilter}
                onValueChange={setSeverityFilter}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <div className="flex items-center gap-2">
                    <span>Severity</span>
                    {severityFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-auto mr-2">1</Badge>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              
              {eventTypes.length > 1 && (
                <Select
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <div className="flex items-center gap-2">
                      <span>Event Type</span>
                      {typeFilter !== 'all' && (
                        <Badge variant="secondary" className="ml-auto mr-2">1</Badge>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {formatEventType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {targetTypes.length > 1 && (
                <Select
                  value={targetFilter}
                  onValueChange={setTargetFilter}
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <div className="flex items-center gap-2">
                      <span>Target</span>
                      {targetFilter !== 'all' && (
                        <Badge variant="secondary" className="ml-auto mr-2">1</Badge>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Targets</SelectItem>
                    {targetTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {formatTargetType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          {/* Events List */}
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-lg font-medium">No events found</h3>
              <p className="text-muted-foreground max-w-xs mt-1">
                {searchQuery || severityFilter !== 'all' || typeFilter !== 'all' || targetFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : showAcknowledged
                    ? 'No risk events have been recorded'
                    : 'All risk events have been acknowledged'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full" style={{ maxHeight }}>
              <div className="space-y-4 pr-4">
                {filteredEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className={`border rounded-lg p-4 ${
                      event.acknowledged ? 'bg-muted/50' : ''
                    } ${
                      event.severity === 'critical' && !event.acknowledged ? 'border-destructive/50' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          event.severity === 'critical' ? 'bg-destructive/10' :
                          event.severity === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
                        }`}>
                          {getSeverityIcon(event.severity)}
                        </div>
                        
                        <div>
                          <h3 className="font-medium">{event.description}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant={getSeverityBadgeVariant(event.severity)}>
                              {event.severity.toUpperCase()}
                            </Badge>
                            
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getTargetIcon(event.target_type)}
                              <span>{formatTargetType(event.target_type)}</span>
                            </Badge>
                            
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 mt-2 sm:mt-0">
                        {event.acknowledged ? (
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <CheckCircle className="h-3 w-3" />
                            <span>Acknowledged</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8"
                              onClick={() => handleAcknowledge(event.id)}
                            >
                              Acknowledge
                            </Button>
                            
                            {onResolve && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="h-8"
                                onClick={() => openResolutionDialog(event)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Event Details */}
                    <div className="mt-4 pt-3 border-t text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <span className="text-muted-foreground">Event Type:</span>{' '}
                          <span className="font-medium">{formatEventType(event.event_type)}</span>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Target ID:</span>{' '}
                          <span className="font-mono text-xs">{event.target_id}</span>
                        </div>
                        
                        {event.parameter_id && (
                          <div>
                            <span className="text-muted-foreground">Parameter ID:</span>{' '}
                            <span className="font-mono text-xs">{event.parameter_id}</span>
                          </div>
                        )}
                        
                        {event.details && Object.keys(event.details).length > 0 && (
                          <div className="col-span-full mt-2">
                            <span className="text-muted-foreground block mb-1">Details:</span>
                            <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto">
                              {JSON.stringify(event.details, null, 2)}
                            </div>
                          </div>
                        )}
                        
                        {event.resolution && (
                          <div className="col-span-full mt-2">
                            <span className="text-muted-foreground">Resolution:</span>{' '}
                            <span>{event.resolution}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
      
      {/* Resolution Dialog */}
      {onResolve && (
        <Dialog open={isResolutionDialogOpen} onOpenChange={setIsResolutionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Risk Event</DialogTitle>
              <DialogDescription>
                Provide resolution details for this risk event
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Input
                  id="resolution"
                  placeholder="Describe how you resolved this issue"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="preventFuture" 
                  checked={preventFuture}
                  onCheckedChange={(checked) => setPreventFuture(checked as boolean)}
                />
                <Label htmlFor="preventFuture">
                  Apply fix to prevent similar events in the future
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResolutionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResolve} disabled={!resolution.trim()}>
                Resolve Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
