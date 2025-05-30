'use client';

import React from 'react';
import { positionUpdateSchema, validateForm, getFieldError, ValidationError } from '@/utils/formValidation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  DollarSign, 
  LineChart, 
  Percent 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { logEvent } from '@/utils/logging';
import { usePositionData, Position } from '@/hooks/usePositionData';

interface PositionDetailsModalProps {
  positionId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Position interface is now imported from usePositionData hook

export function PositionDetailsModal({ positionId, isOpen, onClose }: PositionDetailsModalProps) {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [updatingStopLoss, setUpdatingStopLoss] = React.useState(false);
  const [updatingTakeProfit, setUpdatingTakeProfit] = React.useState(false);
  const [closingPosition, setClosingPosition] = React.useState(false);
  const [stopLoss, setStopLoss] = React.useState<string>('');
  const [takeProfit, setTakeProfit] = React.useState<string>('');
  const [formErrors, setFormErrors] = React.useState<ValidationError[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Use our custom hook to fetch and manage position data
  const { 
    position, 
    loading, 
    error: positionError,
    isConnected,
    updateStopLoss,
    updateTakeProfit,
    closePosition
  } = usePositionData(positionId);

  // Initialize form values when position data is loaded
  React.useEffect(() => {
    if (position) {
      setStopLoss(position.stopLoss ? String(position.stopLoss) : '');
      setTakeProfit(position.takeProfit ? String(position.takeProfit) : '');
    }
  }, [position]);

  const handleClosePosition = async () => {
    if (confirm('Are you sure you want to close this position?')) {
      setClosingPosition(true);
      try {
        const success = await closePosition();
        if (success) {
          alert('Position closed successfully');
        }
      } catch (err) {
        console.error('Error closing position:', err);
        alert('Failed to close position');
      } finally {
        setClosingPosition(false);
      }
    }
  };

  const handleUpdatePosition = async () => {
    if (!position) return;
    
    // Validate the form before submission
    const validationResult = validateForm(positionUpdateSchema, {
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined
    });
    
    if (!validationResult.success) {
      setFormErrors(validationResult.errors || []);
      return;
    }
    
    // Clear validation errors
    setFormErrors([]);
    
    setSaving(true);
    
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;
    
    try {
      await updateStopLoss(sl);
      await updateTakeProfit(tp);
      
      logEvent({
        category: 'position',
        action: 'update_position',
        label: position.symbol,
        value: 1
      });
      
      onClose();
    } catch (err) {
      console.error('Error updating position:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };
  
  // Get error message for a field
  const getError = (field: string): string | undefined => {
    return getFieldError(formErrors, field);
  };

  const handleUpdateStopLoss = async () => {
    if (!stopLoss) return;
    
    setUpdatingStopLoss(true);
    try {
      const sl = parseFloat(stopLoss);
      if (!isNaN(sl)) {
        const success = await updateStopLoss(sl);
        if (success) {
          alert('Stop loss updated successfully');
        }
      }
    } catch (err) {
      console.error('Error updating stop loss:', err);
    } finally {
      setUpdatingStopLoss(false);
    }
  };

  const handleUpdateTakeProfit = async () => {
    if (!takeProfit) return;
    
    setUpdatingTakeProfit(true);
    try {
      const tp = parseFloat(takeProfit);
      if (!isNaN(tp)) {
        const success = await updateTakeProfit(tp);
        if (success) {
          alert('Take profit updated successfully');
        }
      }
    } catch (err) {
      console.error('Error updating take profit:', err);
    } finally {
      setUpdatingTakeProfit(false);
    }
  };

  // Custom Dialog component wrapper to fix TypeScript issues with Dialog props
  const DialogWrapper: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }> = ({ open, onOpenChange, children }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => {
    return <Dialog open={open} onOpenChange={onOpenChange}>{children}</Dialog>;
  };

  return (
    <DialogWrapper open={isOpen} onOpenChange={(openState: boolean) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            Position Details
            {position && (
              <Badge 
                className="ml-2" 
                variant={position.status === 'open' ? 'default' : position.status === 'closed' ? 'outline' : 'destructive'}
              >
                {position.status}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {position ? `${position.symbol} ${position.side} position on ${position.exchange}` : 'Loading position details...'}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          </div>
        ) : position ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="risk" className="flex-1">Risk Management</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Trade History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Position Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{position.size} {position.symbol.split('/')[0]}</div>
                    <div className="text-xs text-muted-foreground">
                      ${(position.size * position.entryPrice).toLocaleString()} notional
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Leverage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{position.leverage}x</div>
                    <div className="text-xs text-muted-foreground">
                      ${((position.size * position.entryPrice) / position.leverage).toLocaleString()} collateral
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Entry Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${position.entryPrice.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(position.openTime).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Current Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${position.currentPrice.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      {position.side === 'long' 
                        ? (position.currentPrice > position.entryPrice 
                          ? <><ArrowUpRight className="h-3 w-3 text-green-500" /> Above entry</> 
                          : <><ArrowDownRight className="h-3 w-3 text-red-500" /> Below entry</>)
                        : (position.currentPrice < position.entryPrice 
                          ? <><ArrowDownRight className="h-3 w-3 text-green-500" /> Below entry</> 
                          : <><ArrowUpRight className="h-3 w-3 text-red-500" /> Above entry</>)
                      }
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className={`text-2xl font-bold ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${Math.abs(position.pnl).toLocaleString()}
                        </span>
                        <span className={`ml-2 text-sm ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.pnl >= 0 ? '+' : '-'}{Math.abs(position.pnlPercent).toFixed(2)}%
                        </span>
                      </div>
                      <Button 
                        onClick={handleClosePosition}
                        variant="destructive"
                        size="sm"
                        disabled={closingPosition || position?.status !== 'open'}
                      >
                        {closingPosition ? 'Closing...' : 'Close Position'}
                      </Button>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Entry</span>
                        <span>Current</span>
                      </div>
                      <Progress 
                        value={50 + position.pnlPercent * (position.side === 'long' ? 1 : -1)} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="risk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="stopLoss" className="text-sm font-medium">
                        Stop Loss
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        Current: {position.stop_loss ? `$${position.stop_loss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'None'}
                      </div>
                    </div>
                    <div className="flex">
                      <Input
                        id="stopLoss"
                        type="number"
                        placeholder="Enter stop loss price"
                        step="0.01"
                        min="0"
                        value={stopLoss}
                        onChange={e => setStopLoss(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {getError('stopLoss') && (
                      <p className="text-sm text-red-500">{getError('stopLoss')}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="takeProfit" className="text-sm font-medium">
                        Take Profit
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        Current: {position.take_profit ? `$${position.take_profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'None'}
                      </div>
                    </div>
                    <div className="flex">
                      <Input
                        id="takeProfit"
                        type="number"
                        placeholder="Enter take profit price"
                        step="0.01"
                        min="0"
                        value={takeProfit}
                        onChange={e => setTakeProfit(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    {getError('takeProfit') && (
                      <p className="text-sm text-red-500">{getError('takeProfit')}</p>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Risk Level</span>
                      <Badge 
                        variant={
                          position.riskLevel === 'low' ? 'default' : 
                          position.riskLevel === 'medium' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {position.riskLevel}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Based on position size, leverage, and market volatility
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Strategy</span>
                      <span className="text-sm">{position.strategy}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trade Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="mr-4 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ArrowUpRight className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Position opened</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(position.openTime).toLocaleString()}
                        </div>
                        <div className="text-sm mt-1">
                          Opened {position.side} position at ${position.entryPrice.toLocaleString()} with {position.leverage}x leverage
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="mr-4 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">Fees paid</div>
                        <div className="text-sm text-muted-foreground">
                          ${position.fees.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {position.status !== 'open' && (
                      <div className="flex items-start">
                        <div className="mr-4 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {position.pnl >= 0 
                            ? <ArrowUpRight className="h-5 w-5 text-green-500" />
                            : <ArrowDownRight className="h-5 w-5 text-red-500" />
                          }
                        </div>
                        <div>
                          <div className="font-medium">Position closed</div>
                          <div className="text-sm text-muted-foreground">
                            {position.closeTime ? new Date(position.closeTime).toLocaleString() : ''}
                          </div>
                          <div className="text-sm mt-1">
                            {position.status === 'closed'
                              ? `Closed with ${position.pnl >= 0 ? 'profit' : 'loss'} of $${Math.abs(position.pnl).toFixed(2)}`
                              : 'Position was liquidated'
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-destructive font-medium mb-2">Error loading position data</p>
            <p className="text-muted-foreground text-sm">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Failed to load position details</p>
          </div>
        )}
      </DialogContent>
    </DialogWrapper>
  );
}
