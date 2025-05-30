'use client';

/**
 * Wallet Card Component
 * Displays a single wallet with key information and actions
 */
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  MoreHorizontal,
  RefreshCcw,
  Wallet
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

export interface WalletCardProps {
  wallet: {
    id: string;
    name: string;
    address: string;
    exchange?: string;
    network?: string;
    balance: number;
    currency: string;
    lastUpdated: string;
    changePercent24h?: number;
    status: 'active' | 'inactive' | 'warning' | 'error';
    alerts?: {
      type: 'low_balance' | 'suspicious_activity' | 'large_withdrawal' | 'large_deposit' | 'other';
      message: string;
      timestamp: string;
    }[];
  };
  onViewDetails: (walletId: string) => void;
  onRefreshBalance: (walletId: string) => void;
}

export function WalletCard({ wallet, onViewDetails, onRefreshBalance }: WalletCardProps) {
  const { toast } = useToast();

  // Copy wallet address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    toast({
      description: "Wallet address copied to clipboard.",
    });
  };

  // Format currency with appropriate symbol
  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'BTC' || currency === 'ETH' ? 8 : 2,
      maximumFractionDigits: currency === 'BTC' || currency === 'ETH' ? 8 : 2,
    });
    
    // Handle special cases for crypto
    if (currency === 'BTC') {
      return `₿${amount.toFixed(8)}`;
    } else if (currency === 'ETH') {
      return `Ξ${amount.toFixed(6)}`;
    }
    
    return formatter.format(amount);
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Get icon for status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case 'inactive':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'warning':
      case 'error':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{wallet.name}</CardTitle>
            <div className="flex items-center mt-1 text-sm text-muted-foreground">
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{wallet.address}</span>
              <button onClick={copyAddress} className="ml-1 text-primary hover:text-primary/80">
                <Copy className="h-3.5 w-3.5" />
              </button>
              {wallet.exchange && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {wallet.exchange}
                </Badge>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(wallet.status)}>
            {getStatusIcon(wallet.status)}
            <span className="capitalize">{wallet.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <div className="text-2xl font-bold">
              {formatCurrency(wallet.balance, wallet.currency)}
            </div>
            {wallet.changePercent24h !== undefined && (
              <div className={`flex items-center text-sm font-medium ${
                wallet.changePercent24h > 0 ? 'text-green-600' : 
                wallet.changePercent24h < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {wallet.changePercent24h > 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : wallet.changePercent24h < 0 ? (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                ) : null}
                {Math.abs(wallet.changePercent24h).toFixed(2)}%
              </div>
            )}
          </div>
          
          {wallet.network && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Network</span>
              <span>{wallet.network}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>{formatDistanceToNow(new Date(wallet.lastUpdated), { addSuffix: true })}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{new Date(wallet.lastUpdated).toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Alerts section */}
          {wallet.alerts && wallet.alerts.length > 0 && (
            <div className="pt-2">
              <div className="text-sm font-medium mb-2">Alerts</div>
              <div className="space-y-1">
                {wallet.alerts.slice(0, 2).map((alert, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs bg-yellow-50 p-2 rounded-md">
                    <AlertCircle className="h-3.5 w-3.5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-yellow-800">{alert.message}</p>
                      <p className="text-yellow-600 mt-0.5">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                {wallet.alerts.length > 2 && (
                  <div className="text-xs text-center text-muted-foreground">
                    +{wallet.alerts.length - 2} more alerts
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onRefreshBalance(wallet.id)}
        >
          <RefreshCcw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewDetails(wallet.id)}
          >
            Details
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyAddress}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Address
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewDetails(wallet.id)}>
                <Wallet className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {wallet.exchange && (
                <DropdownMenuItem onClick={() => window.open(`https://${wallet.exchange.toLowerCase()}.com`, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on {wallet.exchange}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}
