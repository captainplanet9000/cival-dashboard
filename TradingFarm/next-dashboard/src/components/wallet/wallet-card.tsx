'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertCircle, 
  ChevronDown, 
  Copy, 
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Settings
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface WalletCardProps {
  id: string;
  name: string;
  address: string;
  network: string;
  balance: number;
  currency: string;
  status?: 'active' | 'inactive' | 'pending';
  lastUpdated?: string;
  onViewTransactions?: (id: string) => void;
  onDeposit?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onSettings?: (id: string) => void;
}

export default function WalletCard({
  id,
  name,
  address,
  network,
  balance,
  currency,
  status = 'active',
  lastUpdated,
  onViewTransactions,
  onDeposit,
  onWithdraw,
  onRefresh,
  onSettings
}: WalletCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRefresh = async () => {
    if (isLoading || !onRefresh) return;
    
    setIsLoading(true);
    try {
      await onRefresh(id);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
      default:
        return 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
    }
  };

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge 
            variant="outline" 
            className={`${getStatusColor(status)} capitalize`}
          >
            {status}
          </Badge>
        </div>
        <CardDescription className="flex items-center text-xs">
          <span className="font-mono">{address.substring(0, 10)}...{address.substring(address.length - 8)}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-1" 
                  onClick={copyAddress}
                >
                  {copied ? <Badge variant="outline" className="px-1">Copied!</Badge> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy wallet address</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Network</span>
            <span className="text-sm font-medium">{network}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance</span>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <span className="text-xl font-bold">{balance} {currency}</span>
            )}
          </div>
          {lastUpdated && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Last updated</span>
              <span className="text-xs">
                {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 pb-4 px-6">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onDeposit && onDeposit(id)}
          >
            <ArrowDownLeft className="h-4 w-4 mr-1" />
            Deposit
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onWithdraw && onWithdraw(id)}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Withdraw
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="ghost"
            className="px-2"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            className="px-2"
            onClick={() => onSettings && onSettings(id)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
