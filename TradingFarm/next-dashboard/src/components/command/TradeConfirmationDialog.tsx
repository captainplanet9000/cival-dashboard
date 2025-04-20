"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XIcon, AlertTriangleIcon, ArrowRightIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { ConfirmationData } from '@/services/tools-service';

interface TradeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmationData: ConfirmationData | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TradeConfirmationDialog({
  open,
  onOpenChange,
  confirmationData,
  onConfirm,
  onCancel,
}: TradeConfirmationDialogProps) {
  if (!confirmationData) {
    return null;
  }

  const { action, details } = confirmationData;

  // Format order details for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Helper to get position direction icon and color
  const getDirectionBadge = (direction: string) => {
    if (direction.toLowerCase() === 'long') {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <TrendingUpIcon className="h-3 w-3 mr-1" />
          Long
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <TrendingDownIcon className="h-3 w-3 mr-1" />
          Short
        </Badge>
      );
    }
  };

  // Get title and description based on action
  const getDialogContent = () => {
    switch (action) {
      case 'open_position':
        return {
          title: 'Confirm Position',
          description: 'Please review and confirm the following position details',
        };
      case 'close_position':
        return {
          title: 'Confirm Close Position',
          description: 'Please confirm you want to close this position',
        };
      case 'set_stop_loss':
        return {
          title: 'Confirm Stop Loss',
          description: 'Please confirm the stop loss settings',
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Please review and confirm this action',
        };
    }
  };

  const { title, description } = getDialogContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Different confirmation content based on action */}
          {action === 'open_position' && (
            <>
              <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                <div className="font-medium">Symbol</div>
                <div className="font-bold">{details.symbol}</div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                <div className="font-medium">Direction</div>
                <div>{getDirectionBadge(details.direction || '')}</div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                <div className="font-medium">Size</div>
                <div className="font-bold">{details.size}</div>
              </div>
              
              {details.leverage && details.leverage !== 1 && (
                <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium">Leverage</div>
                  <Badge variant="outline">{details.leverage}×</Badge>
                </div>
              )}
              
              {details.stop_loss && (
                <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium">Stop Loss</div>
                  <div className="text-red-500">${details.stop_loss}</div>
                </div>
              )}
              
              {details.take_profit && (
                <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium">Take Profit</div>
                  <div className="text-green-500">${details.take_profit}</div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground mt-2">
                <AlertTriangleIcon className="h-4 w-4 inline-block mr-1" />
                Trading involves risk. Confirm only if you understand the potential losses.
              </div>
            </>
          )}
          
          {action === 'close_position' && (
            <>
              {details.position_id && (
                <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium">Position ID</div>
                  <div className="font-mono text-xs">{details.position_id}</div>
                </div>
              )}
              
              {details.symbol && (
                <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium">Symbol</div>
                  <div className="font-bold">{details.symbol}</div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground mt-2">
                <AlertTriangleIcon className="h-4 w-4 inline-block mr-1" />
                This action will close the position at current market price.
              </div>
            </>
          )}
          
          {action === 'set_stop_loss' && (
            <>
              {details.position_id && (
                <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium">Position ID</div>
                  <div className="font-mono text-xs">{details.position_id}</div>
                </div>
              )}
              
              {details.symbol && (
                <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium">Symbol</div>
                  <div className="font-bold">{details.symbol}</div>
                </div>
              )}
              
              <div className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                <div className="font-medium">Stop Loss Price</div>
                <div className="text-red-500">${details.price}</div>
              </div>
              
              <div className="text-sm text-muted-foreground mt-2">
                <AlertTriangleIcon className="h-4 w-4 inline-block mr-1" />
                The position will be closed if the price reaches this level.
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onCancel}>
            <XIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <CheckIcon className="h-4 w-4 mr-2" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
