/**
 * Circuit Breaker Status Component
 * Displays the status of all risk-related circuit breakers in the system
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, CheckCircle, XCircle, Zap, 
  Power, Settings, RefreshCw, Clock, ChevronRight,
  XIcon
} from 'lucide-react';
import { enhancedRiskService, RiskParameterRecord } from '@/services/enhanced-risk-service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CircuitBreaker {
  id: string;
  name: string;
  targetType: string;
  targetId: string;
  targetName: string;
  paramType: 'drawdown' | 'volatility' | 'consecutive_losses' | 'trade_limit' | 'custom';
  threshold: number;
  thresholdUnit: string;
  currentValue: number;
  enabled: boolean;
  status: 'ok' | 'warning' | 'triggered';
  lastTriggered?: string;
  description: string;
}

export function CircuitBreakerStatus() {
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreaker[]>([]);
  const [filteredBreakers, setFilteredBreakers] = useState<CircuitBreaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [selectedBreaker, setSelectedBreaker] = useState<CircuitBreaker | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  // Threshold edit state
  const [thresholdValue, setThresholdValue] = useState<string>('');
  
  useEffect(() => {
    loadCircuitBreakers();
  }, []);
  
  useEffect(() => {
    filterCircuitBreakers();
  }, [circuitBreakers, statusFilter, targetFilter, searchQuery]);
  
  const loadCircuitBreakers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call to load circuit breaker status
      // For now, we'll create mock data
      const mockCircuitBreakers: CircuitBreaker[] = [
        {
          id: '1',
          name: 'Daily Loss Limit',
          targetType: 'farm',
          targetId: 'farm-1',
          targetName: 'Alpha Farm',
          paramType: 'drawdown',
          threshold: 5,
          thresholdUnit: '%',
          currentValue: 3.2,
          enabled: true,
          status: 'warning',
          description: 'Triggers when daily loss exceeds threshold'
        },
        {
          id: '2',
          name: 'Weekly Loss Limit',
          targetType: 'farm',
          targetId: 'farm-1',
          targetName: 'Alpha Farm',
          paramType: 'drawdown',
          threshold: 10,
          thresholdUnit: '%',
          currentValue: 4.5,
          enabled: true,
          status: 'ok',
          description: 'Triggers when weekly loss exceeds threshold'
        },
        {
          id: '3',
          name: 'Consecutive Losses',
          targetType: 'strategy',
          targetId: 'strategy-1',
          targetName: 'Momentum Strategy',
          paramType: 'consecutive_losses',
          threshold: 5,
          thresholdUnit: 'trades',
          currentValue: 2,
          enabled: true,
          status: 'ok',
          description: 'Triggers after N consecutive losing trades'
        },
        {
          id: '4',
          name: 'Position Size Limit',
          targetType: 'account',
          targetId: 'account-1',
          targetName: 'Main Trading Account',
          paramType: 'trade_limit',
          threshold: 10000,
          thresholdUnit: 'USD',
          currentValue: 12000,
          enabled: true,
          status: 'triggered',
          lastTriggered: new Date().toISOString(),
          description: 'Triggers when position size exceeds account limit'
        },
        {
          id: '5',
          name: 'Volatility Circuit Breaker',
          targetType: 'strategy',
          targetId: 'strategy-2',
          targetName: 'Mean Reversion',
          paramType: 'volatility',
          threshold: 3.5,
          thresholdUnit: 'σ',
          currentValue: 2.1,
          enabled: true,
          status: 'ok',
          description: 'Triggers when market volatility exceeds threshold'
        },
        {
          id: '6',
          name: 'Daily Trading Limit',
          targetType: 'agent',
          targetId: 'agent-1',
          targetName: 'ElizaOS Trading Agent',
          paramType: 'trade_limit',
          threshold: 20,
          thresholdUnit: 'trades',
          currentValue: 18,
          enabled: true,
          status: 'warning',
          description: 'Triggers when daily trade count exceeds threshold'
        },
        {
          id: '7',
          name: 'Monthly Drawdown Limit',
          targetType: 'goal',
          targetId: 'goal-1',
          targetName: 'Bitcoin Acquisition Goal',
          paramType: 'drawdown',
          threshold: 15,
          thresholdUnit: '%',
          currentValue: 7.2,
          enabled: true,
          status: 'ok',
          description: 'Triggers when monthly drawdown exceeds threshold'
        }
      ];
      
      setCircuitBreakers(mockCircuitBreakers);
      setFilteredBreakers(mockCircuitBreakers);
    } catch (error: any) {
      setError(error.message || 'An error occurred while loading circuit breakers');
    } finally {
      setIsLoading(false);
    }
  };
  
  const filterCircuitBreakers = () => {
    let filtered = [...circuitBreakers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(breaker => 
        breaker.name.toLowerCase().includes(query) ||
        breaker.targetName.toLowerCase().includes(query) ||
        breaker.description.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(breaker => breaker.status === statusFilter);
    }
    
    // Apply target filter
    if (targetFilter !== 'all') {
      filtered = filtered.filter(breaker => breaker.targetType === targetFilter);
    }
    
    setFilteredBreakers(filtered);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'triggered':
        return 'text-destructive';
      case 'warning':
        return 'text-warning';
      case 'ok':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'triggered':
        return (
          <Badge variant="destructive" className="uppercase">
            Triggered
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="default" className="uppercase">
            Warning
          </Badge>
        );
      case 'ok':
        return (
          <Badge variant="outline" className="uppercase">
            Ready
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="uppercase">
            Unknown
          </Badge>
        );
    }
  };
  
  const handleToggleBreaker = (id: string, enabled: boolean) => {
    setCircuitBreakers(prev => 
      prev.map(breaker => 
        breaker.id === id ? { ...breaker, enabled } : breaker
      )
    );
  };
  
  const handleResetBreaker = (id: string) => {
    setCircuitBreakers(prev => 
      prev.map(breaker => 
        breaker.id === id ? { ...breaker, status: 'ok', lastTriggered: undefined } : breaker
      )
    );
    setIsResetDialogOpen(false);
  };
  
  const handleUpdateThreshold = () => {
    if (!selectedBreaker || !thresholdValue) return;
    
    const newThreshold = parseFloat(thresholdValue);
    if (isNaN(newThreshold)) return;
    
    setCircuitBreakers(prev => 
      prev.map(breaker => 
        breaker.id === selectedBreaker.id ? { ...breaker, threshold: newThreshold } : breaker
      )
    );
    
    setIsEditDialogOpen(false);
  };
  
  const openEditDialog = (breaker: CircuitBreaker) => {
    setSelectedBreaker(breaker);
    setThresholdValue(breaker.threshold.toString());
    setIsEditDialogOpen(true);
  };
  
  const openResetDialog = (breaker: CircuitBreaker) => {
    setSelectedBreaker(breaker);
    setIsResetDialogOpen(true);
  };
  
  const getStatusCount = (status: string) => {
    return circuitBreakers.filter(b => b.status === status).length;
  };
  
  const triggeredCount = getStatusCount('triggered');
  const warningCount = getStatusCount('warning');
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Circuit Breakers</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Loading circuit breaker status</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className={triggeredCount > 0 ? 'border-destructive/50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>Circuit Breaker Status</span>
          </CardTitle>
          <CardDescription>
            System-wide circuit breaker status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${triggeredCount > 0 ? 'bg-destructive/10 border-destructive/50' : 'bg-muted'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Triggered</h3>
                <Badge variant={triggeredCount > 0 ? 'destructive' : 'outline'}>
                  {triggeredCount}
                </Badge>
              </div>
              <p className={`text-sm mt-1 ${triggeredCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {triggeredCount > 0 
                  ? `${triggeredCount} circuit breaker${triggeredCount !== 1 ? 's' : ''} triggered` 
                  : 'No circuit breakers triggered'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${warningCount > 0 ? 'bg-warning/10 border-warning/50' : 'bg-muted'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Warning</h3>
                <Badge variant={warningCount > 0 ? 'default' : 'outline'}>
                  {warningCount}
                </Badge>
              </div>
              <p className={`text-sm mt-1 ${warningCount > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {warningCount > 0 
                  ? `${warningCount} approaching threshold` 
                  : 'No warnings active'}
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Total</h3>
                <Badge variant="outline">
                  {circuitBreakers.length}
                </Badge>
              </div>
              <p className="text-sm mt-1 text-muted-foreground">
                {circuitBreakers.filter(b => b.enabled).length} of {circuitBreakers.length} enabled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search circuit breakers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            className="border border-input px-3 py-2 rounded-md bg-background text-sm flex-1 min-w-[120px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="triggered">Triggered</option>
            <option value="warning">Warning</option>
            <option value="ok">Ready</option>
          </select>
          
          <select
            className="border border-input px-3 py-2 rounded-md bg-background text-sm flex-1 min-w-[120px]"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
          >
            <option value="all">All Targets</option>
            <option value="farm">Farms</option>
            <option value="strategy">Strategies</option>
            <option value="account">Accounts</option>
            <option value="agent">Agents</option>
            <option value="goal">Goals</option>
          </select>
        </div>
      </div>
      
      {/* Circuit Breakers */}
      <div className="space-y-4">
        {filteredBreakers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-medium">No Circuit Breakers Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto mt-1">
                {searchQuery || statusFilter !== 'all' || targetFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : 'No circuit breakers have been configured yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {filteredBreakers.map((breaker) => (
              <AccordionItem 
                key={breaker.id} 
                value={breaker.id}
                className={`border rounded-lg overflow-hidden ${
                  breaker.status === 'triggered' ? 'border-destructive/50' :
                  breaker.status === 'warning' ? 'border-warning/50' : ''
                }`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex flex-1 items-center">
                    <div className={`mr-3 h-3 w-3 rounded-full ${
                      breaker.status === 'triggered' ? 'bg-destructive animate-pulse' :
                      breaker.status === 'warning' ? 'bg-warning' : 'bg-primary'
                    }`} />
                    <div className="flex-1 mr-4">
                      <span className="font-medium">{breaker.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {breaker.targetName}
                        </span>
                        {!breaker.enabled && (
                          <Badge variant="outline" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(breaker.status)}
                      <div className="hidden sm:block">
                        <ChevronRight className="h-4 w-4 accordion-chevron" />
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="border-t pt-3 mt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Description:</span>
                        <p className="text-sm">{breaker.description}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <span className={`text-sm font-medium ${getStatusColor(breaker.status)}`}>
                            {breaker.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Threshold:</span>
                          <span className="text-sm font-medium">
                            {breaker.threshold} {breaker.thresholdUnit}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Current Value:</span>
                          <span className={`text-sm font-medium ${
                            breaker.status === 'triggered' ? 'text-destructive' :
                            breaker.status === 'warning' ? 'text-warning' : ''
                          }`}>
                            {breaker.currentValue} {breaker.thresholdUnit}
                          </span>
                        </div>
                        
                        {breaker.lastTriggered && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Last Triggered:</span>
                            <span className="text-sm">
                              {new Date(breaker.lastTriggered).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={breaker.enabled}
                          onCheckedChange={(checked) => handleToggleBreaker(breaker.id, checked)}
                          id={`enable-${breaker.id}`}
                        />
                        <Label htmlFor={`enable-${breaker.id}`}>
                          {breaker.enabled ? 'Enabled' : 'Disabled'}
                        </Label>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(breaker)}
                        >
                          Edit Threshold
                        </Button>
                        
                        {breaker.status === 'triggered' && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => openResetDialog(breaker)}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
      
      {/* Edit Threshold Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Circuit Breaker</DialogTitle>
            <DialogDescription>
              Modify the threshold for this circuit breaker
            </DialogDescription>
          </DialogHeader>
          
          {selectedBreaker && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-medium">{selectedBreaker.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedBreaker.description}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold ({selectedBreaker.thresholdUnit})</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  step="any"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  Current threshold: {selectedBreaker.threshold} {selectedBreaker.thresholdUnit}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateThreshold}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reset Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Circuit Breaker</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset this circuit breaker?
            </DialogDescription>
          </DialogHeader>
          
          {selectedBreaker && (
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Resetting a triggered circuit breaker will allow trading to resume for {selectedBreaker.targetName}.
                  Make sure you have addressed the underlying issue before resetting.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedBreaker && handleResetBreaker(selectedBreaker.id)}
            >
              Reset Circuit Breaker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
